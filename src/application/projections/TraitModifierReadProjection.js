import { evaluateTraitFinalCost } from "../../domain/character/TraitFinalCost.js";
import { createTrait } from "../../domain/character/Traits.js";

export function createTraitModifierReadProjection(traits = []) {
  if (!Array.isArray(traits)) {
    throw new Error("Trait modifier read projection requires traits array");
  }

  return deepFreeze(traits.map(input => projectTrait(createTrait(input))));
}

function projectTrait(trait) {
  const finalCost = evaluateTraitFinalCost(trait);
  const modifierCost = finalCost.modifierCost;

  return {
    traitId: trait.id,
    status: finalCost.status,
    baseCost: {
      status: modifierCost.baseCost.status,
      points: modifierCost.baseCost.calculatedPoints,
    },
    finalCost: {
      status: finalCost.status,
      points: finalCost.calculatedPoints,
    },
    modifiers: modifierCost.modifiers.map(modifier => ({
      id: modifier.id,
      name: modifier.name ?? modifier.id,
      kind: modifier.kind,
      value: modifier.value,
      affects: modifier.affects,
      enabled: modifier.enabled,
      levelMultiplier: modifier.levelMultiplier,
      sourceFormat: modifier.sourceFormat,
    })),
    breakdown: modifierCost.calculationBreakdown === null
      ? null
      : cloneValue(modifierCost.calculationBreakdown),
    diagnostics: cloneValue(finalCost.diagnostics),
  };
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
