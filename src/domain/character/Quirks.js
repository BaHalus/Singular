import {
  createTraitRecord,
  validateTraitRecord,
  serializeTraitRecord,
} from "./TraitFields.js";

export function createQuirks(input = []) {
  const quirks = input.map(createQuirk);

  validateQuirks(quirks);

  return quirks;
}

export function createQuirk(input = {}) {
  return createTraitRecord(input, generateQuirkId);
}

export function validateQuirks(quirks) {
  if (!Array.isArray(quirks)) {
    throw new Error("Quirks must be an array");
  }

  for (const quirk of quirks) {
    validateQuirk(quirk);
  }

  return true;
}

export function validateQuirk(quirk) {
  return validateTraitRecord(quirk, "Quirk");
}

export function serializeQuirks(quirks) {
  validateQuirks(quirks);

  return quirks.map(item => serializeTraitRecord(item, "Quirk"));
}

function generateQuirkId() {
  return `quirk_${Math.random().toString(36).slice(2, 10)}`;
}
