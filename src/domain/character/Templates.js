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

const TEMPLATE_TYPES = [
  "template",
  "race",
  "metaTrait",
  "profession",
  "archetype",
  "body",
  "form",
  "campaignPackage",
  "unknown",
];

const TEMPLATE_SOURCE_KINDS = [
  "singular",
  "imported",
  "embedded",
  "external",
  "unknown",
];

const ENTRY_DOMAIN_BY_TYPE = {
  advantage: "trait",
  perk: "trait",
  disadvantage: "trait",
  quirk: "trait",
  traitContainer: "trait",
  unknownTrait: "trait",
  skill: "skill",
  technique: "skill",
  skillContainer: "skill",
  techniqueNode: "skill",
  unresolvedTechniqueLink: "skill",
  unknownSkill: "skill",
  spell: "magic",
  spellContainer: "magic",
  unknownSpell: "magic",
  language: "language",
  languageNode: "language",
  unknownLanguage: "language",
  familiarity: "culture",
  familiarityNode: "culture",
  unknownFamiliarity: "culture",
  equipment: "equipment",
  unknownEquipment: "equipment",
  templateReference: "template",
  rule: "rule",
  unknown: "unknown",
};

const KNOWN_COMPONENT_ENTRY_TYPES = new Set([
  "advantage",
  "perk",
  "disadvantage",
  "quirk",
  "skill",
  "technique",
  "spell",
  "language",
  "familiarity",
  "equipment",
]);

export function createTemplates(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Templates must be an array");
  }

  const templates = input.map(item => createTemplate(item));
  validateTemplates(templates);
  return deepFreeze([...templates]);
}

export function createTemplate(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Template must be an object");
  }

  const id = requiredString(input.id ?? generateTemplateId(), "Template must have id");
  const sourceVersion = normalizeNullableNonNegativeInteger(
    input.sourceVersion,
    "Template sourceVersion must be non-negative integer or null",
  );
  const importMeta = normalizePlainObject(
    input.importMeta,
    "Template importMeta must be object or null",
    null,
  );
  const source = normalizeTemplateSource(input.source, {
    importMeta,
    reference: input.reference,
    sourceVersion,
  });
  const legacy = normalizeLegacyComponents(input);
  const explicitEntries = input.entries === undefined || input.entries === null
    ? []
    : createTemplateEntries(input.entries, { templateId: id });
  const generatedEntries = createEntriesFromLegacy(id, legacy);
  const entries = mergeEntries(explicitEntries, generatedEntries);
  const views = createLegacyViews(entries);

  const template = {
    id,
    externalIds: normalizePlainObject(
      input.externalIds,
      "Template externalIds must be object",
      {},
    ),
    name: input.name ?? "",
    templateType: input.templateType ?? "template",
    source,
    entries,
    importedPoints: normalizeNullableNumber(input.importedPoints),
    calculatedPoints: normalizeNullableNumber(input.calculatedPoints),
    notes: input.notes ?? "",
    tags: normalizeStringArray(input.tags, "Template tags must be string array"),
    importMeta,
    raw: cloneValue(input.raw ?? null),

    sourceVersion: sourceVersion ?? normalizeCompatibleSourceVersion(source.version),
    ancestry: input.ancestry ?? null,
    reference: input.reference ?? source.reference,
    traits: views.traits,
    skills: views.skills,
    techniques: views.techniques,
    skillContainers: views.skillContainers,
    techniqueNodes: views.techniqueNodes,
    unresolvedTechniqueLinks: views.unresolvedTechniqueLinks,
    unknownSkillNodes: views.unknownSkillNodes,
    spells: views.spells,
    spellContainers: views.spellContainers,
    unknownSpellNodes: views.unknownSpellNodes,
    languages: views.languages,
    languageNodes: views.languageNodes,
    unknownLanguageNodes: views.unknownLanguageNodes,
    familiarities: views.familiarities,
    familiarityNodes: views.familiarityNodes,
    unknownFamiliarityNodes: views.unknownFamiliarityNodes,
    equipment: views.equipment,
    unknownEquipmentNodes: views.unknownEquipmentNodes,
  };

  validateTemplate(template);
  return deepFreeze(template);
}

export function createTemplateEntries(input = [], options = {}) {
  if (!Array.isArray(input)) {
    throw new Error("Template entries must be an array");
  }

  const templateId = options.templateId ?? "template";
  const entries = input.map((entry, index) => createTemplateEntry(entry, {
    templateId,
    index,
  }));

  validateTemplateEntries(entries);
  return entries;
}

export function createTemplateEntry(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Template entry must be an object");
  }

  const entryType = input.entryType ?? input.type ?? "unknown";
  const templateId = options.templateId ?? "template";
  const index = options.index ?? 0;
  const id = requiredString(
    input.id ?? `${templateId}:entry:${entryType}:${index}`,
    "Template entry id must be non-empty string",
  );
  const entry = {
    id,
    domain: input.domain ?? ENTRY_DOMAIN_BY_TYPE[entryType] ?? "unknown",
    entryType,
    externalIds: normalizePlainObject(
      input.externalIds,
      "Template entry externalIds must be object",
      {},
    ),
    referenceId: normalizeNullableString(input.referenceId),
    payload: normalizeEntryPayload(entryType, input.payload ?? {}, id),
    notes: input.notes ?? "",
    tags: normalizeStringArray(
      input.tags,
      "Template entry tags must be string array",
    ),
    importMeta: normalizePlainObject(
      input.importMeta,
      "Template entry importMeta must be object or null",
      null,
    ),
    raw: cloneValue(input.raw ?? null),
  };

  validateTemplateEntry(entry);
  return entry;
}

export function validateTemplates(templates) {
  if (!Array.isArray(templates)) {
    throw new Error("Templates must be an array");
  }

  const ids = new Set();
  for (const template of templates) {
    validateTemplate(template);
    if (ids.has(template.id)) {
      throw new Error("Template ids must be unique");
    }
    ids.add(template.id);
  }
  return true;
}

export function validateTemplate(template) {
  if (!isPlainObject(template)) {
    throw new Error("Template must be an object");
  }

  requiredString(template.id, "Template must have id");
  requirePlainObject(template.externalIds, "Template externalIds must be object");
  requireString(template.name, "Template name must be string");

  if (!TEMPLATE_TYPES.includes(template.templateType)) {
    throw new Error("Template templateType is invalid");
  }

  validateTemplateSource(template.source);
  validateTemplateEntries(template.entries);
  validateNullableNumber(
    template.importedPoints,
    "Template importedPoints must be number or null",
  );
  validateNullableNumber(
    template.calculatedPoints,
    "Template calculatedPoints must be number or null",
  );
  requireString(template.notes, "Template notes must be string");
  validateStringArray(template.tags, "Template tags must be string array");

  if (template.importMeta !== null) {
    requirePlainObject(template.importMeta, "Template importMeta must be object or null");
  }

  if (
    template.sourceVersion !== null &&
    (!Number.isInteger(template.sourceVersion) || template.sourceVersion < 0)
  ) {
    throw new Error("Template sourceVersion must be non-negative integer or null");
  }

  validateNullableStringField(template.ancestry, "Template ancestry must be string or null");
  validateNullableStringField(template.reference, "Template reference must be string or null");
  validateLegacyViews(template);
  return true;
}

export function validateTemplateEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("Template entries must be an array");
  }

  const ids = new Set();
  for (const entry of entries) {
    validateTemplateEntry(entry);
    if (ids.has(entry.id)) {
      throw new Error("Template entry ids must be unique");
    }
    ids.add(entry.id);
  }
  return true;
}

export function validateTemplateEntry(entry) {
  if (!isPlainObject(entry)) {
    throw new Error("Template entry must be an object");
  }

  requiredString(entry.id, "Template entry id must be non-empty string");
  requiredString(entry.domain, "Template entry domain must be non-empty string");
  requiredString(
    entry.entryType,
    "Template entry entryType must be non-empty string",
  );
  requirePlainObject(entry.externalIds, "Template entry externalIds must be object");
  validateNullableStringField(
    entry.referenceId,
    "Template entry referenceId must be string or null",
  );
  requireString(entry.notes, "Template entry notes must be string");
  validateStringArray(entry.tags, "Template entry tags must be string array");

  if (entry.importMeta !== null) {
    requirePlainObject(
      entry.importMeta,
      "Template entry importMeta must be object or null",
    );
  }

  return true;
}

export function validateTemplateSource(source) {
  requirePlainObject(source, "Template source must be object");

  if (!TEMPLATE_SOURCE_KINDS.includes(source.kind)) {
    throw new Error("Template source kind is invalid");
  }

  validateNullableStringField(
    source.provider,
    "Template source provider must be string or null",
  );
  validateNullableStringField(
    source.format,
    "Template source format must be string or null",
  );
  validateNullableStringField(
    source.reference,
    "Template source reference must be string or null",
  );

  if (
    source.version !== null &&
    typeof source.version !== "string" &&
    typeof source.version !== "number"
  ) {
    throw new Error("Template source version must be string, number or null");
  }

  return true;
}

export function serializeTemplates(templates) {
  validateTemplates(templates);

  return templates.map(template => ({
    id: template.id,
    externalIds: cloneValue(template.externalIds),
    name: template.name,
    templateType: template.templateType,
    source: cloneValue(template.source),
    entries: template.entries.map(entry => serializeTemplateEntry(entry)),
    importedPoints: template.importedPoints,
    calculatedPoints: template.calculatedPoints,
    notes: template.notes,
    tags: [...template.tags],
    importMeta: cloneValue(template.importMeta),
    raw: cloneValue(template.raw),

    sourceVersion: template.sourceVersion,
    ancestry: template.ancestry,
    reference: template.reference,
    traits: {
      advantages: serializeAdvantages(template.traits.advantages),
      perks: serializePerks(template.traits.perks),
      disadvantages: serializeDisadvantages(template.traits.disadvantages),
      quirks: serializeQuirks(template.traits.quirks),
      containers: cloneValue(template.traits.containers),
      unknownNodes: cloneValue(template.traits.unknownNodes),
    },
    skills: serializeSkills(template.skills),
    techniques: serializeTechniques(template.techniques),
    skillContainers: cloneValue(template.skillContainers),
    techniqueNodes: cloneValue(template.techniqueNodes),
    unresolvedTechniqueLinks: cloneValue(template.unresolvedTechniqueLinks),
    unknownSkillNodes: cloneValue(template.unknownSkillNodes),
    spells: serializeSpells(template.spells),
    spellContainers: cloneValue(template.spellContainers),
    unknownSpellNodes: cloneValue(template.unknownSpellNodes),
    languages: serializeLanguages(template.languages),
    languageNodes: cloneValue(template.languageNodes),
    unknownLanguageNodes: cloneValue(template.unknownLanguageNodes),
    familiarities: serializeFamiliarities(template.familiarities),
    familiarityNodes: cloneValue(template.familiarityNodes),
    unknownFamiliarityNodes: cloneValue(template.unknownFamiliarityNodes),
    equipment: serializeEquipment(template.equipment),
    unknownEquipmentNodes: cloneValue(template.unknownEquipmentNodes),
  }));
}

export function serializeTemplateEntry(entry) {
  validateTemplateEntry(entry);
  return {
    id: entry.id,
    domain: entry.domain,
    entryType: entry.entryType,
    externalIds: cloneValue(entry.externalIds),
    referenceId: entry.referenceId,
    payload: cloneValue(entry.payload),
    notes: entry.notes,
    tags: [...entry.tags],
    importMeta: cloneValue(entry.importMeta),
    raw: cloneValue(entry.raw),
  };
}

export function getTemplateTypes() {
  return [...TEMPLATE_TYPES];
}

export function getTemplateSourceKinds() {
  return [...TEMPLATE_SOURCE_KINDS];
}

function normalizeLegacyComponents(input) {
  const traits = input.traits ?? {};
  requirePlainObject(traits, "Template traits must be object");

  return {
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
  };
}

function createEntriesFromLegacy(templateId, legacy) {
  const groups = [
    ["trait", "advantage", serializeAdvantages(legacy.traits.advantages)],
    ["trait", "perk", serializePerks(legacy.traits.perks)],
    ["trait", "disadvantage", serializeDisadvantages(legacy.traits.disadvantages)],
    ["trait", "quirk", serializeQuirks(legacy.traits.quirks)],
    ["trait", "traitContainer", legacy.traits.containers],
    ["trait", "unknownTrait", legacy.traits.unknownNodes],
    ["skill", "skill", serializeSkills(legacy.skills)],
    ["skill", "technique", serializeTechniques(legacy.techniques)],
    ["skill", "skillContainer", legacy.skillContainers],
    ["skill", "techniqueNode", legacy.techniqueNodes],
    ["skill", "unresolvedTechniqueLink", legacy.unresolvedTechniqueLinks],
    ["skill", "unknownSkill", legacy.unknownSkillNodes],
    ["magic", "spell", serializeSpells(legacy.spells)],
    ["magic", "spellContainer", legacy.spellContainers],
    ["magic", "unknownSpell", legacy.unknownSpellNodes],
    ["language", "language", serializeLanguages(legacy.languages)],
    ["language", "languageNode", legacy.languageNodes],
    ["language", "unknownLanguage", legacy.unknownLanguageNodes],
    ["culture", "familiarity", serializeFamiliarities(legacy.familiarities)],
    ["culture", "familiarityNode", legacy.familiarityNodes],
    ["culture", "unknownFamiliarity", legacy.unknownFamiliarityNodes],
    ["equipment", "equipment", serializeEquipment(legacy.equipment)],
    ["equipment", "unknownEquipment", legacy.unknownEquipmentNodes],
  ];
  const entries = [];
  const usedIds = new Set();

  for (const [domain, entryType, records] of groups) {
    records.forEach((record, index) => {
      const sourceId = isPlainObject(record) &&
        typeof record.id === "string" &&
        record.id !== ""
        ? record.id
        : `legacy-${index}`;
      const baseId = `${templateId}:${entryType}:${sourceId}`;
      let id = baseId;
      let suffix = 1;

      while (usedIds.has(id)) {
        id = `${baseId}:${suffix}`;
        suffix += 1;
      }

      usedIds.add(id);
      entries.push(createTemplateEntry({
        id,
        domain,
        entryType,
        payload: record,
      }, { templateId, index }));
    });
  }

  return entries;
}

function mergeEntries(explicitEntries, generatedEntries) {
  const result = [];
  const byId = new Map();
  const bySemanticKey = new Map();

  for (const entry of explicitEntries) {
    append(entry);
  }

  for (const entry of generatedEntries) {
    const existing = bySemanticKey.get(semanticKey(entry));
    if (existing) {
      if (!deepEqual(existing.payload, entry.payload)) {
        throw new Error("Template entries conflict with compatibility components");
      }
      continue;
    }
    append(entry);
  }

  validateTemplateEntries(result);
  return result;

  function append(entry) {
    const sameId = byId.get(entry.id);
    if (sameId) {
      if (!deepEqual(serializeTemplateEntry(sameId), serializeTemplateEntry(entry))) {
        throw new Error("Template entry id has conflicting definitions");
      }
      return;
    }

    byId.set(entry.id, entry);
    bySemanticKey.set(semanticKey(entry), entry);
    result.push(entry);
  }
}

function semanticKey(entry) {
  const payloadId = isPlainObject(entry.payload) &&
    typeof entry.payload.id === "string" &&
    entry.payload.id !== ""
    ? entry.payload.id
    : entry.id;
  return `${entry.entryType}:${payloadId}`;
}

function createLegacyViews(entries) {
  const payloads = type => entries
    .filter(entry => entry.entryType === type)
    .map(entry => cloneValue(entry.payload));

  return {
    traits: {
      advantages: createAdvantages(payloads("advantage")),
      perks: createPerks(payloads("perk")),
      disadvantages: createDisadvantages(payloads("disadvantage")),
      quirks: createQuirks(payloads("quirk")),
      containers: payloads("traitContainer"),
      unknownNodes: payloads("unknownTrait"),
    },
    skills: createSkills(payloads("skill")),
    techniques: createTechniques(payloads("technique")),
    skillContainers: payloads("skillContainer"),
    techniqueNodes: payloads("techniqueNode"),
    unresolvedTechniqueLinks: payloads("unresolvedTechniqueLink"),
    unknownSkillNodes: payloads("unknownSkill"),
    spells: createSpells(payloads("spell")),
    spellContainers: payloads("spellContainer"),
    unknownSpellNodes: payloads("unknownSpell"),
    languages: createLanguages(payloads("language")),
    languageNodes: payloads("languageNode"),
    unknownLanguageNodes: payloads("unknownLanguage"),
    familiarities: createFamiliarities(payloads("familiarity")),
    familiarityNodes: payloads("familiarityNode"),
    unknownFamiliarityNodes: payloads("unknownFamiliarity"),
    equipment: createEquipment(payloads("equipment")),
    unknownEquipmentNodes: payloads("unknownEquipment"),
  };
}

function normalizeEntryPayload(entryType, payload, entryId) {
  const cloned = cloneValue(payload);
  if (!KNOWN_COMPONENT_ENTRY_TYPES.has(entryType)) return cloned;

  if (!isPlainObject(cloned)) {
    throw new Error(`Template ${entryType} entry payload must be object`);
  }

  const withId = {
    ...cloned,
    id: typeof cloned.id === "string" && cloned.id !== "" ? cloned.id : entryId,
  };

  switch (entryType) {
    case "advantage":
      return serializeAdvantages(createAdvantages([withId]))[0];
    case "perk":
      return serializePerks(createPerks([withId]))[0];
    case "disadvantage":
      return serializeDisadvantages(createDisadvantages([withId]))[0];
    case "quirk":
      return serializeQuirks(createQuirks([withId]))[0];
    case "skill":
      return serializeSkills(createSkills([withId]))[0];
    case "technique":
      return serializeTechniques(createTechniques([withId]))[0];
    case "spell":
      return serializeSpells(createSpells([withId]))[0];
    case "language":
      return serializeLanguages(createLanguages([withId]))[0];
    case "familiarity":
      return serializeFamiliarities(createFamiliarities([withId]))[0];
    case "equipment":
      return serializeEquipment(createEquipment([withId]))[0];
    default:
      return withId;
  }
}

function normalizeTemplateSource(input, fallback) {
  let source;

  if (input === undefined || input === null) {
    const provider = isPlainObject(fallback.importMeta) &&
      typeof fallback.importMeta.source === "string" &&
      fallback.importMeta.source !== ""
      ? fallback.importMeta.source
      : null;
    source = {
      kind: provider === null ? "singular" : "imported",
      provider,
      format: isPlainObject(fallback.importMeta) &&
        typeof fallback.importMeta.format === "string"
        ? fallback.importMeta.format
        : null,
      reference: normalizeNullableString(fallback.reference),
      version: fallback.sourceVersion,
    };
  } else if (typeof input === "string") {
    source = {
      kind: TEMPLATE_SOURCE_KINDS.includes(input) ? input : "external",
      provider: TEMPLATE_SOURCE_KINDS.includes(input) ? null : input,
      format: null,
      reference: normalizeNullableString(fallback.reference),
      version: fallback.sourceVersion,
    };
  } else if (isPlainObject(input)) {
    source = {
      ...cloneValue(input),
      kind: input.kind ?? "unknown",
      provider: normalizeNullableString(input.provider),
      format: normalizeNullableString(input.format),
      reference: normalizeNullableString(input.reference ?? fallback.reference),
      version: normalizeSourceVersionValue(input.version ?? fallback.sourceVersion),
    };
  } else {
    throw new Error("Template source must be object, string or null");
  }

  validateTemplateSource(source);
  return source;
}

function validateLegacyViews(template) {
  requirePlainObject(template.traits, "Template traits must be object");
  validateAdvantages(template.traits.advantages);
  validatePerks(template.traits.perks);
  validateDisadvantages(template.traits.disadvantages);
  validateQuirks(template.traits.quirks);
  requireArray(template.traits.containers, "Template trait containers must be array");
  requireArray(template.traits.unknownNodes, "Template unknown trait nodes must be array");
  validateSkills(template.skills);
  validateTechniques(template.techniques);
  requireArray(template.skillContainers, "Template skillContainers must be array");
  requireArray(template.techniqueNodes, "Template techniqueNodes must be array");
  requireArray(
    template.unresolvedTechniqueLinks,
    "Template unresolvedTechniqueLinks must be array",
  );
  requireArray(template.unknownSkillNodes, "Template unknownSkillNodes must be array");
  validateSpells(template.spells);
  requireArray(template.spellContainers, "Template spellContainers must be array");
  requireArray(template.unknownSpellNodes, "Template unknownSpellNodes must be array");
  validateLanguages(template.languages);
  requireArray(template.languageNodes, "Template languageNodes must be array");
  requireArray(
    template.unknownLanguageNodes,
    "Template unknownLanguageNodes must be array",
  );
  validateFamiliarities(template.familiarities);
  requireArray(template.familiarityNodes, "Template familiarityNodes must be array");
  requireArray(
    template.unknownFamiliarityNodes,
    "Template unknownFamiliarityNodes must be array",
  );
  validateEquipment(template.equipment);
  requireArray(
    template.unknownEquipmentNodes,
    "Template unknownEquipmentNodes must be array",
  );
}

function normalizeArray(value, message) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(message);
  return value.map(item => cloneValue(item));
}

function normalizeStringArray(value, message) {
  if (value === undefined || value === null) return [];
  validateStringArray(value, message);
  return [...value];
}

function normalizePlainObject(value, message, fallback) {
  if (value === undefined || value === null) return fallback;
  if (!isPlainObject(value)) throw new Error(message);
  return cloneValue(value);
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

function normalizeNullableNonNegativeInteger(value, message) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(message);
  return parsed;
}

function normalizeCompatibleSourceVersion(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeSourceVersionValue(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Template source version must be string, number or null");
  }
  return value;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Template nullable string value must be string or null");
  }
  return value;
}

function requiredString(value, message) {
  if (typeof value !== "string" || value === "") throw new Error(message);
  return value;
}

function requireString(value, message) {
  if (typeof value !== "string") throw new Error(message);
}

function validateNullableStringField(value, message) {
  if (value !== null && typeof value !== "string") throw new Error(message);
}

function validateNullableNumber(value, message) {
  if (value !== null && (typeof value !== "number" || Number.isNaN(value))) {
    throw new Error(message);
  }
}

function requireArray(value, message) {
  if (!Array.isArray(value)) throw new Error(message);
}

function validateStringArray(value, message) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(message);
  }
}

function requirePlainObject(value, message) {
  if (!isPlainObject(value)) throw new Error(message);
}

function cloneValue(value, seen = new WeakMap()) {
  if (!(seen instanceof WeakMap)) seen = new WeakMap();

  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    value.forEach(item => result.push(cloneValue(item, seen)));
    return result;
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    Object.entries(value).forEach(([key, item]) => {
      result[key] = cloneValue(item, seen);
    });
    return result;
  }

  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function deepEqual(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(item => canonicalize(item));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateTemplateId() {
  return `template_${Math.random().toString(36).slice(2, 10)}`;
}
