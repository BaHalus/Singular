import {
  createTraitRecord,
  validateTraitRecord,
  serializeTraitRecord,
} from "./TraitFields.js";

export function createPerks(input = []) {
  const perks = input.map(createPerk);

  validatePerks(perks);

  return perks;
}

export function createPerk(input = {}) {
  return createTraitRecord(input, generatePerkId);
}

export function validatePerks(perks) {
  if (!Array.isArray(perks)) {
    throw new Error("Perks must be an array");
  }

  for (const perk of perks) {
    validatePerk(perk);
  }

  return true;
}

export function validatePerk(perk) {
  return validateTraitRecord(perk, "Perk");
}

export function serializePerks(perks) {
  validatePerks(perks);

  return perks.map(perk => serializeTraitRecord(perk, "Perk"));
}

function generatePerkId() {
  return `perk_${Math.random().toString(36).slice(2, 10)}`;
}
