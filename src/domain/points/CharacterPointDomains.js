import { validateCharacter } from "../character/Character.js";
import {
  createPointDiscrepancy,
} from "./PointDiscrepancy.js";
import {
  createPointDomainReport,
} from "./PointDomainReport.js";
import { createPointFingerprint } from "./PointFingerprint.js";
import { evaluateTraitPointDomain } from "./TraitPointDomain.js";

const ATTRIBUTE_KEYS = ["ST", "DX", "IQ", "HT"];
const SECONDARY_KEYS = ["HP", "FP", "Will", "Per", "BasicSpeed", "BasicMove"];

export function evaluateCharacterPointDomains(character) {
  validateCharacter(character);
  const trait = evaluateTraitPointDomain(character);
  const template = evaluateTemplatePointDomain(character);
  const reports = [
    createAttributeReport(character),
    createSecondaryReport(character),
    trait.report,
    createCollectionReport(character, {
      domain: "skill",
      category: "skills",
      collection: character.skills,
    }),
    createCollectionReport(character, {
      domain: "technique",
      category: "techniques",
      collection: character.techniques,
    }),
    createCollectionReport(character, {
      domain: "magic",
      category: "magic",
      collection: character.spells,
    }),
    createCollectionReport(character, {
      domain: "language",
      category: "languages",
      collection: character.languages,
    }),
    createCollectionReport(character, {
      domain: "culture",
      category: "cultural-familiarities",
      collection: character.familiarities,
    }),
    createPowerReport(character),
    template.report,
    createExcludedReport(character, {
      domain: "equipment",
      categories: ["equipment"],
      code: "equipment-does-not-use-character-points",
    }),
  ];

  return deepFreeze({
    reports,
    discrepancies: [
      ...trait.discrepancies,
      ...template.discrepancies,
    ],
  });
}

function createAttributeReport(character) {
  const contributions = ATTRIBUTE_KEYS.map(key => pendingContribution(character, {
    domain: "attribute",
    category: "attributes",
    sourceId: key,
    sourceType: "attribute-point-authority-pending",
    provenance: {
      key,
      base: character.attributes[key].base,
      override: character.attributes[key].override,
    },
  }));
  return createPointDomainReport({
    characterId: character.identity.id,
    domain: "attribute",
    categories: ["attributes"],
    status: "pending",
    contributions,
    sourceFingerprint: createPointFingerprint(character.attributes),
    diagnostics: [{
      code: "attribute-point-authority-unavailable",
      severity: "pending",
    }],
  });
}

function createSecondaryReport(character) {
  const contributions = SECONDARY_KEYS.map(key => pendingContribution(character, {
    domain: "secondary-characteristic",
    category: "secondary-characteristics",
    sourceId: key,
    sourceType: "secondary-point-authority-pending",
    provenance: {
      key,
      base: character.secondaryCharacteristics[key].base,
      override: character.secondaryCharacteristics[key].override,
    },
  }));
  return createPointDomainReport({
    characterId: character.identity.id,
    domain: "secondary-characteristic",
    categories: ["secondary-characteristics"],
    status: "pending",
    contributions,
    sourceFingerprint: createPointFingerprint(character.secondaryCharacteristics),
    diagnostics: [{
      code: "secondary-point-authority-unavailable",
      severity: "pending",
    }],
  });
}

function createCollectionReport(character, input) {
  const collection = input.collection;
  if (collection.length === 0) {
    return createPointDomainReport({
      characterId: character.identity.id,
      domain: input.domain,
      categories: [input.category],
      contributions: [],
      sourceFingerprint: createPointFingerprint([]),
    });
  }
  const missingIds = collection.some(item => (
    typeof item?.id !== "string" || item.id === ""
  ));
  if (missingIds) {
    return createPointDomainReport({
      characterId: character.identity.id,
      domain: input.domain,
      categories: [input.category],
      status: "pending",
      contributions: [],
      sourceFingerprint: createPointFingerprint(collection),
      diagnostics: [{
        code: `${input.domain}-point-identity-unavailable`,
        severity: "pending",
      }],
    });
  }
  const contributions = collection.map(item => pendingContribution(character, {
    domain: input.domain,
    category: input.category,
    sourceId: item.id,
    sourceType: `${input.domain}-point-authority-pending`,
    declaredPoints: Number.isFinite(item.points) ? item.points : null,
    importedPoints: Number.isFinite(item.importedCost) ? item.importedCost : null,
    provenance: projectCollectionItem(item),
  }));
  return createPointDomainReport({
    characterId: character.identity.id,
    domain: input.domain,
    categories: [input.category],
    contributions,
    sourceFingerprint: createPointFingerprint(collection),
    diagnostics: [{
      code: `${input.domain}-point-authority-unavailable`,
      severity: "pending",
    }],
  });
}

function createPowerReport(character) {
  if (character.powers.length === 0) {
    return createPointDomainReport({
      characterId: character.identity.id,
      domain: "power",
      categories: ["powers"],
      contributions: [],
      sourceFingerprint: createPointFingerprint([]),
    });
  }
  return createPointDomainReport({
    characterId: character.identity.id,
    domain: "power",
    categories: ["powers"],
    status: "pending",
    contributions: [],
    sourceFingerprint: createPointFingerprint(character.powers),
    diagnostics: [{
      code: "power-point-authority-unavailable",
      severity: "pending",
    }],
  });
}

function evaluateTemplatePointDomain(character) {
  const report = createExcludedReport(character, {
    domain: "template",
    categories: ["templates"],
    code: "template-direct-cost-excluded-to-prevent-double-counting",
  });
  const discrepancies = [
    ...character.templates
      .filter(template => template.importedPoints !== null || template.calculatedPoints !== null)
      .map(template => createPointDiscrepancy({
        id: `template:${template.id}:catalog-reconciliation`,
        characterId: character.identity.id,
        domain: "template",
        sourceId: template.id,
        kind: "catalog-imported-vs-calculated",
        importedPoints: template.importedPoints,
        calculatedPoints: template.calculatedPoints,
        provenance: {
          scope: "catalog",
          countedInSpentTotal: false,
        },
      })),
    ...character.templateApplications
      .filter(application => application.status === "active" && application.importedPoints !== null)
      .map(application => createPointDiscrepancy({
        id: `template-application:${application.id}:imported-points`,
        characterId: character.identity.id,
        domain: "template",
        sourceId: application.id,
        kind: "application-imported-points",
        status: "informational",
        importedPoints: application.importedPoints,
        calculatedPoints: null,
        provenance: {
          rootTemplateId: application.rootTemplateId,
          resolvedTemplateIds: application.resolvedTemplateIds,
          compositionFingerprint: application.compositionFingerprint,
          countedInSpentTotal: false,
        },
      })),
  ];
  return { report, discrepancies };
}

function createExcludedReport(character, input) {
  return createPointDomainReport({
    characterId: character.identity.id,
    domain: input.domain,
    categories: input.categories,
    status: "excluded",
    required: false,
    contributions: [],
    sourceFingerprint: createPointFingerprint({
      domain: input.domain,
      excluded: true,
    }),
    diagnostics: [{
      code: input.code,
      severity: "info",
    }],
  });
}

function pendingContribution(character, input) {
  return {
    id: `${input.domain}:${input.sourceId}`,
    characterId: character.identity.id,
    domain: input.domain,
    category: input.category,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    status: "pending",
    points: null,
    authorityFingerprint: null,
    declaredPoints: input.declaredPoints ?? null,
    importedPoints: input.importedPoints ?? null,
    reconciliation: null,
    provenance: input.provenance ?? {},
    diagnostics: [{
      code: `${input.domain}-point-authority-missing`,
      severity: "pending",
      sourceId: input.sourceId,
    }],
  };
}

function projectCollectionItem(item) {
  return {
    id: item.id,
    points: Number.isFinite(item.points) ? item.points : null,
    importedCost: Number.isFinite(item.importedCost) ? item.importedCost : null,
    importMeta: item.importMeta ?? null,
  };
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
