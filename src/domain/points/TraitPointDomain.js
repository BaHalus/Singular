import { validateCharacter } from "../character/Character.js";
import {
  createPointDiscrepancy,
} from "./PointDiscrepancy.js";
import {
  createPointDomainReport,
} from "./PointDomainReport.js";
import { createPointFingerprint } from "./PointFingerprint.js";

const TRAIT_CATEGORIES = [
  "advantages",
  "perks",
  "disadvantages",
  "quirks",
  "other-traits",
];

export function evaluateTraitPointDomain(character) {
  validateCharacter(character);
  const contributions = character.traits.map(trait => {
    const authority = trait.pointValue.finalCostAuthority ?? null;
    const ready = authority !== null;
    return {
      id: `trait:${trait.id}`,
      characterId: character.identity.id,
      domain: "trait",
      category: categoryForRole(trait.role),
      sourceId: trait.id,
      sourceType: "trait-final-cost-authority",
      status: ready ? "ready" : "pending",
      points: ready ? trait.pointValue.calculatedPoints : null,
      authorityFingerprint: ready
        ? createAuthorityFingerprint(authority, trait.id)
        : null,
      declaredPoints: trait.pointValue.declaredPoints,
      importedPoints: trait.pointValue.importedPoints,
      reconciliation: trait.pointValue.reconciliation,
      provenance: ready
        ? {
            operationId: authority.operationId,
            appliedAt: authority.appliedAt,
            sourceFingerprint: authority.sourceFingerprint,
            analysisFingerprint: authority.analysisFingerprint,
            planFingerprint: authority.planFingerprint,
            groupId: authority.groupId,
            groupRole: authority.groupRole,
            individualPoints: authority.individualPoints,
            contributionPoints: authority.contributionPoints,
          }
        : {
            source: trait.source,
            alternateGroupId: trait.alternateGroupId,
          },
      diagnostics: ready
        ? []
        : [{
            code: "trait-final-cost-authority-missing",
            severity: "pending",
            traitId: trait.id,
          }],
    };
  });

  const sourceFingerprint = createPointFingerprint(
    character.traits.map(trait => ({
      id: trait.id,
      role: trait.role,
      calculatedPoints: trait.pointValue.calculatedPoints,
      authority: projectAuthority(trait.pointValue.finalCostAuthority ?? null),
    })),
  );
  const report = createPointDomainReport({
    characterId: character.identity.id,
    domain: "trait",
    categories: TRAIT_CATEGORIES,
    contributions,
    sourceFingerprint,
    diagnostics: contributions
      .flatMap(item => item.diagnostics),
  });
  const discrepancies = character.traits
    .filter(trait => trait.pointValue.importedPoints !== null)
    .map(trait => createPointDiscrepancy({
      id: `trait:${trait.id}:imported-vs-calculated`,
      characterId: character.identity.id,
      domain: "trait",
      sourceId: trait.id,
      kind: "imported-vs-calculated",
      importedPoints: trait.pointValue.importedPoints,
      calculatedPoints: trait.pointValue.finalCostAuthority === undefined
        ? null
        : trait.pointValue.calculatedPoints,
      provenance: {
        reconciliation: trait.pointValue.reconciliation,
        alternateGroupId: trait.alternateGroupId,
        groupRole: trait.pointValue.finalCostAuthority?.groupRole ?? null,
      },
    }));

  return deepFreeze({ report, discrepancies });
}

function categoryForRole(role) {
  if (role === "advantage") return "advantages";
  if (role === "perk") return "perks";
  if (role === "disadvantage") return "disadvantages";
  if (role === "quirk") return "quirks";
  return "other-traits";
}

function createAuthorityFingerprint(authority, traitId) {
  return createPointFingerprint({
    traitId,
    operationId: authority.operationId,
    sourceFingerprint: authority.sourceFingerprint,
    analysisFingerprint: authority.analysisFingerprint,
    planFingerprint: authority.planFingerprint,
    contributionPoints: authority.contributionPoints,
  });
}

function projectAuthority(authority) {
  if (authority === null) return null;
  return {
    operationId: authority.operationId,
    sourceFingerprint: authority.sourceFingerprint,
    analysisFingerprint: authority.analysisFingerprint,
    planFingerprint: authority.planFingerprint,
    contributionPoints: authority.contributionPoints,
  };
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
