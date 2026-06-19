import {
  createTraitRecord,
  validateTraitRecord,
  serializeTraitRecord,
} from "./TraitFields.js";

export function createDisadvantages(input = []) {
  const disadvantages = input.map(createDisadvantage);

  validateDisadvantages(disadvantages);

  return disadvantages;
}

export function createDisadvantage(input = {}) {
  return createTraitRecord(input, generateDisadvantageId);
}

export function validateDisadvantages(disadvantages) {
  if (!Array.isArray(disadvantages)) {
    throw new Error("Disadvantages must be an array");
  }

  for (const disadvantage of disadvantages) {
    validateDisadvantage(disadvantage);
  }

  return true;
}

export function validateDisadvantage(disadvantage) {
  return validateTraitRecord(disadvantage, "Disadvantage");
}

export function serializeDisadvantages(disadvantages) {
  validateDisadvantages(disadvantages);

  return disadvantages.map(disadvantage => serializeTraitRecord(disadvantage, "Disadvantage"));
}

function generateDisadvantageId() {
  return `disadv_${Math.random().toString(36).slice(2, 10)}`;
}
