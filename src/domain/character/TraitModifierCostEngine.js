import { flattenEnabledTraitModifiers } from "./TraitModifiers.js";

export function applyTraitCostModifiers(baseCost, modifiers, options = {}) {
  return {
    baseCost,
    modifiers: flattenEnabledTraitModifiers(modifiers, options.traitLevels),
  };
}
