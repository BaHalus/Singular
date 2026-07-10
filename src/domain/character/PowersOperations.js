import {
  createPower,
  createPowers,
  serializePower,
  validatePowers,
} from "./Powers.js";

export function addPower(powers, power) {
  validatePowers(powers);
  return createPowers([
    ...powers.map(serializePower),
    createPower(power),
  ]);
}

export function removePower(powers, powerId) {
  validatePowers(powers);
  const id = normalizeId(powerId, "Power id");
  return createPowers(
    powers
      .filter(power => power.id !== id)
      .map(serializePower),
  );
}

export function renamePower(powers, powerId, name) {
  return updatePower(powers, powerId, power => ({
    ...power,
    name: normalizeString(name, "Power name"),
  }));
}

export function updatePowerFields(powers, powerId, patch) {
  requirePlainObject(patch, "Power patch");
  return updatePower(powers, powerId, power => ({
    ...power,
    name: patch.name,
    source: patch.source,
    powerModifier: patch.powerModifier,
    talentTraitId: patch.talentTraitId,
    memberTraitIds: patch.memberTraitIds,
    tags: patch.tags,
    notes: patch.notes,
  }));
}

export function reorderPower(powers, powerId, targetIndex) {
  validatePowers(powers);
  const id = normalizeId(powerId, "Power id");
  if (!Number.isInteger(targetIndex)) {
    throw new Error("Power targetIndex must be an integer");
  }
  const sourceIndex = powers.findIndex(power => power.id === id);
  if (sourceIndex === -1) throw new Error("Power not found");
  if (targetIndex < 0 || targetIndex >= powers.length) {
    throw new Error("Power targetIndex is out of bounds");
  }
  const serialized = powers.map(serializePower);
  const [moved] = serialized.splice(sourceIndex, 1);
  serialized.splice(targetIndex, 0, moved);
  return createPowers(serialized);
}

export function updatePowerNotes(powers, powerId, notes) {
  return updatePower(powers, powerId, power => ({
    ...power,
    notes: normalizeString(notes, "Power notes"),
  }));
}

export function setPowerSource(powers, powerId, source) {
  return updatePower(powers, powerId, power => ({
    ...power,
    source: normalizeString(source, "Power source"),
  }));
}

export function setPowerModifier(powers, powerId, powerModifier) {
  return updatePower(powers, powerId, power => ({
    ...power,
    powerModifier,
  }));
}

export function setPowerTalentTrait(powers, powerId, talentTraitId) {
  if (talentTraitId !== null) {
    normalizeId(talentTraitId, "Power talentTraitId");
  }
  return updatePower(powers, powerId, power => ({
    ...power,
    talentTraitId,
  }));
}

export function addPowerMemberTrait(powers, powerId, traitId) {
  const normalizedTraitId = normalizeId(traitId, "Power member Trait id");
  return updatePower(powers, powerId, power => ({
    ...power,
    memberTraitIds: power.memberTraitIds.includes(normalizedTraitId)
      ? power.memberTraitIds
      : [...power.memberTraitIds, normalizedTraitId],
  }));
}

export function removePowerMemberTrait(powers, powerId, traitId) {
  const normalizedTraitId = normalizeId(traitId, "Power member Trait id");
  return updatePower(powers, powerId, power => ({
    ...power,
    memberTraitIds: power.memberTraitIds.filter(id => id !== normalizedTraitId),
  }));
}

export function addPowerTag(powers, powerId, tag) {
  const normalizedTag = normalizeString(tag, "Power tag");
  return updatePower(powers, powerId, power => ({
    ...power,
    tags: power.tags.includes(normalizedTag)
      ? power.tags
      : [...power.tags, normalizedTag],
  }));
}

export function removePowerTag(powers, powerId, tag) {
  const normalizedTag = normalizeString(tag, "Power tag");
  return updatePower(powers, powerId, power => ({
    ...power,
    tags: power.tags.filter(current => current !== normalizedTag),
  }));
}

function updatePower(powers, powerId, transform) {
  validatePowers(powers);
  const id = normalizeId(powerId, "Power id");
  return createPowers(powers.map(power => (
    power.id === id
      ? transform(serializePower(power))
      : serializePower(power)
  )));
}

function normalizeId(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeString(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function requirePlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must be a plain object`);
  }
}
