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
