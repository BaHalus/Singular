import {
  createTrait,
  createTraits,
  serializeTrait,
  serializeTraits,
  validateTraits,
} from "./Traits.js";

const TRAIT_PATCH_KEYS = Object.freeze([
  "externalIds",
  "name",
  "notes",
  "tags",
  "points",
  "levels",
  "selfControl",
  "selfControlAdjustment",
  "frequency",
  "roundCostDown",
  "choices",
  "modifiers",
  "features",
  "weapons",
  "prereqs",
  "importMeta",
  "power",
  "alternateGroupId",
  "isPrimaryAlternative",
  "raw",
  "role",
  "source",
  "pointValue",
]);

export function addTrait(traits, traitInput) {
  validateTraits(traits);
  return createTraits([
    ...serializeTraits(traits),
    traitInput,
  ]);
}

export function updateTrait(traits, traitId, patch = {}) {
  validateTraits(traits);
  const normalizedId = requireTraitId(traitId);
  requirePlainObject(patch, "Trait patch must be an object");
  assertPatchKeys(patch);

  const currentIndex = traits.findIndex(trait => trait.id === normalizedId);
  if (currentIndex < 0) throw new Error("Trait not found");

  const current = traits[currentIndex];
  const nextInput = {
    ...serializeTrait(current),
    ...clonePortableValue(patch),
    id: current.id,
    source: patch.source === undefined
      ? current.source
      : { ...current.source, ...patch.source },
    pointValue: patch.pointValue === undefined
      ? current.pointValue
      : { ...current.pointValue, ...patch.pointValue },
  };
  const nextTrait = createTrait(nextInput);
  const next = serializeTraits(traits);
  next[currentIndex] = serializeTrait(nextTrait);
  return createTraits(next);
}

export function removeTrait(traits, traitId) {
  validateTraits(traits);
  const normalizedId = requireTraitId(traitId);
  const currentIndex = traits.findIndex(trait => trait.id === normalizedId);
  if (currentIndex < 0) throw new Error("Trait not found");
  return createTraits(
    serializeTraits(traits).filter(trait => trait.id !== normalizedId),
  );
}

export function reorderTrait(traits, traitId, targetIndex) {
  validateTraits(traits);
  const normalizedId = requireTraitId(traitId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= traits.length) {
    throw new Error("Trait target index is invalid");
  }

  const currentIndex = traits.findIndex(trait => trait.id === normalizedId);
  if (currentIndex < 0) throw new Error("Trait not found");
  if (currentIndex === targetIndex) return traits;

  const next = serializeTraits(traits);
  const [trait] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, trait);
  return createTraits(next);
}

export function findTraitById(traits, traitId) {
  validateTraits(traits);
  const normalizedId = requireTraitId(traitId);
  return traits.find(trait => trait.id === normalizedId) ?? null;
}

function requireTraitId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Trait id must be a non-empty string");
  }
  return value;
}

function assertPatchKeys(patch) {
  const allowed = new Set(TRAIT_PATCH_KEYS);
  if (Object.keys(patch).some(key => !allowed.has(key))) {
    throw new Error("Trait patch has unsupported fields");
  }
  if (patch.source !== undefined) {
    requirePlainObject(patch.source, "Trait source patch must be an object");
  }
  if (patch.pointValue !== undefined) {
    requirePlainObject(patch.pointValue, "Trait pointValue patch must be an object");
  }
}

function clonePortableValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) throw new Error("Trait operation values must not contain cycles");

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(clonePortableValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  requirePlainObject(value, "Trait operation value");
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