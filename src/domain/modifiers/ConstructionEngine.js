import {
  createConstructionModifier,
  createModifierBreakdown,
  createModifierBreakdownStep,
  getModifierFrameworkSchemaVersion,
} from "./ModifierFrameworkModel.js";

const TARGETS = new Set(["base", "levels", "total", "baseCost", "baseWeight"]);
const PHASE_BY_OPERATION = Object.freeze({
  addition: "additive",
  multiplier: "own-factor",
  divisor: "own-factor",
  percentage: "percentage",
});
const PHASE_ORDER = Object.freeze({
  addition: 0,
  multiplier: 1,
  divisor: 1,
  percentage: 2,
});

export function calculateConstructionCost(input = {}) {
  requirePlainObject(input, "Construction input");
  const baseCost = requireFinite(input.baseCost, "Construction baseCost");
  const levelCost = input.levelCost === undefined
    ? 0
    : requireFinite(input.levelCost, "Construction levelCost");
  const levels = input.levels === undefined
    ? 0
    : requireNonNegativeInteger(input.levels, "Construction levels");
  const target = input.target ?? "total";
  if (!TARGETS.has(target)) {
    throw new Error("Construction target is invalid");
  }
  if (!Array.isArray(input.modifiers ?? [])) {
    throw new Error("Construction modifiers must be array");
  }

  const modifiers = (input.modifiers ?? []).map(createConstructionModifier);
  rejectDuplicateIds(modifiers);
  const ordered = modifiers
    .map((modifier, index) => ({ modifier, index }))
    .sort((left, right) =>
      PHASE_ORDER[left.modifier.operation] - PHASE_ORDER[right.modifier.operation] ||
      left.index - right.index
    );

  const steps = [];
  const diagnostics = [];
  let current = baseCost + levelCost * levels;

  steps.push(createModifierBreakdownStep({
    sequence: steps.length,
    stage: "construction",
    phase: "base-and-levels",
    ruleId: "construction:base-and-levels",
    inputValue: 0,
    outputValue: current,
    source: { baseCost, levelCost, levels, target },
  }));

  for (const { modifier, index } of ordered) {
    const phase = PHASE_BY_OPERATION[modifier.operation];
    const appliesToTarget =
      modifier.target === target ||
      (target !== "total" && modifier.target === "total");
    let reason = null;
    if (!modifier.enabled) {
      reason = "modifier-disabled";
    } else if (!appliesToTarget) {
      reason = `target-mismatch:${modifier.target}->${target}`;
    }

    const before = current;
    if (reason === null) {
      current = applyModifier(current, modifier);
    } else {
      diagnostics.push({
        code: reason.startsWith("target-mismatch")
          ? "CONSTRUCTION_TARGET_MISMATCH"
          : "CONSTRUCTION_MODIFIER_DISABLED",
        modifierId: modifier.id,
        sourceIndex: index,
        reason,
      });
    }

    steps.push(createModifierBreakdownStep({
      sequence: steps.length,
      stage: "construction",
      phase,
      ruleId: modifier.id,
      inputValue: before,
      outputValue: current,
      applied: reason === null,
      reason,
      source: {
        modifierId: modifier.id,
        operation: modifier.operation,
        target: modifier.target,
        sourceIndex: index,
        declaredSource: modifier.source,
      },
    }));
  }

  steps.push(createModifierBreakdownStep({
    sequence: steps.length,
    stage: "construction",
    phase: "normal-cost",
    ruleId: "construction:normal-cost",
    inputValue: current,
    outputValue: current,
    source: { target },
  }));

  const breakdown = createModifierBreakdown({
    normalCost: current,
    paidCost: null,
    steps,
    diagnostics,
  });

  return deepFreeze({
    schemaVersion: getModifierFrameworkSchemaVersion(),
    target,
    normalCost: current,
    breakdown,
    diagnostics: breakdown.diagnostics,
  });
}

function applyModifier(current, modifier) {
  switch (modifier.operation) {
    case "addition":
      return current + modifier.value;
    case "multiplier":
      return current * modifier.value;
    case "divisor":
      return current / modifier.value;
    case "percentage":
      return current * (1 + modifier.value / 100);
    default:
      throw new Error("Construction modifier operation is invalid");
  }
}

function rejectDuplicateIds(modifiers) {
  const ids = new Set();
  for (const modifier of modifiers) {
    if (ids.has(modifier.id)) {
      throw new Error(`Construction modifier id must be unique: ${modifier.id}`);
    }
    ids.add(modifier.id);
  }
}

function requireFinite(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be finite number`);
  }
  return value;
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be non-negative integer`);
  }
  return value;
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(`${label} must be plain object`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
