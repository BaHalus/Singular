import {
  createTraitRecord,
  validateTraitRecord,
  serializeTraitRecord,
} from "./TraitFields.js";

export function createAdvantages(input = []) {
  const advantages = input.map(createAdvantage);

  validateAdvantages(advantages);

  return advantages;
}

export function createAdvantage(input = {}) {
  return createTraitRecord(input, generateAdvantageId);
}

export function validateAdvantages(advantages) {
  if (!Array.isArray(advantages)) {
    throw new Error("Advantages must be an array");
  }

  for (const advantage of advantages) {
    validateAdvantage(advantage);
  }

  return true;
}

export function validateAdvantage(advantage) {
  return validateTraitRecord(advantage, "Advantage");
}

export function serializeAdvantages(advantages) {
  validateAdvantages(advantages);

  return advantages.map(advantage => serializeTraitRecord(advantage, "Advantage"));
}

function generateAdvantageId() {
  return `adv_${Math.random().toString(36).slice(2, 10)}`;
}
