import {
  evaluateTraitModifierCost,
  serializeTraitModifierCost,
  validateTraitModifierCost,
} from "./TraitModifierCost.js";
import {
  serializeTraitFrequency,
  serializeTraitSelfControl,
  validateTraitFrequency,
  validateTraitSelfControl,
} from "./TraitControl.js";
import { validateTrait } from "./Traits.js";

const FINAL_COST_STATUSES = [
  "ready",
  "incomplete",
  "conflict",
  "unsupported",
];
const PERCENTAGE_MODES = ["additive", "multiplicative"];
const ROUNDING_POLICIES = ["up", "down"];
const ARITHMETIC_PRECISION_DIGITS = 12;

export function evaluateTraitFinalCost(trait, options = {}) {
  validateTrait(trait);
  const policy = normalizePolicy(trait, options);
  const modifierCost = evaluateTraitModifierCost(trait, {
    percentageMode: policy.percentageMode,
    rounding: "none",
    externalModifiers: options.externalModifiers ?? [],
  });

  if (modifierCost.status !== "ready") {
    return deepFreeze(createPendingResult({
      trait,
      status: modifierCost.status,
      policy,
      modifierCost,
      diagnostics: [{
        code: `trait-final-cost-modifiers-${modifierCost.status}`,
        severity: modifierCost.status === "conflict" ? "warning" : "pending",
      }],
    }));
  }

  const unsupportedControls = [];
  if (trait.selfControl.status === "unsupported") {
    unsupportedControls.push("selfControl");
  }
  if (trait.frequency.status === "unsupported") {
    unsupportedControls.push("frequency");
  }

  if (unsupportedControls.length > 0) {
    return deepFreeze(createPendingResult({
      trait,
      status: "unsupported",
      policy,
      modifierCost,
      diagnostics: unsupportedControls.map(field => ({
        code: `trait-final-cost-${field}-unsupported`,
        severity: "pending",
        field,
      })),
    }));
  }

  const beforeControl = modifierCost.rawPoints;
  const selfControlMultiplier = trait.selfControl.multiplier;
  const afterSelfControl = normalizeArithmetic(
    beforeControl * selfControlMultiplier,
  );
  const frequencyMultiplier = trait.frequency.multiplier;
  const rawPoints = normalizeArithmetic(
    afterSelfControl * frequencyMultiplier,
  );
  const calculatedPoints = applyRounding(rawPoints, policy.rounding);
  const rounding = {
    policy: policy.rounding,
    applied: !Object.is(rawPoints, calculatedPoints),
    input: rawPoints,
    output: calculatedPoints,
    difference: normalizeArithmetic(calculatedPoints - rawPoints),
  };

  const result = {
    traitId: trait.id,
    status: "ready",
    complete: true,
    policy,
    modifierCost: serializeTraitModifierCost(modifierCost),
    selfControl: serializeTraitSelfControl(trait.selfControl),
    frequency: serializeTraitFrequency(trait.frequency),
    beforeControl,
    selfControlMultiplier,
    afterSelfControl,
    frequencyMultiplier,
    rawPoints,
    calculatedPoints,
    rounding,
    diagnostics: [],
  };

  validateTraitFinalCost(result);
  return deepFreeze(result);
}

export function validateTraitFinalCost(result) {
  if (!isPlainObject(result)) {
    throw new Error("Trait final cost evaluation must be object");
  }
  if (typeof result.traitId !== "string" || result.traitId === "") {
    throw new Error("Trait final cost traitId must be non-empty string");
  }
  if (!FINAL_COST_STATUSES.includes(result.status)) {
    throw new Error("Trait final cost status is invalid");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Trait final cost complete flag is inconsistent");
  }

  validatePolicy(result.policy);
  validateTraitModifierCost(result.modifierCost);
  validateTraitSelfControl(result.selfControl);
  validateTraitFrequency(result.frequency);

  if (result.status === "ready") {
    for (const field of [
      "beforeControl",
      "selfControlMultiplier",
      "afterSelfControl",
      "frequencyMultiplier",
      "rawPoints",
      "calculatedPoints",
    ]) {
      validateFiniteNumber(
        result[field],
        `Trait final cost ${field} must be finite number`,
      );
    }
    validateRounding(result.rounding);

    if (result.modifierCost.status !== "ready") {
      throw new Error("Ready Trait final cost requires ready modifier cost");
    }
    if (
      result.selfControl.status === "unsupported" ||
      result.frequency.status === "unsupported"
    ) {
      throw new Error("Ready Trait final cost cannot use unsupported controls");
    }

    const expectedAfterSelfControl = normalizeArithmetic(
      result.beforeControl * result.selfControlMultiplier,
    );
    const expectedRaw = normalizeArithmetic(
      expectedAfterSelfControl * result.frequencyMultiplier,
    );
    const expectedCalculated = applyRounding(expectedRaw, result.policy.rounding);
    if (
      !Object.is(result.beforeControl, result.modifierCost.rawPoints) ||
      !Object.is(result.selfControlMultiplier, result.selfControl.multiplier) ||
      !Object.is(result.afterSelfControl, expectedAfterSelfControl) ||
      !Object.is(result.frequencyMultiplier, result.frequency.multiplier) ||
      !Object.is(result.rawPoints, expectedRaw) ||
      !Object.is(result.calculatedPoints, expectedCalculated)
    ) {
      throw new Error("Trait final cost evaluation is stale or inconsistent");
    }
  } else {
    for (const field of [
      "beforeControl",
      "selfControlMultiplier",
      "afterSelfControl",
      "frequencyMultiplier",
      "rawPoints",
      "calculatedPoints",
      "rounding",
    ]) {
      if (result[field] !== null) {
        throw new Error(`Non-ready Trait final cost ${field} must be null`);
      }
    }
  }

  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Trait final cost diagnostics must be array");
  }
  return true;
}

export function serializeTraitFinalCost(result) {
  validateTraitFinalCost(result);
  return cloneValue(result);
}

export function getTraitFinalCostStatuses() {
  return [...FINAL_COST_STATUSES];
}

function createPendingResult({
  trait,
  status,
  policy,
  modifierCost,
  diagnostics,
}) {
  const result = {
    traitId: trait.id,
    status,
    complete: false,
    policy,
    modifierCost: serializeTraitModifierCost(modifierCost),
    selfControl: serializeTraitSelfControl(trait.selfControl),
    frequency: serializeTraitFrequency(trait.frequency),
    beforeControl: null,
    selfControlMultiplier: null,
    afterSelfControl: null,
    frequencyMultiplier: null,
    rawPoints: null,
    calculatedPoints: null,
    rounding: null,
    diagnostics: cloneValue(diagnostics),
  };
  validateTraitFinalCost(result);
  return result;
}

function normalizePolicy(trait, options) {
  if (!isPlainObject(options)) {
    throw new Error("Trait final cost options must be object");
  }
  const policy = {
    percentageMode: options.percentageMode ?? "additive",
    rounding: trait.roundCostDown ? "down" : "up",
    roundCostDown: trait.roundCostDown,
  };
  validatePolicy(policy);
  return policy;
}

function validatePolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new Error("Trait final cost policy must be object");
  }
  if (!PERCENTAGE_MODES.includes(policy.percentageMode)) {
    throw new Error("Trait final cost percentage mode is invalid");
  }
  if (!ROUNDING_POLICIES.includes(policy.rounding)) {
    throw new Error("Trait final cost rounding policy is invalid");
  }
  if (typeof policy.roundCostDown !== "boolean") {
    throw new Error("Trait final cost roundCostDown must be boolean");
  }
  const expectedRounding = policy.roundCostDown ? "down" : "up";
  if (policy.rounding !== expectedRounding) {
    throw new Error("Trait final cost rounding policy is inconsistent");
  }
}

function validateRounding(rounding) {
  if (!isPlainObject(rounding)) {
    throw new Error("Trait final cost rounding must be object");
  }
  if (!ROUNDING_POLICIES.includes(rounding.policy)) {
    throw new Error("Trait final cost rounding policy is invalid");
  }
  if (typeof rounding.applied !== "boolean") {
    throw new Error("Trait final cost rounding applied must be boolean");
  }
  for (const field of ["input", "output", "difference"]) {
    validateFiniteNumber(
      rounding[field],
      `Trait final cost rounding ${field} must be finite number`,
    );
  }
  const expectedOutput = applyRounding(rounding.input, rounding.policy);
  if (
    !Object.is(rounding.output, expectedOutput) ||
    rounding.applied !== !Object.is(rounding.input, expectedOutput) ||
    !Object.is(
      rounding.difference,
      normalizeArithmetic(rounding.output - rounding.input),
    )
  ) {
    throw new Error("Trait final cost rounding is stale or inconsistent");
  }
}

function applyRounding(value, policy) {
  const normalized = normalizeArithmetic(value);
  return normalizeArithmetic(
    policy === "down" ? Math.floor(normalized) : Math.ceil(normalized),
  );
}

function validateFiniteNumber(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(message);
  }
}

function normalizeArithmetic(value) {
  if (!Number.isFinite(value)) return value;
  const normalized = Number(value.toFixed(ARITHMETIC_PRECISION_DIGITS));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function cloneValue(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    for (const item of value) result.push(cloneValue(item, seen));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneValue(item, seen);
    }
    return result;
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
