import {
  createTraitRecord,
  validateTraitRecord,
  serializeTraitRecord,
} from "./TraitFields.js";
import {
  createTraitPointValue,
  validateTraitPointValue,
  serializeTraitPointValue,
} from "./TraitPointValue.js";

const KNOWN_TRAIT_ROLES = [
  "advantage",
  "perk",
  "disadvantage",
  "quirk",
];

const LEGACY_COLLECTIONS = [
  { key: "advantages", role: "advantage", label: "Advantage" },
  { key: "perks", role: "perk", label: "Perk" },
  { key: "disadvantages", role: "disadvantage", label: "Disadvantage" },
  { key: "quirks", role: "quirk", label: "Quirk" },
];

export function createTraits(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Traits must be an array");
  }

  const traits = input.map(item => createTrait(item));
  validateTraits(traits);
  return deepFreeze(traits);
}

export function createTrait(input = {}, explicitRole = null) {
  if (!isPlainObject(input)) {
    throw new Error("Trait must be an object");
  }

  const clonedInput = cloneValue(input);
  const role = normalizeTraitRole(explicitRole ?? clonedInput.role ?? "unknown");
  const record = createTraitRecord(clonedInput, () => generateTraitId(role));
  const source = normalizeTraitSource(clonedInput.source, clonedInput.importMeta);
  const trait = {
    ...record,
    role,
    source,
    pointValue: createTraitPointValue(clonedInput.pointValue, {
      points: record.points,
      levels: record.levels,
      sourceKind: source.kind,
    }),
  };

  validateTrait(trait);
  return deepFreeze(trait);
}

export function createTraitsFromCharacterInput(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Character trait input must be an object");
  }

  const hasCanonicalTraits = hasOwn(input, "traits") && input.traits != null;
  let traits = hasCanonicalTraits ? createTraits(input.traits) : createTraits();

  for (const descriptor of LEGACY_COLLECTIONS) {
    if (!hasOwn(input, descriptor.key) || input[descriptor.key] == null) continue;
    if (!Array.isArray(input[descriptor.key])) {
      throw new Error(`${capitalize(descriptor.key)} must be an array`);
    }

    const current = traits.filter(trait => trait.role === descriptor.role);
    const currentById = new Map(current.map(trait => [trait.id, trait]));
    const incoming = input[descriptor.key].map(item => {
      const existing = isPlainObject(item) && item.id
        ? currentById.get(item.id)
        : null;
      const mergedInput = existing
        ? mergeLegacyTraitInput(existing, item)
        : item;

      return createTrait(mergedInput, descriptor.role);
    });

    if (!hasCanonicalTraits || !legacyRoleEquivalent(current, incoming, descriptor)) {
      traits = [
        ...traits.filter(trait => trait.role !== descriptor.role),
        ...incoming,
      ];
    }
  }

  return createTraits(traits);
}

export function validateTraits(traits) {
  if (!Array.isArray(traits)) {
    throw new Error("Traits must be an array");
  }

  const ids = new Set();
  for (const trait of traits) {
    validateTrait(trait);
    if (ids.has(trait.id)) {
      throw new Error(`Duplicate Trait id: ${trait.id}`);
    }
    ids.add(trait.id);
  }

  return true;
}

export function validateTrait(trait) {
  validateTraitRecord(trait, "Trait");

  if (typeof trait.role !== "string" || trait.role === "") {
    throw new Error("Trait role must be non-empty string");
  }
  if (!isPlainObject(trait.source)) {
    throw new Error("Trait source must be object");
  }
  validateTraitSource(trait.source);
  validateTraitPointValue(trait.pointValue);

  return true;
}

export function serializeTraits(traits) {
  validateTraits(traits);
  return traits.map(serializeTrait);
}

export function serializeTrait(trait) {
  validateTrait(trait);
  return {
    ...serializeTraitRecord(trait, "Trait"),
    role: trait.role,
    source: cloneValue(trait.source),
    pointValue: serializeTraitPointValue(trait.pointValue),
  };
}

export function projectTraitsByRole(traits) {
  validateTraits(traits);
  const projected = Object.fromEntries(
    LEGACY_COLLECTIONS.map(descriptor => [descriptor.key, []]),
  );

  for (const descriptor of LEGACY_COLLECTIONS) {
    projected[descriptor.key] = traits
      .filter(trait => trait.role === descriptor.role)
      .map(trait => serializeTraitRecord(trait, descriptor.label));
  }

  return projected;
}

export function validateTraitProjections(traits, projections) {
  validateTraits(traits);
  if (!isPlainObject(projections)) {
    throw new Error("Trait projections must be object");
  }

  const expected = projectTraitsByRole(traits);
  for (const descriptor of LEGACY_COLLECTIONS) {
    const actual = projections[descriptor.key];
    if (!Array.isArray(actual)) {
      throw new Error(`${capitalize(descriptor.key)} must be an array`);
    }
    if (canonicalStringify(actual) !== canonicalStringify(expected[descriptor.key])) {
      throw new Error(`Trait projection ${descriptor.key} diverges from canonical traits`);
    }
  }

  return true;
}

export function getKnownTraitRoles() {
  return [...KNOWN_TRAIT_ROLES];
}

export function isKnownTraitRole(role) {
  return KNOWN_TRAIT_ROLES.includes(role);
}

function mergeLegacyTraitInput(existing, incoming) {
  return {
    ...serializeTrait(existing),
    ...cloneValue(incoming),
  };
}

function legacyRoleEquivalent(current, incoming, descriptor) {
  const currentProjection = current.map(trait => (
    serializeTraitRecord(trait, descriptor.label)
  ));
  const incomingProjection = incoming.map(trait => (
    serializeTraitRecord(trait, descriptor.label)
  ));

  return canonicalStringify(currentProjection) === canonicalStringify(incomingProjection);
}

function normalizeTraitRole(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Trait role must be non-empty string");
  }
  return value.trim();
}

function normalizeTraitSource(source, importMeta) {
  if (source !== undefined && source !== null) {
    if (!isPlainObject(source)) {
      throw new Error("Trait source must be object");
    }
    const normalized = {
      ...cloneValue(source),
      kind: normalizeSourceString(source.kind ?? "unknown", "kind"),
      provider: normalizeNullableSourceString(source.provider, "provider"),
      format: normalizeNullableSourceString(source.format, "format"),
      reference: normalizeNullableSourceString(source.reference, "reference"),
      version: normalizeSourceVersion(source.version),
    };
    validateTraitSource(normalized);
    return normalized;
  }

  const provider = isPlainObject(importMeta) && typeof importMeta.source === "string"
    ? importMeta.source
    : null;

  return {
    kind: provider === null ? "singular" : "imported",
    provider,
    format: null,
    reference: isPlainObject(importMeta)
      ? normalizeNullableSourceString(importMeta.reference, "reference")
      : null,
    version: null,
  };
}

function validateTraitSource(source) {
  normalizeSourceString(source.kind, "kind");
  normalizeNullableSourceString(source.provider, "provider");
  normalizeNullableSourceString(source.format, "format");
  normalizeNullableSourceString(source.reference, "reference");
  normalizeSourceVersion(source.version);
  return true;
}

function normalizeSourceString(value, field) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`Trait source ${field} must be non-empty string`);
  }
  return value;
}

function normalizeNullableSourceString(value, field) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`Trait source ${field} must be string or null`);
  }
  return value;
}

function normalizeSourceVersion(value) {
  if (value === undefined || value === null) return null;
  if (!["string", "number"].includes(typeof value)) {
    throw new Error("Trait source version must be string, number or null");
  }
  return value;
}

function generateTraitId(role) {
  const prefix = {
    advantage: "adv",
    perk: "perk",
    disadvantage: "disadv",
    quirk: "quirk",
  }[role] ?? "trait";
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function cloneValue(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    for (const item of value) result.push(cloneValue(item, seen));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneValue(item, seen);
    }
    return result;
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
