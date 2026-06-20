import {
  createMorphCatalogHistory,
  validateMorphCatalogHistory,
  serializeMorphCatalogHistory,
} from "./MorphCatalogHistory.js";

const POINT_LIMIT_MODES = ["undeclared", "limited", "unlimited"];
const POINT_LIMIT_SOURCES = [
  "undeclared",
  "manual",
  "imported",
  "modifier",
  "campaign",
];
const CATALOG_MODES = ["unknown", "knownOnly", "open"];
const MEMORIZATION_MODES = ["unknown", "none", "permanent", "limited"];
const MEMORIZATION_CAPACITY_BASES = [
  "unknown",
  "iq",
  "fixed",
  "unlimited",
  "notApplicable",
];
const IMPROVISATION_MODES = ["unknown", "forbidden", "allowed", "conditional"];
const ACQUISITION_METHODS = [
  "unknown",
  "manual",
  "imported",
  "memorized",
  "observed",
];
const KNOWN_FORM_STATES = ["available", "unavailable", "forgotten"];

export function createMorphProfile(input = {}) {
  const pointLimit = nullableNumber(
    input.pointLimit,
    "Morfose pointLimit must be non-negative number or null",
  );
  const pointLimitMode = input.pointLimitMode ?? (
    pointLimit === null ? "undeclared" : "limited"
  );
  const memorizationMode = input.memorization?.mode ?? "unknown";
  const requestedMemorizationCapacity = nullableInteger(
    input.memorization?.capacity,
    "Morfose memorization capacity must be non-negative integer or null",
  );
  const memorizationCapacityBasis = normalizeCapacityBasis(
    memorizationMode,
    requestedMemorizationCapacity,
    input.memorization?.capacityBasis,
  );
  const memorizationCapacity = memorizationCapacityBasis === "fixed"
    ? requestedMemorizationCapacity
    : null;

  const profile = {
    pointLimitMode,
    pointLimit,
    pointLimitSource: input.pointLimitSource ?? "undeclared",
    catalog: {
      mode: input.catalog?.mode ?? "unknown",
      capacity: nullableInteger(
        input.catalog?.capacity,
        "Morfose catalog capacity must be non-negative integer or null",
      ),
    },
    memorization: {
      mode: memorizationMode,
      capacity: memorizationCapacity,
      capacityBasis: memorizationCapacityBasis,
      durationSeconds: nullableInteger(
        input.memorization?.durationSeconds,
        "Morfose memorization durationSeconds must be non-negative integer or null",
      ),
    },
    improvisation: {
      mode: input.improvisation?.mode ?? "unknown",
      pointLimit: nullableNumber(
        input.improvisation?.pointLimit,
        "Morfose improvisation pointLimit must be non-negative number or null",
      ),
    },
    knownForms: normalizeKnownForms(input.knownForms),
    catalogHistory: createMorphCatalogHistory(input.catalogHistory),
    notes: input.notes ?? "",
    tags: stringArray(input.tags, "Morfose tags must be string array"),
    importMeta: nullableObject(input.importMeta, "Morfose importMeta must be object or null"),
    raw: clone(input.raw ?? null),
  };

  validateMorphProfile(profile);
  return profile;
}

export function createMorphKnownForm(input = {}) {
  const form = {
    id: input.id ?? generateKnownFormId(),
    templateId: input.templateId ?? null,
    externalIds: object(input.externalIds, "Morfose known form externalIds must be object", {}),
    name: input.name ?? "",
    acquisitionMethod: input.acquisitionMethod ?? "unknown",
    acquiredAt: nullableTimestamp(
      input.acquiredAt,
      "Morfose known form acquiredAt must be valid timestamp or null",
    ),
    memorizedAt: nullableTimestamp(
      input.memorizedAt,
      "Morfose known form memorizedAt must be valid timestamp or null",
    ),
    lastObservedAt: nullableTimestamp(
      input.lastObservedAt,
      "Morfose known form lastObservedAt must be valid timestamp or null",
    ),
    state: input.state ?? "available",
    notes: input.notes ?? "",
    tags: stringArray(input.tags, "Morfose known form tags must be string array"),
    importMeta: nullableObject(
      input.importMeta,
      "Morfose known form importMeta must be object or null",
    ),
    raw: clone(input.raw ?? null),
  };

  validateMorphKnownForm(form);
  return form;
}

export function validateMorphProfile(profile) {
  if (!plain(profile)) throw new Error("Morfose profile must be object");
  if (!POINT_LIMIT_MODES.includes(profile.pointLimitMode)) {
    throw new Error("Morfose pointLimitMode is invalid");
  }
  validateNullableNumber(
    profile.pointLimit,
    "Morfose pointLimit must be non-negative number or null",
  );
  if (!POINT_LIMIT_SOURCES.includes(profile.pointLimitSource)) {
    throw new Error("Morfose pointLimitSource is invalid");
  }
  if (profile.pointLimitMode === "limited" && profile.pointLimit === null) {
    throw new Error("Limited Morfose point limit requires pointLimit");
  }
  if (profile.pointLimitMode !== "limited" && profile.pointLimit !== null) {
    throw new Error("Only limited Morfose point limit may have pointLimit");
  }

  validatePolicy(
    profile.catalog,
    CATALOG_MODES,
    "Morfose catalog",
    "capacity",
    validateNullableInteger,
  );
  validateMemorizationPolicy(profile.memorization);
  validatePolicy(
    profile.improvisation,
    IMPROVISATION_MODES,
    "Morfose improvisation",
    "pointLimit",
    validateNullableNumber,
  );

  if (!Array.isArray(profile.knownForms)) {
    throw new Error("Morfose knownForms must be array");
  }
  const ids = new Set();
  const templateIds = new Set();
  for (const form of profile.knownForms) {
    validateMorphKnownForm(form);
    if (ids.has(form.id)) throw new Error("Morfose known form ids must be unique");
    ids.add(form.id);
    if (form.templateId !== null) {
      if (templateIds.has(form.templateId)) {
        throw new Error("Morfose known form templateIds must be unique");
      }
      templateIds.add(form.templateId);
    }
  }

  validateMorphCatalogHistory(profile.catalogHistory);
  if (typeof profile.notes !== "string") throw new Error("Morfose notes must be string");
  validateStringArray(profile.tags, "Morfose tags must be string array");
  validateNullableObject(profile.importMeta, "Morfose importMeta must be object or null");
  return true;
}

export function validateMorphKnownForm(form) {
  if (!plain(form)) throw new Error("Morfose known form must be object");
  requiredString(form.id, "Morfose known form id must be non-empty string");
  if (form.templateId !== null) {
    requiredString(form.templateId, "Morfose known form templateId must be non-empty string or null");
  }
  if (!plain(form.externalIds)) throw new Error("Morfose known form externalIds must be object");
  if (typeof form.name !== "string") throw new Error("Morfose known form name must be string");
  if (!ACQUISITION_METHODS.includes(form.acquisitionMethod)) {
    throw new Error("Morfose known form acquisitionMethod is invalid");
  }
  validateNullableTimestamp(
    form.acquiredAt,
    "Morfose known form acquiredAt must be valid timestamp or null",
  );
  validateNullableTimestamp(
    form.memorizedAt,
    "Morfose known form memorizedAt must be valid timestamp or null",
  );
  validateNullableTimestamp(
    form.lastObservedAt,
    "Morfose known form lastObservedAt must be valid timestamp or null",
  );
  if (!KNOWN_FORM_STATES.includes(form.state)) {
    throw new Error("Morfose known form state is invalid");
  }
  if (typeof form.notes !== "string") throw new Error("Morfose known form notes must be string");
  validateStringArray(form.tags, "Morfose known form tags must be string array");
  validateNullableObject(
    form.importMeta,
    "Morfose known form importMeta must be object or null",
  );
  return true;
}

export function validateMorphProfilesForCharacter(character) {
  if (!plain(character)) throw new Error("Character must be object");
  const templates = new Set((character.templates ?? []).map(template => template.id));

  for (const set of character.alternateFormSets ?? []) {
    if (set.mechanism === "morph") {
      if (set.morphProfile === null) {
        throw new Error("Morfose form set must have morphProfile");
      }
      validateMorphProfile(set.morphProfile);
      for (const form of set.morphProfile.knownForms) {
        if (form.templateId !== null && !templates.has(form.templateId)) {
          throw new Error("Morfose known form templateId must reference Character template");
        }
      }
      for (const entry of set.morphProfile.catalogHistory) {
        if (entry.characterId !== character.identity.id) {
          throw new Error("Morfose catalog history entry belongs to another character");
        }
        if (entry.formSetId !== set.id) {
          throw new Error("Morfose catalog history entry belongs to another form set");
        }
      }
    } else if (set.morphProfile !== null) {
      throw new Error("Only Morfose form sets may have morphProfile");
    }
  }
  return true;
}

export function serializeMorphProfile(profile) {
  validateMorphProfile(profile);
  return {
    pointLimitMode: profile.pointLimitMode,
    pointLimit: profile.pointLimit,
    pointLimitSource: profile.pointLimitSource,
    catalog: { ...profile.catalog },
    memorization: { ...profile.memorization },
    improvisation: { ...profile.improvisation },
    knownForms: profile.knownForms.map(serializeMorphKnownForm),
    catalogHistory: serializeMorphCatalogHistory(profile.catalogHistory),
    notes: profile.notes,
    tags: [...profile.tags],
    importMeta: clone(profile.importMeta),
    raw: clone(profile.raw),
  };
}

export function serializeMorphKnownForm(form) {
  validateMorphKnownForm(form);
  return {
    id: form.id,
    templateId: form.templateId,
    externalIds: { ...form.externalIds },
    name: form.name,
    acquisitionMethod: form.acquisitionMethod,
    acquiredAt: form.acquiredAt,
    memorizedAt: form.memorizedAt,
    lastObservedAt: form.lastObservedAt,
    state: form.state,
    notes: form.notes,
    tags: [...form.tags],
    importMeta: clone(form.importMeta),
    raw: clone(form.raw),
  };
}

export function getMorphProfileEnums() {
  return {
    pointLimitModes: [...POINT_LIMIT_MODES],
    pointLimitSources: [...POINT_LIMIT_SOURCES],
    catalogModes: [...CATALOG_MODES],
    memorizationModes: [...MEMORIZATION_MODES],
    memorizationCapacityBases: [...MEMORIZATION_CAPACITY_BASES],
    improvisationModes: [...IMPROVISATION_MODES],
    acquisitionMethods: [...ACQUISITION_METHODS],
    knownFormStates: [...KNOWN_FORM_STATES],
  };
}

function validateMemorizationPolicy(policy) {
  if (!plain(policy)) throw new Error("Morfose memorization policy must be object");
  if (!MEMORIZATION_MODES.includes(policy.mode)) {
    throw new Error("Morfose memorization mode is invalid");
  }
  validateNullableInteger(
    policy.capacity,
    "Morfose memorization capacity must be non-negative value or null",
  );
  if (!MEMORIZATION_CAPACITY_BASES.includes(policy.capacityBasis)) {
    throw new Error("Morfose memorization capacityBasis is invalid");
  }
  validateNullableInteger(
    policy.durationSeconds,
    "Morfose memorization durationSeconds must be non-negative value or null",
  );
  if (policy.capacityBasis === "fixed" && policy.capacity === null) {
    throw new Error("Fixed Morfose memorization capacity requires capacity");
  }
  if (policy.capacityBasis !== "fixed" && policy.capacity !== null) {
    throw new Error("Only fixed Morfose memorization capacity may declare capacity");
  }
  if (policy.mode === "permanent" && policy.capacityBasis !== "unlimited") {
    throw new Error("Permanent Morfose repertoire requires unlimited capacity basis");
  }
  if (policy.mode === "none" && policy.capacityBasis !== "notApplicable") {
    throw new Error("Morfose without memorization requires notApplicable capacity basis");
  }
}

function normalizeCapacityBasis(mode, capacity, requested) {
  if (mode === "permanent") {
    if ([undefined, null, "unknown", "unlimited"].includes(requested)) {
      return "unlimited";
    }
    return requested;
  }
  if (mode === "none") {
    if ([undefined, null, "unknown", "notApplicable"].includes(requested)) {
      return "notApplicable";
    }
    return requested;
  }
  if (requested === undefined || requested === null || requested === "unknown") {
    return capacity !== null ? "fixed" : "unknown";
  }
  return requested;
}

function normalizeKnownForms(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Morfose knownForms must be array");
  return value.map(createMorphKnownForm);
}

function validatePolicy(policy, modes, label, valueKey, validator) {
  if (!plain(policy)) throw new Error(`${label} policy must be object`);
  if (!modes.includes(policy.mode)) throw new Error(`${label} mode is invalid`);
  validator(policy[valueKey], `${label} ${valueKey} must be non-negative value or null`);
}

function object(value, errorMessage, fallback) {
  if (value === undefined || value === null) return fallback;
  if (!plain(value)) throw new Error(errorMessage);
  return clone(value);
}

function nullableObject(value, errorMessage) {
  if (value === undefined || value === null) return null;
  if (!plain(value)) throw new Error(errorMessage);
  return clone(value);
}

function validateNullableObject(value, errorMessage) {
  if (value !== null && !plain(value)) throw new Error(errorMessage);
}

function stringArray(value, errorMessage) {
  if (value === undefined || value === null) return [];
  validateStringArray(value, errorMessage);
  return [...value];
}

function validateStringArray(value, errorMessage) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(errorMessage);
  }
}

function nullableNumber(value, errorMessage) {
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(errorMessage);
  return number;
}

function validateNullableNumber(value, errorMessage) {
  if (value !== null && (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  )) throw new Error(errorMessage);
}

function nullableInteger(value, errorMessage) {
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(errorMessage);
  return number;
}

function validateNullableInteger(value, errorMessage) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    throw new Error(errorMessage);
  }
}

function requiredString(value, errorMessage) {
  if (typeof value !== "string" || value === "") throw new Error(errorMessage);
}

function nullableTimestamp(value, errorMessage) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(errorMessage);
  }
  return value;
}

function validateNullableTimestamp(value, errorMessage) {
  if (value !== null && (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value))
  )) throw new Error(errorMessage);
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  }
  return value;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateKnownFormId() {
  return `morph_form_${Math.random().toString(36).slice(2, 10)}`;
}
