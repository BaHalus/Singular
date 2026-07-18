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

  const components = createComponents({ baseCost, levelCost, levels, target });
  const steps = [];
  const diagnostics = [];
  const percentageContributions = [];
  let percentageApplicationInput = null;
  let percentageComponentsBefore = null;
  let current = evaluateComponents(components);

  steps.push(createModifierBreakdownStep({
    sequence: steps.length,
    stage: "construction",
    phase: "base-and-levels",
    ruleId: "construction:base-and-levels",
    inputValue: 0,
    outputValue: current,
    source: {
      baseCost,
      levelCost,
      levels,
      target,
      components: snapshotComponents(components),
    },
  }));

  for (const { modifier, index } of ordered) {
    const phase = PHASE_BY_OPERATION[modifier.operation];
    const componentTargets = resolveComponentTargets(target, modifier);
    let reason = null;
    if (!modifier.enabled) {
      reason = "modifier-disabled";
    } else if (componentTargets.length === 0) {
      reason = `target-mismatch:${modifier.target}->${target}`;
    }

    const before = current;
    if (reason === null) {
      if (modifier.operation === "percentage" && percentageApplicationInput === null) {
        percentageApplicationInput = current;
        percentageComponentsBefore = snapshotComponents(components);
      }
      applyModifier(components, componentTargets, modifier);
      if (modifier.operation === "percentage") {
        percentageContributions.push({
          modifierId: modifier.id,
          value: modifier.value,
          target: modifier.target,
          componentTargets,
          sourceIndex: index,
          declaredSource: modifier.source,
        });
      } else {
        current = evaluateComponents(components);
      }
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
        modifierValue: modifier.value,
        target: modifier.target,
        componentTargets,
        sourceIndex: index,
        declaredSource: modifier.source,
        transformation: modifier.operation === "percentage"
          ? "percentage-contribution"
          : "direct",
        cumulativePercentageByComponent: modifier.operation === "percentage"
          ? Object.fromEntries(componentTargets.map(name => [
              name,
              components[name].percentage,
            ]))
          : null,
        components: snapshotComponents(components),
      },
    }));
  }

  if (percentageContributions.length > 0) {
    current = evaluateComponents(components);
    steps.push(createModifierBreakdownStep({
      sequence: steps.length,
      stage: "construction",
      phase: "percentage",
      ruleId: "construction:percentage-total",
      inputValue: percentageApplicationInput,
      outputValue: current,
      source: {
        transformation: "aggregate-percentage-application",
        contributors: percentageContributions,
        componentsBefore: percentageComponentsBefore,
        componentsAfter: snapshotComponents(components),
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
    source: {
      target,
      components: snapshotComponents(components),
    },
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
    components: snapshotComponents(components),
    breakdown,
    diagnostics: breakdown.diagnostics,
  });
}

function createComponents({ baseCost, levelCost, levels, target }) {
  const base = createComponent({ baseValue: baseCost });
  const levelComponent = createComponent({ unitValue: levelCost, levels });

  if (target === "levels") {
    base.active = false;
  } else if (target !== "total") {
    levelComponent.active = false;
  }

  return { base, levels: levelComponent };
}

function createComponent({ baseValue = 0, unitValue = 0, levels = 0 } = {}) {
  return {
    active: true,
    baseValue,
    unitValue,
    levels,
    addition: 0,
    factor: 1,
    percentage: 0,
  };
}

function resolveComponentTargets(target, modifier) {
  if (target === "total") {
    if (modifier.target === "base") return ["base"];
    if (modifier.target === "levels") return ["levels"];
    if (modifier.target !== "total") return [];
    return modifier.operation === "addition"
      ? ["base"]
      : ["base", "levels"];
  }

  if (target === "base") {
    return ["base", "total"].includes(modifier.target) ? ["base"] : [];
  }
  if (target === "levels") {
    return ["levels", "total"].includes(modifier.target) ? ["levels"] : [];
  }
  return [target, "total"].includes(modifier.target) ? ["base"] : [];
}

function applyModifier(components, componentTargets, modifier) {
  for (const componentTarget of componentTargets) {
    const component = components[componentTarget];
    switch (modifier.operation) {
      case "addition":
        component.addition += modifier.value;
        break;
      case "multiplier":
        component.factor *= modifier.value;
        break;
      case "divisor":
        component.factor /= modifier.value;
        break;
      case "percentage":
        component.percentage += modifier.value;
        break;
      default:
        throw new Error("Construction modifier operation is invalid");
    }
  }
}

function evaluateComponents(components) {
  return Object.values(components).reduce(
    (total, component) => total + evaluateComponent(component),
    0,
  );
}

function evaluateComponent(component) {
  if (!component.active) return 0;
  const additiveValue = component.levels === 0
    ? component.baseValue + component.addition
    : component.baseValue + (component.unitValue + component.addition) * component.levels;
  const factoredValue = additiveValue * component.factor;
  return factoredValue * (1 + component.percentage / 100);
}

function snapshotComponents(components) {
  return Object.fromEntries(
    Object.entries(components).map(([name, component]) => [
      name,
      {
        ...component,
        additiveValue: component.active
          ? component.levels === 0
            ? component.baseValue + component.addition
            : component.baseValue +
              (component.unitValue + component.addition) * component.levels
          : 0,
        outputValue: evaluateComponent(component),
      },
    ]),
  );
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
