import {
  createAdvantages,
  validateAdvantages,
  serializeAdvantages,
} from "./Advantages.js";
import {
  createPerks,
  validatePerks,
  serializePerks,
} from "./Perks.js";
import {
  createDisadvantages,
  validateDisadvantages,
  serializeDisadvantages,
} from "./Disadvantages.js";
import {
  createQuirks,
  validateQuirks,
  serializeQuirks,
} from "./Quirks.js";
import {
  createSkills,
  validateSkills,
  serializeSkills,
} from "./Skills.js";
import {
  createTechniques,
  validateTechniques,
  serializeTechniques,
} from "./Techniques.js";
import {
  createSpells,
  validateSpells,
  serializeSpells,
} from "./Spells.js";
import {
  createLanguages,
  validateLanguages,
  serializeLanguages,
} from "./Languages.js";
import {
  createFamiliarities,
  validateFamiliarities,
  serializeFamiliarities,
} from "./Familiarities.js";
import {
  createEquipment,
  validateEquipment,
  serializeEquipment,
} from "./Equipment.js";

const TEMPLATE_TYPES = ["template", "race", "metaTrait", "form", "unknown"];

export function createTemplates(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Templates must be an array");
  }

  const templates = input.map(createTemplate);

  validateTemplates(templates);

  return templates;
}

export function createTemplate(input = {}) {
  const traits = input.traits ?? {};

  return {
    id: input.id ?? generateTemplateId(),
    externalIds: normalizePlainObject(
      input.externalIds,
      "Template externalIds must be object",
      {},
    ),

    sourceVersion: normalizeNullableNonNegativeInteger(
      input.sourceVersion,
      "Template sourceVersion must be non-negative integer or null",
    ),
    templateType: input.templateType ?? "template",
    name: input.name ?? "",
    ancestry: input.ancestry ?? null,
    reference: input.reference ?? null,
    importedPoints: normalizeNullableNumber(input.importedPoints),

    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Template tags must be array"),

    traits: {
      advantages: createAdvantages(traits.advantages),
      perks: createPerks(traits.perks),
      disadvantages: createDisadvantages(traits.disadvantages),
      quirks: createQuirks(traits.quirks),
      containers: normalizeArray(
        traits.containers,
        "Template trait containers must be array",
      ),
      unknownNodes: normalizeArray(
        traits.unknownNodes,
        "Template unknown trait nodes must be array",
      ),
    },

    skills: createSkills(input.skills),
    techniques: createTechniques(input.techniques),
    skillContainers: normalizeArray(
      input.skillContainers,
      "Template skillContainers must be array",
    ),
    techniqueNodes: normalizeArray(
      input.techniqueNodes,
      "Template techniqueNodes must be array",
    ),
    unresolvedTechniqueLinks: normalizeArray(
      input.unresolvedTechniqueLinks,
      "Template unresolvedTechniqueLinks must be array",
    ),
    unknownSkillNodes: normalizeArray(
      input.unknownSkillNodes,
      "Template unknownSkillNodes must be array",
    ),

    spells: createSpells(input.spells),
    spellContainers: normalizeArray(
      input.spellContainers,
      "Template spellContainers must be array",
    ),
    unknownSpellNodes: normalizeArray(
      input.unknownSpellNodes,
      "Template unknownSpellNodes must be array",
    ),

    languages: createLanguages(input.languages),
    languageNodes: normalizeArray(
      input.languageNodes,
      "Template languageNodes must be array",
    ),
    unknownLanguageNodes: normalizeArray(
      input.unknownLanguageNodes,
      "Template unknownLanguageNodes must be array",
    ),

    familiarities: createFamiliarities(input.familiarities),
    familiarityNodes: normalizeArray(
      input.familiarityNodes,
      "Template familiarityNodes must be array",
    ),
    unknownFamiliarityNodes: normalizeArray(
      input.unknownFamiliarityNodes,
      "Template unknownFamiliarityNodes must be array",
    ),

    equipment: createEquipment(input.equipment),
    unknownEquipmentNodes: normalizeArray(
      input.unknownEquipmentNodes,
      "Template unknownEquipmentNodes must be array",
    ),

    importMeta: normalizePlainObject(
      input.importMeta,
      "Template importMeta must be object or null",
      null,
    ),
    raw: input.raw ?? null,
  };
}

export function validateTemplates(templates) {
  if (!Array.isArray(templates)) {
    throw new Error("Templates must be an array");
  }

  for (const template of templates) {
    validateTemplate(template);
  }

  return true;
}

export function validateTemplate(template) {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    throw new Error("Template must be an object");
  }

  if (!template.id) {
    throw new Error("Template must have id");
  }

  if (!isPlainObject(template.externalIds)) {
    throw new Error("Template externalIds must be object");
  }

  if (
    template.sourceVersion !== null &&
    (!Number.isInteger(template.sourceVersion) || template.sourceVersion < 0)
  ) {
    throw new Error("Template sourceVersion must be non-negative integer or null");
  }

  if (!TEMPLATE_TYPES.includes(template.templateType)) {
    throw new Error("Template templateType is invalid");
  }

  validateString(template.name, "Template name must be string");
  validateNullableString(template.ancestry, "Template ancestry must be string or null");
  validateNullableString(template.reference, "Template reference must be string or null");
  validateNullableNumber(
    template.importedPoints,
    "Template importedPoints must be number or null",
  );
  validateString(template.notes, "Template notes must be string");
  validateArray(template.tags, "Template tags must be array");

  if (!isPlainObject(template.traits)) {
    throw new Error("Template traits must be object");
  }

  validateAdvantages(template.traits.advantages);
  validatePerks(template.traits.perks);
  validateDisadvantages(template.traits.disadvantages);
  validateQuirks(template.traits.quirks);
  validateArray(template.traits.containers, "Template trait containers must be array");
  validateArray(template.traits.unknownNodes, "Template unknown trait nodes must be array");

  validateSkills(template.skills);
  validateTechniques(template.techniques);
  validateArray(template.skillContainers, "Template skillContainers must be array");
  validateArray(template.techniqueNodes, "Template techniqueNodes must be array");
  validateArray(
    template.unresolvedTechniqueLinks,
    "Template unresolvedTechniqueLinks must be array",
  );
  validateArray(template.unknownSkillNodes, "Template unknownSkillNodes must be array");

  validateSpells(template.spells);
  validateArray(template.spellContainers, "Template spellContainers must be array");
  validateArray(template.unknownSpellNodes, "Template unknownSpellNodes must be array");

  validateLanguages(template.languages);
  validateArray(template.languageNodes, "Template languageNodes must be array");
  validateArray(
    template.unknownLanguageNodes,
    "Template unknownLanguageNodes must be array",
  );

  validateFamiliarities(template.familiarities);
  validateArray(template.familiarityNodes, "Template familiarityNodes must be array");
  validateArray(
    template.unknownFamiliarityNodes,
    "Template unknownFamiliarityNodes must be array",
  );

  validateEquipment(template.equipment);
  validateArray(
    template.unknownEquipmentNodes,
    "Template unknownEquipmentNodes must be array",
  );

  if (template.importMeta !== null && !isPlainObject(template.importMeta)) {
    throw new Error("Template importMeta must be object or null");
  }

  return true;
}

export function serializeTemplates(templates) {
  validateTemplates(templates);

  return templates.map(template => ({
    id: template.id,
    externalIds: { ...template.externalIds },

    sourceVersion: template.sourceVersion,
    templateType: template.templateType,
    name: template.name,
    ancestry: template.ancestry,
    reference: template.reference,
    importedPoints: template.importedPoints,

    notes: template.notes,
    tags: [...template.tags],

    traits: {
      advantages: serializeAdvantages(template.traits.advantages),
      perks: serializePerks(template.traits.perks),
      disadvantages: serializeDisadvantages(template.traits.disadvantages),
      quirks: serializeQuirks(template.traits.quirks),
      containers: [...template.traits.containers],
      unknownNodes: [...template.traits.unknownNodes],
    },

    skills: serializeSkills(template.skills),
    techniques: serializeTechniques(template.techniques),
    skillContainers: [...template.skillContainers],
    techniqueNodes: [...template.techniqueNodes],
    unresolvedTechniqueLinks: [...template.unresolvedTechniqueLinks],
    unknownSkillNodes: [...template.unknownSkillNodes],

    spells: serializeSpells(template.spells),
    spellContainers: [...template.spellContainers],
    unknownSpellNodes: [...template.unknownSpellNodes],

    languages: serializeLanguages(template.languages),
    languageNodes: [...template.languageNodes],
    unknownLanguageNodes: [...template.unknownLanguageNodes],

    familiarities: serializeFamiliarities(template.familiarities),
    familiarityNodes: [...template.familiarityNodes],
    unknownFamiliarityNodes: [...template.unknownFamiliarityNodes],

    equipment: serializeEquipment(template.equipment),
    unknownEquipmentNodes: [...template.unknownEquipmentNodes],

    importMeta: template.importMeta,
    raw: template.raw,
  }));
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function normalizePlainObject(value, errorMessage, fallback) {
  if (value === undefined || value === null) return fallback;

  if (!isPlainObject(value)) {
    throw new Error(errorMessage);
  }

  return { ...value };
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeNullableNonNegativeInteger(value, errorMessage) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(errorMessage);
  }

  return parsed;
}

function validateString(value, errorMessage) {
  if (typeof value !== "string") {
    throw new Error(errorMessage);
  }
}

function validateNullableString(value, errorMessage) {
  if (value !== null && typeof value !== "string") {
    throw new Error(errorMessage);
  }
}

function validateNullableNumber(value, errorMessage) {
  if (value !== null && (typeof value !== "number" || Number.isNaN(value))) {
    throw new Error(errorMessage);
  }
}

function validateArray(value, errorMessage) {
  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateTemplateId() {
  return `template_${Math.random().toString(36).slice(2, 10)}`;
}
