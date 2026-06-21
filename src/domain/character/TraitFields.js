import {
  createTraitModifiers,
  validateTraitModifiers,
  serializeTraitModifiers,
} from "./TraitModifiers.js";

export function createTraitRecord(input = {}, generateId) {
  const id = input.id ?? generateId();
  return {
    id,
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Trait tags must be array"),

    points: normalizeNullableNumber(input.points),
    levels: normalizeNullableNumber(input.levels),

    modifiers: createTraitModifiers(input.modifiers, {
      traitId: id,
      source: inferModifierSource(input),
    }),
    features: normalizeArray(input.features, "Trait features must be array"),
    weapons: normalizeArray(input.weapons, "Trait weapons must be array"),
    prereqs: input.prereqs ?? null,

    importMeta: input.importMeta ?? null,
    power: input.power ?? null,
    alternateGroupId: input.alternateGroupId ?? null,
    isPrimaryAlternative: input.isPrimaryAlternative ?? null,

    raw: input.raw ?? null,
  };
}

export function validateTraitRecord(record, label) {
  if (!record || typeof record !== "object") {
    throw new Error(`${label} must be an object`);
  }

  if (!record.id) {
    throw new Error(`${label} must have id`);
  }

  if (!isPlainObject(record.externalIds)) {
    throw new Error(`${label} externalIds must be object`);
  }

  if (typeof record.name !== "string") {
    throw new Error(`${label} name must be string`);
  }

  if (typeof record.notes !== "string") {
    throw new Error(`${label} notes must be string`);
  }

  if (!Array.isArray(record.tags)) {
    throw new Error(`${label} tags must be array`);
  }

  validateNullableNumber(record.points, `${label} points must be number or null`);
  validateNullableNumber(record.levels, `${label} levels must be number or null`);

  validateTraitModifiers(record.modifiers);

  if (!Array.isArray(record.features)) {
    throw new Error(`${label} features must be array`);
  }

  if (!Array.isArray(record.weapons)) {
    throw new Error(`${label} weapons must be array`);
  }

  if (record.prereqs !== null && !isPlainObject(record.prereqs)) {
    throw new Error(`${label} prereqs must be object or null`);
  }

  if (record.importMeta !== null && !isPlainObject(record.importMeta)) {
    throw new Error(`${label} importMeta must be object or null`);
  }

  if (record.power !== null && !isPlainObject(record.power)) {
    throw new Error(`${label} power must be object or null`);
  }

  if (
    record.alternateGroupId !== null &&
    typeof record.alternateGroupId !== "string"
  ) {
    throw new Error(`${label} alternateGroupId must be string or null`);
  }

  if (
    record.isPrimaryAlternative !== null &&
    typeof record.isPrimaryAlternative !== "boolean"
  ) {
    throw new Error(`${label} isPrimaryAlternative must be boolean or null`);
  }

  return true;
}

export function serializeTraitRecord(record, label) {
  validateTraitRecord(record, label);

  return {
    id: record.id,
    externalIds: { ...record.externalIds },
    name: record.name,
    notes: record.notes,
    tags: [...record.tags],

    points: record.points,
    levels: record.levels,

    modifiers: serializeTraitModifiers(record.modifiers),
    features: [...record.features],
    weapons: [...record.weapons],
    prereqs: record.prereqs,

    importMeta: record.importMeta,
    power: record.power,
    alternateGroupId: record.alternateGroupId,
    isPrimaryAlternative: record.isPrimaryAlternative,

    raw: record.raw,
  };
}

function inferModifierSource(input) {
  if (isPlainObject(input.source)) return input.source;
  const provider = isPlainObject(input.importMeta) && typeof input.importMeta.source === "string"
    ? input.importMeta.source
    : null;
  return {
    kind: provider === null ? "singular" : "imported",
    provider,
    format: null,
    reference: isPlainObject(input.importMeta) && typeof input.importMeta.reference === "string"
      ? input.importMeta.reference
      : null,
    version: null,
  };
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Trait externalIds must be object");
  }

  return { ...externalIds };
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());

    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function validateNullableNumber(value, errorMessage) {
  if (value !== null && (typeof value !== "number" || Number.isNaN(value))) {
    throw new Error(errorMessage);
  }
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}
