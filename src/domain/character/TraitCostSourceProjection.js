import { validateCharacter } from "./Character.js";
import {
  serializeTraitAlternativeGroupPolicies,
} from "./TraitAlternativeGroupPolicies.js";
import { serializeTrait } from "./Traits.js";

export function createTraitCostSourceProjection(character, options = {}) {
  validateCharacter(character);
  return {
    characterId: character.identity.id,
    percentageMode: options.percentageMode ?? "additive",
    traits: character.traits.map(projectTrait),
    groupPolicies: serializeTraitAlternativeGroupPolicies(
      character.traitAlternativeGroups,
    ),
  };
}

export function createTraitCostFingerprint(value) {
  const text = JSON.stringify(canonicalize(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createTraitCostSourceFingerprint(character, options = {}) {
  return createTraitCostFingerprint(
    createTraitCostSourceProjection(character, options),
  );
}

function projectTrait(trait) {
  const value = serializeTrait(trait);
  return {
    id: value.id,
    role: value.role,
    source: value.source,
    points: value.points,
    levels: value.levels,
    pointValue: {
      mode: value.pointValue.mode,
      basePoints: value.pointValue.basePoints,
      pointsPerLevel: value.pointValue.pointsPerLevel,
      levels: value.pointValue.levels,
      legacyPoints: value.pointValue.legacyPoints,
      declaredPoints: value.pointValue.declaredPoints,
      importedPoints: value.pointValue.importedPoints,
    },
    selfControl: value.selfControl ?? null,
    frequency: value.frequency ?? null,
    roundCostDown: value.roundCostDown ?? false,
    choices: value.choices ?? [],
    modifiers: value.modifiers,
    alternateGroupId: value.alternateGroupId,
    isPrimaryAlternative: value.isPrimaryAlternative,
  };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
}
