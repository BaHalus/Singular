import { validateCharacter } from "./Character.js";
import { createTraitModifier } from "./TraitModifiers.js";

const STATUSES = ["ready", "conflict"];

export function projectPowerTraitModifierIntegration(character) {
  validateCharacter(character);

  const candidates = new Map();
  for (const power of character.powers) {
    const modifier = createExternalModifier(power);
    if (modifier === null) continue;
    for (const traitId of power.memberTraitIds) {
      if (!candidates.has(traitId)) candidates.set(traitId, []);
      candidates.get(traitId).push({ power, modifier });
    }
  }

  const externalModifiersByTraitId = {};
  const applications = [];
  const diagnostics = [];
  for (const trait of character.traits) {
    const matches = candidates.get(trait.id) ?? [];
    if (matches.length > 1) {
      diagnostics.push({
        code: "trait-multiple-global-power-modifiers",
        severity: "warning",
        traitId: trait.id,
        powerIds: matches.map(item => item.power.id),
      });
      continue;
    }
    if (matches.length === 0) continue;

    const [{ power, modifier }] = matches;
    Object.defineProperty(externalModifiersByTraitId, trait.id, {
      value: [modifier],
      enumerable: true,
      configurable: false,
      writable: false,
    });
    applications.push({
      traitId: trait.id,
      powerId: power.id,
      powerName: power.name,
      valuePercent: power.powerModifier.valuePercent,
      modifier,
    });
  }

  const result = {
    status: diagnostics.length === 0 ? "ready" : "conflict",
    complete: diagnostics.length === 0,
    externalModifiersByTraitId,
    applications,
    diagnostics,
  };
  validatePowerTraitModifierIntegration(result);
  return deepFreeze(result);
}

export function validatePowerTraitModifierIntegration(value) {
  requireObject(value, "Power Trait modifier integration");
  if (!STATUSES.includes(value.status)) {
    throw new Error("Power Trait modifier integration status is invalid");
  }
  if (value.complete !== (value.status === "ready")) {
    throw new Error("Power Trait modifier integration complete flag is inconsistent");
  }
  requireObject(
    value.externalModifiersByTraitId,
    "Power Trait external modifiers",
  );
  if (!Array.isArray(value.applications) || !Array.isArray(value.diagnostics)) {
    throw new Error("Power Trait modifier integration arrays are invalid");
  }
  return true;
}

export function serializePowerTraitModifierIntegration(value) {
  validatePowerTraitModifierIntegration(value);
  return cloneValue(value);
}

function createExternalModifier(power) {
  const powerModifier = power.powerModifier;
  if (
    powerModifier === null ||
    powerModifier.valuePercent === null ||
    Object.is(powerModifier.valuePercent, 0)
  ) {
    return null;
  }

  const valuePercent = powerModifier.valuePercent;
  return createTraitModifier({
    id: `power:${power.id}:global-modifier`,
    name: powerModifier.name || power.name || "Global Power Modifier",
    kind: valuePercent < 0 ? "limitation" : "enhancement",
    valueType: "percentage",
    value: Math.abs(valuePercent),
    affects: "total",
    source: {
      type: "power-global-modifier",
      powerId: power.id,
      powerName: power.name,
      valuePercent,
    },
    notes: powerModifier.notes,
  });
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be object`);
  }
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
