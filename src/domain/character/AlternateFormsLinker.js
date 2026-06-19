import { createCharacter } from "./Character.js";

const DEFAULT_GROUP_KEY = "body";
const DEFAULT_GROUP_NAME = "Formas corporais";
const DEFAULT_BASE_FORM_NAME = "Forma-base";

export function analyzeAlternateFormLinks(character, options = {}) {
  validateCharacterShape(character);

  const candidates = character.advantages.filter(isAlternateFormTrait);
  const report = {
    candidates: [],
    resolved: [],
    ambiguous: [],
    unresolved: [],
    alreadyLinked: [],
  };

  for (const trait of candidates) {
    const candidate = createCandidateRecord(trait);
    report.candidates.push(candidate);

    const explicitTemplateId = readExplicitTemplateId(trait);
    const targetName = readTargetName(trait);
    const group = readGroupDefinition(trait, options);
    const existingLinks = findExistingFormsByTrait(character, trait.id);

    if (existingLinks.length > 1) {
      report.ambiguous.push({
        ...candidate,
        reason: "multiple-existing-links",
        existingFormIds: existingLinks.map(item => item.form.id),
      });
      continue;
    }

    if (explicitTemplateId !== null) {
      const template = character.templates.find(item => item.id === explicitTemplateId);

      if (!template) {
        report.unresolved.push({
          ...candidate,
          targetName,
          explicitTemplateId,
          groupKey: group.key,
          groupName: group.name,
          reason: "explicit-template-not-found",
        });
        continue;
      }

      const resolution = createResolution(
        trait,
        template,
        targetName ?? template.name,
        "explicit-template-id",
        group,
      );

      classifyExistingLink(report, candidate, resolution, existingLinks);
      continue;
    }

    if (targetName === null) {
      report.unresolved.push({
        ...candidate,
        groupKey: group.key,
        groupName: group.name,
        reason: "missing-target-name",
      });
      continue;
    }

    const matches = findTemplatesByTargetName(character.templates, targetName);

    if (matches.length === 0) {
      report.unresolved.push({
        ...candidate,
        targetName,
        groupKey: group.key,
        groupName: group.name,
        reason: "template-name-not-found",
      });
      continue;
    }

    if (matches.length > 1) {
      report.ambiguous.push({
        ...candidate,
        targetName,
        groupKey: group.key,
        groupName: group.name,
        reason: "ambiguous-template-name",
        candidateTemplateIds: matches.map(item => item.id),
      });
      continue;
    }

    const resolution = createResolution(
      trait,
      matches[0],
      targetName,
      matches[0].name === targetName
        ? "exact-template-name"
        : "canonical-template-name",
      group,
    );

    classifyExistingLink(report, candidate, resolution, existingLinks);
  }

  return report;
}

export function linkAlternateForms(character, options = {}) {
  const analysis = analyzeAlternateFormLinks(character, options);
  const nextSets = character.alternateFormSets.map(cloneFormSet);
  const createdSetIds = [];
  const updatedSetIds = [];

  for (const resolution of analysis.resolved) {
    const existingSet = findLinkedSetByGroupKey(nextSets, resolution.groupKey);

    if (existingSet) {
      if (!existingSet.forms.some(form => form.sourceTraitId === resolution.traitId)) {
        existingSet.forms.push(createLinkedForm(resolution));
        existingSet.sourceTraitId = existingSet.sourceTraitId ?? resolution.traitId;

        if (!updatedSetIds.includes(existingSet.id)) {
          updatedSetIds.push(existingSet.id);
        }
      }

      continue;
    }

    const set = createLinkedFormSet(character, resolution, options);
    nextSets.push(set);
    createdSetIds.push(set.id);
  }

  const linkedCharacter = createdSetIds.length === 0 && updatedSetIds.length === 0
    ? character
    : createCharacter({
      ...character,
      alternateFormSets: nextSets,
    });

  return {
    character: linkedCharacter,
    report: {
      ...analysis,
      createdSetIds,
      updatedSetIds,
    },
  };
}

function classifyExistingLink(report, candidate, resolution, existingLinks) {
  if (existingLinks.length === 0) {
    report.resolved.push(resolution);
    return;
  }

  const existing = existingLinks[0];

  if (existing.form.templateId === resolution.templateId) {
    report.alreadyLinked.push({
      ...candidate,
      templateId: resolution.templateId,
      formSetId: existing.set.id,
      formId: existing.form.id,
      matchMethod: resolution.matchMethod,
    });
    return;
  }

  report.ambiguous.push({
    ...candidate,
    reason: "existing-link-conflict",
    existingTemplateId: existing.form.templateId,
    resolvedTemplateId: resolution.templateId,
    existingFormSetId: existing.set.id,
    existingFormId: existing.form.id,
  });
}

function createResolution(trait, template, targetName, matchMethod, group) {
  return {
    traitId: trait.id,
    traitName: trait.name,
    targetName,
    templateId: template.id,
    templateName: template.name,
    matchMethod,
    groupKey: group.key,
    groupName: group.name,
    explicitGroup: group.explicit,
  };
}

function createCandidateRecord(trait) {
  return {
    traitId: trait.id,
    traitName: trait.name,
  };
}

function createLinkedFormSet(character, resolution, options) {
  const setId = createLinkedSetId(resolution.groupKey);
  const baseFormId = `${setId}_base`;

  if (character.alternateFormSets.some(set => set.id === setId)) {
    throw new Error("Alternate form linker set id collides with existing set");
  }

  return {
    id: setId,
    name: resolution.groupName,
    mechanism: "alternateForm",
    sourceTraitId: resolution.traitId,

    baseFormId,
    activeFormId: baseFormId,
    activeActivationId: null,
    activeSince: null,

    forms: [
      {
        id: baseFormId,
        name: options.baseFormName ?? DEFAULT_BASE_FORM_NAME,
        templateId: null,
        sourceTraitId: null,
        notes: "",
        tags: ["linker:auto", "form:base"],
        state: {},
        importMeta: {
          source: "alternateFormsLinker",
          linkerGroupKey: resolution.groupKey,
          isBaseForm: true,
        },
        raw: null,
      },
      createLinkedForm(resolution),
    ],

    notes: "",
    tags: ["linker:auto", `group:${resolution.groupKey}`],
    importMeta: {
      source: "alternateFormsLinker",
      linkerGroupKey: resolution.groupKey,
      defaultGroupPolicy: resolution.explicit ? null : DEFAULT_GROUP_KEY,
    },
    raw: null,
  };
}

function createLinkedForm(resolution) {
  return {
    id: createLinkedFormId(
      resolution.groupKey,
      resolution.traitId,
      resolution.templateId,
    ),
    name: resolution.targetName || resolution.templateName,
    templateId: resolution.templateId,
    sourceTraitId: resolution.traitId,
    notes: "",
    tags: ["linker:auto", `match:${resolution.matchMethod}`],
    state: {},
    importMeta: {
      source: "alternateFormsLinker",
      linkerGroupKey: resolution.groupKey,
      linkerSourceTraitId: resolution.traitId,
      linkerTemplateId: resolution.templateId,
      matchMethod: resolution.matchMethod,
    },
    raw: null,
  };
}

function isAlternateFormTrait(trait) {
  const name = normalizeText(trait?.name);
  const rawType = normalizeText(trait?.raw?.type ?? trait?.raw?.kind);

  return (
    name.includes("forma alternativa") ||
    name.includes("alternate form") ||
    rawType === "alternate_form"
  );
}

function readExplicitTemplateId(trait) {
  const values = [
    trait.alternateFormTemplateId,
    trait.importMeta?.alternateFormTemplateId,
    trait.raw?.alternateFormTemplateId,
    trait.raw?.alternate_form_template_id,
    trait.raw?.formTemplateId,
    trait.raw?.form_template_id,
    trait.raw?.targetTemplateId,
    trait.raw?.target_template_id,
  ];

  for (const value of values) {
    const normalized = normalizeNullableString(value);
    if (normalized !== null) return normalized;
  }

  return null;
}

function readTargetName(trait) {
  const explicitValues = [
    trait.alternateFormTemplateName,
    trait.importMeta?.alternateFormTemplateName,
    trait.raw?.alternateFormTemplateName,
    trait.raw?.alternate_form_template_name,
    trait.raw?.formTemplateName,
    trait.raw?.form_template_name,
    trait.raw?.targetTemplateName,
    trait.raw?.target_template_name,
    trait.raw?.formName,
    trait.raw?.form_name,
  ];

  for (const value of explicitValues) {
    const normalized = normalizeNullableString(value);
    if (normalized !== null) return normalized;
  }

  const fromName = extractTargetFromTraitName(trait.name);
  if (fromName !== null) return fromName;

  return normalizeNullableString(trait.notes);
}

function extractTargetFromTraitName(name) {
  const text = String(name ?? "").trim();
  const parenthetical = text.match(/(?:forma alternativa|alternate form)\s*\(([^)]+)\)/i);

  if (parenthetical) {
    return parenthetical[1].trim() || null;
  }

  const colon = text.match(/(?:forma alternativa|alternate form)\s*:\s*(.+)$/i);

  if (colon) {
    return colon[1].trim() || null;
  }

  return null;
}

function readGroupDefinition(trait, options) {
  const explicitValues = [
    trait.alternateGroupId,
    trait.importMeta?.alternateGroupId,
    trait.raw?.alternateGroupId,
    trait.raw?.alternate_group_id,
    trait.raw?.formSetId,
    trait.raw?.form_set_id,
  ];

  for (const value of explicitValues) {
    const normalized = normalizeNullableString(value);

    if (normalized !== null) {
      return {
        key: canonicalGroupKey(normalized),
        name: readExplicitGroupName(trait) ?? normalized,
        explicit: true,
      };
    }
  }

  const defaultKey = canonicalGroupKey(options.defaultGroupKey ?? DEFAULT_GROUP_KEY);

  return {
    key: defaultKey,
    name: options.defaultGroupName ?? DEFAULT_GROUP_NAME,
    explicit: false,
  };
}

function readExplicitGroupName(trait) {
  const values = [
    trait.importMeta?.alternateGroupName,
    trait.raw?.alternateGroupName,
    trait.raw?.alternate_group_name,
    trait.raw?.formSetName,
    trait.raw?.form_set_name,
  ];

  for (const value of values) {
    const normalized = normalizeNullableString(value);
    if (normalized !== null) return normalized;
  }

  return null;
}

function findTemplatesByTargetName(templates, targetName) {
  const exactTarget = normalizeText(targetName);
  const canonicalTarget = canonicalFormLabel(targetName);

  return templates.filter(template => {
    const exactTemplate = normalizeText(template.name);
    const canonicalTemplate = canonicalFormLabel(template.name);

    return (
      exactTemplate === exactTarget ||
      canonicalTemplate === canonicalTarget
    );
  });
}

function findExistingFormsByTrait(character, traitId) {
  const results = [];

  for (const set of character.alternateFormSets) {
    for (const form of set.forms) {
      if (form.sourceTraitId === traitId) {
        results.push({ set, form });
      }
    }
  }

  return results;
}

function findLinkedSetByGroupKey(sets, groupKey) {
  return sets.find(set => (
    set.importMeta?.source === "alternateFormsLinker" &&
    set.importMeta?.linkerGroupKey === groupKey
  )) ?? null;
}

function cloneFormSet(set) {
  return {
    ...set,
    forms: set.forms.map(form => ({
      ...form,
      tags: [...form.tags],
      state: { ...form.state },
      importMeta: form.importMeta ? { ...form.importMeta } : null,
    })),
    tags: [...set.tags],
    importMeta: set.importMeta ? { ...set.importMeta } : null,
  };
}

function canonicalFormLabel(value) {
  return normalizeText(value)
    .replace(/^template\s*:\s*/, "")
    .replace(/^modelo\s*:\s*/, "")
    .replace(/^forma\s+(?:de|do|da|dos|das)\s+/, "")
    .replace(/^forma\s+/, "")
    .replace(/^form\s+of\s+/, "")
    .replace(/^form\s+/, "")
    .trim();
}

function canonicalGroupKey(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || DEFAULT_GROUP_KEY;
}

function createLinkedSetId(groupKey) {
  return `form_set_linked_${sanitizeIdPart(groupKey)}`;
}

function createLinkedFormId(groupKey, traitId, templateId) {
  return [
    "form_linked",
    sanitizeIdPart(groupKey),
    sanitizeIdPart(traitId),
    sanitizeIdPart(templateId),
  ].join("_");
}

function sanitizeIdPart(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function validateCharacterShape(character) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new Error("Character must be an object");
  }

  if (!Array.isArray(character.advantages)) {
    throw new Error("Character advantages must be an array");
  }

  if (!Array.isArray(character.templates)) {
    throw new Error("Character templates must be an array");
  }

  if (!Array.isArray(character.alternateFormSets)) {
    throw new Error("Character alternateFormSets must be an array");
  }
}
