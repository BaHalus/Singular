import { createCharacter } from "./Character.js";
import { createTrait, serializeTrait, validateTrait } from "./Traits.js";
import {
  requireCalculatedTraitBaseCost,
  serializeTraitBaseCostCalculation,
} from "./TraitBaseCostCalculator.js";

export class TraitBaseCostOperationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TraitBaseCostOperationError";
    this.code = code;
    this.details = details;
  }
}

export function withTraitBaseCostCalculation(trait, options = {}) {
  validateTrait(trait);
  const calculation = requireCalculatedTraitBaseCost(trait.pointValue, options);
  const serialized = serializeTrait(trait);
  const nextTrait = createTrait({
    ...serialized,
    pointValue: {
      ...serialized.pointValue,
      calculatedPoints: calculation.calculatedPoints,
      baseCostCalculation: serializeTraitBaseCostCalculation(calculation),
    },
  });

  return Object.freeze({
    trait: nextTrait,
    calculation,
    changed: JSON.stringify(serialized) !== JSON.stringify(serializeTrait(nextTrait)),
  });
}

export function recalculateTraitBaseCost(character, traitId, options = {}) {
  if (!character || typeof character !== "object") {
    throw new Error("Character must be object");
  }
  if (typeof traitId !== "string" || traitId === "") {
    throw new Error("Trait id must be non-empty string");
  }

  const index = character.traits.findIndex(trait => trait.id === traitId);
  if (index < 0) {
    throw new TraitBaseCostOperationError(
      "TRAIT_NOT_FOUND",
      "Trait was not found for base cost recalculation",
      { traitId },
    );
  }

  const previous = character.traits[index];
  const applied = withTraitBaseCostCalculation(previous, options);
  const traits = [...character.traits];
  traits[index] = applied.trait;
  const executedAt = normalizeTimestamp(options.now);
  const nextCharacter = createCharacter({
    ...character,
    traits,
    metadata: { ...character.metadata, updatedAt: executedAt },
  });

  return Object.freeze({
    character: nextCharacter,
    trait: nextCharacter.traits[index],
    calculation: applied.calculation,
    changed: applied.changed,
    receipt: Object.freeze({
      id: options.operationId ?? generateOperationId(),
      operation: "trait-base-cost-recalculated",
      executedAt,
      characterId: character.identity.id,
      traitId,
      previousCalculatedPoints: previous.pointValue.calculatedPoints,
      calculatedPoints: applied.calculation.calculatedPoints,
      inputFingerprint: applied.calculation.inputFingerprint,
      rounding: Object.freeze({ ...applied.calculation.rounding }),
    }),
  });
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Trait base cost timestamp must be valid string, Date or null");
  }
  return value;
}

function generateOperationId() {
  return `trait_base_cost_${Math.random().toString(36).slice(2, 10)}`;
}
