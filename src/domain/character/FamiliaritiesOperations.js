import {
  createFamiliarities,
  createFamiliarity,
  serializeFamiliarities,
  serializeFamiliarity,
  validateFamiliarities,
} from "./Familiarities.js";

const FAMILIARITY_PATCH_KEYS = Object.freeze([
  "externalIds",
  "name",
  "isNative",
  "importedCost",
  "reference",
  "modifiers",
  "prereqs",
  "notes",
  "tags",
  "importMeta",
  "raw",
]);

export function addFamiliarity(familiarities, familiarityInput) {
  validateFamiliarities(familiarities);
  return createFamiliarities([
    ...serializeFamiliarities(familiarities),
    clonePortableValue(familiarityInput),
  ]);
}

export function updateFamiliarity(familiarities, familiarityId, patch = {}) {
  validateFamiliarities(familiarities);
  const normalizedId = requireFamiliarityId(familiarityId);
  requirePlainObject(patch, "Familiarity patch must be an object");
  assertPatchKeys(patch, FAMILIARITY_PATCH_KEYS, "Familiarity patch has unsupported fields");

  const currentIndex = familiarities.findIndex(item => item.id === normalizedId);
  if (currentIndex < 0) throw new Error("Familiarity not found");

  const current = familiarities[currentIndex];
  const nextInput = {
    ...serializeFamiliarity(current),
    ...clonePortableValue(patch),
    id: current.id,
  };
  const nextFamiliarity = createFamiliarity(nextInput);
  const next = serializeFamiliarities(familiarities);
  next[currentIndex] = serializeFamiliarity(nextFamiliarity);
  return createFamiliarities(next);
}

export function removeFamiliarity(familiarities, familiarityId) {
  validateFamiliarities(familiarities);
  const normalizedId = requireFamiliarityId(familiarityId);
  const currentIndex = familiarities.findIndex(item => item.id === normalizedId);
  if (currentIndex < 0) throw new Error("Familiarity not found");
  return createFamiliarities(
    serializeFamiliarities(familiarities).filter(item => item.id !== normalizedId),
  );
}

export function reorderFamiliarity(familiarities, familiarityId, targetIndex) {
  validateFamiliarities(familiarities);
  const normalizedId = requireFamiliarityId(familiarityId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= familiarities.length) {
    throw new Error("Familiarity target index is invalid");
  }

  const currentIndex = familiarities.findIndex(item => item.id === normalizedId);
  if (currentIndex < 0) throw new Error("Familiarity not found");
  if (currentIndex === targetIndex) return familiarities;

  const next = serializeFamiliarities(familiarities);
  const [familiarity] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, familiarity);
  return createFamiliarities(next);
}

export function findFamiliarityById(familiarities, familiarityId) {
  validateFamiliarities(familiarities);
  const normalizedId = requireFamiliarityId(familiarityId);
  return familiarities.find(item => item.id === normalizedId) ?? null;
}

export function renameFamiliarity(familiarities, familiarityId, name) {
  return updateFamiliarity(familiarities, familiarityId, { name: String(name) });
}

export function setFamiliarityImportedCost(familiarities, familiarityId, importedCost) {
  return updateFamiliarity(familiarities, familiarityId, { importedCost });
}

export function updateFamiliarityNotes(familiarities, familiarityId, notes) {
  return updateFamiliarity(familiarities, familiarityId, { notes: String(notes) });
}

export function addFamiliarityTag(familiarities, familiarityId, tag) {
  const current = findFamiliarityById(familiarities, familiarityId);
  return current.tags.includes(tag)
    ? familiarities
    : updateFamiliarity(familiarities, familiarityId, { tags: [...current.tags, tag] });
}

export function removeFamiliarityTag(familiarities, familiarityId, tag) {
  const current = findFamiliarityById(familiarities, familiarityId);
  return updateFamiliarity(
    familiarities,
    familiarityId,
    { tags: current.tags.filter(existingTag => existingTag !== tag) },
  );
}

function requireFamiliarityId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Familiarity id must be a non-empty string");
  }
  return value;
}

function assertPatchKeys(patch, allowedKeys, message) {
  const allowed = new Set(allowedKeys);
  if (Object.keys(patch).some(key => !allowed.has(key))) {
    throw new Error(message);
  }
}

function clonePortableValue(value, seen = new WeakMap()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Familiarity operation values must be JSON portable");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error("Familiarity operation values must be JSON portable");
  }
  if (seen.has(value)) throw new Error("Familiarity operation values must not contain cycles");

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(clonePortableValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  requirePlainObject(value, "Familiarity operation value");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = clonePortableValue(item, seen);
  });
  seen.delete(value);
  return clone;
}

function requirePlainObject(value, errorMessage) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(errorMessage);
  }
}
