import {
  evaluateTraitBaseCost,
  serializeTraitBaseCost,
} from "./TraitBaseCost.js";
import { applyTraitCostModifiers } from "./TraitModifierCostEngine.js";
import { createTrait, serializeTrait, validateTrait } from "./Traits.js";
import { reconcileTraitPointValue } from "./TraitPointValue.js";

const STATUSES = ["ready", "incomplete", "conflict", "unsupported"];

export function evaluateTraitModifiedCost(trait, options = {}) {
  validateTrait(trait);
  const baseCost = evaluateTraitBaseCost(trait);
  if (baseCost.status !== "ready") {
    return deepFreeze({
      traitId: trait.id,
      status: baseCost.status,
      complete: false,
      baseCost: serializeTraitBaseCost(baseCost),
      contributions: [],
      aggregates: null,
      rawPoints: null,
      calculatedPoints: null,
      rounding: { policy: "none", applied: false },
      diagnostics: [{
        code: "trait-modified-cost-base-not-ready",
        severity: "pending",
        baseStatus: baseCost.status,
      }],
      policy: policySnapshot(options),
    });
  }

  const applied = applyTraitCostModifiers(baseCost, trait.modifiers, {
    ...options,
    traitLevels: trait.pointValue.levels,
  });
  const ready = applied.status === "ready";
  const result = {
    traitId: trait.id,
    status: applied.status,
    complete: ready,
    baseCost: serializeTraitBaseCost(baseCost),
    contributions: applied.contributions,
    aggregates: applied.aggregates,
    rawPoints: applied.rawPoints,
    calculatedPoints: ready ? applied.rawPoints : null,
    rounding: { policy: "none", applied: false },
    diagnostics: applied.diagnostics,
    policy: applied.policy,
  };
  validateTraitModifiedCost(result);
  return deepFreeze(result);
}

export function withTraitCalculatedModifiedCost(trait, options = {}) {
  const evaluation = evaluateTraitModifiedCost(trait, options);
  if (evaluation.status !== "ready") {
    throw new Error(
      `Trait modified cost requires ready status, received ${evaluation.status}`,
    );
  }
  const serialized = serializeTrait(trait);
  const nextTrait = createTrait({
    ...serialized,
    pointValue: {
      ...serialized.pointValue,
      calculatedPoints: evaluation.calculatedPoints,
    },
  });
  return deepFreeze({
    trait: nextTrait,
    evaluation,
    reconciliation: reconcileTraitPointValue(nextTrait.pointValue),
  });
}

export function validateTraitModifiedCost(result) {
  if (!isPlainObject(result)) throw new Error("Trait modified cost must be object");
  if (typeof result.traitId !== "string" || result.traitId === "") {
    throw new Error("Trait modified cost traitId is required");
  }
  if (!STATUSES.includes(result.status)) {
    throw new Error("Trait modified cost status is invalid");
  }
  if (typeof result.complete !== "boolean") {
    throw new Error("Trait modified cost complete must be boolean");
  }
  if (!Array.isArray(result.contributions)) {
    throw new Error("Trait modified cost contributions must be array");
  }
  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Trait modified cost diagnostics must be array");
  }
  nullableNumber(result.rawPoints, "Trait modified cost rawPoints");
  nullableNumber(
    result.calculatedPoints,
    "Trait modified cost calculatedPoints",
  );
  if (result.status === "ready") {
    if (!result.complete || result.calculatedPoints === null) {
      throw new Error("Ready Trait modified cost requires calculatedPoints");
    }
  } else if (result.rawPoints !== null || result.calculatedPoints !== null) {
    throw new Error("Non-ready Trait modified cost cannot expose points");
  }
  return true;
}

export function serializeTraitModifiedCost(result) {
  validateTraitModifiedCost(result);
  return cloneValue(result);
}

export function getTraitModifiedCostStatuses() {
  return [...STATUSES];
}

function policySnapshot(options) {
  return {
    percentagePolicy: options.percentagePolicy ?? "additive",
    limitationFloor: options.limitationFloor === undefined
      ? -80
      : options.limitationFloor,
  };
}

function nullableNumber(value, label) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${label} must be finite number or null`);
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
