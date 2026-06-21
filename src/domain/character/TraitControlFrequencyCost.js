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

const CONTROL_FREQUENCY_COST_STATUSES = [
  "ready",
  "incomplete",
  "conflict",
  "unsupported",
];
const PERCENTAGE_MODES = ["additive", "multiplicative"];
const ROUNDING_POLICIES = ["up", "down", "none"];
const ROUNDING_SOURCES = ["trait", "option"];
const ARITHMETIC_PRECISION_DIGITS = 12;

export function evaluateTraitControlFrequencyCost(trait, options = {}) {
  validateTrait(trait);
  const policy = normalizePolicy(trait, options);
  const modifierCost = evaluateTraitModifierCost(trait, {
    percentageMode: policy.percentageMode,
    rounding: "none",
  });
  const selfControl = serializeTraitSelfControl(trait.selfControl);
  const frequency = serializeTraitFrequency(trait.frequency);
  const adjustmentDiagnostics = createAdjustmentDiagnostics(selfControl);

  if (modifierCost.status !== "ready") {
    return deepFreeze(createPendingResult({
      traitId: trait.id,
      status: modifierCost.status,
      modifierCost,
      selfControl,
      frequency,
      policy,
      diagnostics: [
        {
          code: `trait-control-frequency-cost-modifier-${modifierCost.status}`,
          severity: modifierCost.status === "conflict" ? "warning" : "pending",
        },
        ...adjustmentDiagnostics,
      ],
    }));
  }

  const unsupportedDiagnostics = [];
  if (selfControl.status === "unsupported") {
    unsupportedDiagnostics.push({
      code: "trait-self-control-roll-unsupported",
      severity: "pending",
      roll: selfControl.roll,
    });
  }
  if (frequency.status === "unsupported") {
    unsupportedDiagnostics.push({
      code: "trait-frequency-roll-unsupported",
      severity: "pending",
      roll: frequency.roll,
    });
  }

  if (unsupportedDiagnostics.length > 0) {
    return deepFreeze(createPendingResult({
      traitId: trait.id,
      status: "unsupported",
      modifierCost,
      selfControl,
      frequency,
      policy,
      diagnostics: [
        ...unsupportedDiagnostics,
        ...adjustmentDiagnostics,
      ],
    }));
  }

  const conditionalMultiplier = normalizeArithmetic(
    selfControl.multiplier * frequency.multiplier,
  );
  const rawPoints = normalizeArithmetic(
    modifierCost.rawPoints * conditionalMultiplier,
  );
  const calculatedPoints = applyRounding(rawPoints, policy.rounding);
  const rounding = {
    policy: policy.rounding,
    source: policy.roundingSource,
    applied: !Object.is(rawPoints, calculatedPoints),
    input: rawPoints,
    output: calculatedPoints,
    difference: normalizeArithmetic(calculatedPoints - rawPoints),
  };

  const result = {
    traitId: trait.id,
    status: "ready",
    complete: true,
    modifierCost: serializeTraitModifierCost(modifierCost),
    selfControl,
    frequency,
    policy,
    conditionalMultiplier,
    rawPoints,
    calculatedPoints,
    rounding,
    diagnostics: adjustmentDiagnostics,
  };

  validateTraitControlFrequencyCost(result);
  return deepFreeze(result);
}

export function validateTraitControlFrequencyCost(result) {
  if (!isPlainObject(result)) {
    throw new Error("Trait control/frequency cost evaluation must be object");
  }
  if (typeof result.traitId !== "string" || result.traitId === "") {
    throw new Error("Trait control/frequency cost traitId must be non-empty string");
  }
  if (!CONTROL_FREQUENCY_COST_STATUSES.includes(result.status)) {
    throw new Error("Trait control/frequency cost status is invalid");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Trait control/frequency cost complete flag is inconsistent");
  }

  validateTraitModifierCost(result.modifierCost);
  validateTraitSelfControl(result.selfControl);
  validateTraitFrequency(result.frequency);
  validatePolicy(result.policy);

  if (result.status === "ready") {
    if (result.modifierCost.status !== "ready") {
      throw new Error("Ready Trait control/frequency cost requires ready modifier cost");
    }
    if (
      result.selfControl.status === "unsupported" ||
      result.frequency.status === "unsupported"
    ) {
      throw new Error("Ready Trait control/frequency cost cannot use unsupported rolls");
    }
    validateFiniteNumber(
      result.conditionalMultiplier,
      "Trait conditionalMultiplier must be finite number",
    );
    validateFiniteNumber(
      result.rawPoints,
      "Trait control/frequency rawPoints must be finite number",
    );
    validateFiniteNumber(
      result.calculatedPoints,
      "Trait control/frequency calculatedPoints must be finite number",
    );
    validateRounding(result.rounding);
  } else {
    for (const field of [
      "conditionalMultiplier",
      "rawPoints",
      "calculatedPoints",
      "rounding",
    ]) {
      if (result[field] !== null) {
        throw new Error(
          `Non-ready Trait control/frequency cost ${field} must be null`,
        );
      }
    }
  }

  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Trait control/frequency diagnostics must be array");
  }

  return true;
}

export function serializeTraitControlFrequencyCost(result) {
  validateTraitControlFrequencyCost(result);
  return cloneValue(result);
}

export function getTraitControlFrequencyCostStatuses() {
  return [...CONTROL_FREQUENCY_COST_STATUSES];
}

export function getTraitControlFrequencyRoundingPolicies() {
  return [...ROUNDING_POLICIES];
}

function createPendingResult({
  traitId,
  status,
  modifierCost,
  selfControl,
  frequency,
  policy,
  diagnostics,
}) {
  const result = {
    traitId,
    status,
    complete: false,
    modifierCost: serializeTraitModifierCost(modifierCost),
    selfControl: cloneValue(selfControl),
    frequency: cloneValue(frequency),
    policy,
    conditionalMultiplier: null,
    rawPoints: null,
    calculatedPoints: null,
    rounding: null,
    diagnostics,
  };
  validateTraitControlFrequencyCost(result);
  return result;
}

function createAdjustmentDiagnostics(selfControl) {
  if (selfControl.adjustment.status !== "unsupported") return [];
  return [{
    code: "trait-self-control-adjustment-unsupported",
    severity: "warning",
    type: selfControl.adjustment.type,
  }];
}

function normalizePolicy(trait, options) {
  if (!isPlainObject(options)) {
    throw new Error("Trait control/frequency cost options must be object");
  }
  const percentageMode = options.percentageMode ?? "additive";
  const hasRoundingOption = hasOwn(options, "rounding");
  const rounding = hasRoundingOption
    ? options.rounding
    : trait.roundCostDown ? "down" : "up";
  const policy = {
    percentageMode,
    rounding,
    roundingSource: hasRoundingOption ? "option" : "trait",
  };
  validatePolicy(policy);
  return deepFreeze(policy);
}

function validatePolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new Error("Trait control/frequency policy must be object");
  }
  if (!PERCENTAGE_MODES.includes(policy.percentageMode)) {
    throw new Error("Trait control/frequency percentage mode is invalid");
  }
  if (!ROUNDING_POLICIES.includes(policy.rounding)) {
    throw new Error("Trait control/frequency rounding policy is invalid");
  }
  if (!ROUNDING_SOURCES.includes(policy.roundingSource)) {
    throw new Error("Trait control/frequency rounding source is invalid");
  }
}

function validateRounding(rounding) {
  if (!isPlainObject(rounding)) {
    throw new Error("Trait control/frequency rounding must be object");
  }
  if (!ROUNDING_POLICIES.includes(rounding.policy)) {
    throw new Error("Trait control/frequency rounding policy is invalid");
  }
  if (!ROUNDING_SOURCES.includes(rounding.source)) {
    throw new Error("Trait control/frequency rounding source is invalid");
  }
  if (typeof rounding.applied !== "boolean") {
    throw new Error("Trait control/frequency rounding applied must be boolean");
  }
  validateFiniteNumber(rounding.input, "Trait rounding input must be finite");
  validateFiniteNumber(rounding.output, "Trait rounding output must be finite");
  validateFiniteNumber(
    rounding.difference,
    "Trait rounding difference must be finite",
  );
}

function applyRounding(value, policy) {
  const normalized = normalizeArithmetic(value);
  if (policy === "none") return normalized;
  if (policy === "up") return normalizeArithmetic(Math.ceil(normalized));
  return normalizeArithmetic(Math.floor(normalized));
}

function normalizeArithmetic(value) {
  validateFiniteNumber(value, "Trait cost arithmetic must be finite number");
  const normalized = Number(value.toFixed(ARITHMETIC_PRECISION_DIGITS));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function validateFiniteNumber(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(message);
  }
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
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
