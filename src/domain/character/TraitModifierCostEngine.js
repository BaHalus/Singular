import { flattenEnabledTraitModifiers } from "./TraitModifiers.js";

const PERCENTAGE_POLICIES = ["additive", "multiplicative"];

export function applyTraitCostModifiers(baseCost, modifiers, options = {}) {
  const policy = normalizePolicy(options);
  const state = createState(baseCost);
  const contributions = [];
  const diagnostics = [];
  let status = "ready";

  for (const item of flattenEnabledTraitModifiers(modifiers, options.traitLevels)) {
    const modifier = item.modifier;
    if (!item.enabled) {
      diagnostics.push(diagnostic("trait-modifier-disabled", "info", modifier.id));
      continue;
    }
    if (!modifier.affectsCost) {
      diagnostics.push(diagnostic("trait-modifier-noncost", "info", modifier.id));
      continue;
    }
    if (["text", "unknown"].includes(modifier.costType)) {
      status = "unsupported";
      diagnostics.push(diagnostic(
        "trait-modifier-cost-type-unsupported",
        "blocked",
        modifier.id,
      ));
      continue;
    }
    if (modifier.costValue === null) {
      if (status === "ready") status = "incomplete";
      diagnostics.push(diagnostic(
        "trait-modifier-cost-value-missing",
        "pending",
        modifier.id,
      ));
      continue;
    }
    if (
      ["percentage", "points"].includes(modifier.costType) &&
      modifier.affects === "unknown"
    ) {
      status = "unsupported";
      diagnostics.push(diagnostic(
        "trait-modifier-affects-unsupported",
        "blocked",
        modifier.id,
      ));
      continue;
    }

    const effectiveValue = precision(
      modifier.costValue * item.levelMultiplier,
    );
    contributions.push({
      modifierId: modifier.id,
      costType: modifier.costType,
      affects: modifier.affects,
      baseValue: modifier.costValue,
      levelMultiplier: item.levelMultiplier,
      effectiveValue,
    });
    applyContribution(
      state,
      modifier.costType,
      modifier.affects,
      effectiveValue,
    );
  }

  if (status !== "ready") {
    return deepFreeze({
      status,
      contributions,
      aggregates: snapshot(state),
      rawPoints: null,
      diagnostics,
      policy,
    });
  }

  const modifiedBase = applyPercentages(
    state.basePoints,
    state.baseEnhancement,
    state.baseLimitation,
    policy,
  );
  const levelSubtotal = precision(state.pointsPerLevel * state.levels);
  const modifiedLevels = applyPercentages(
    levelSubtotal,
    state.levelEnhancement,
    state.levelLimitation,
    policy,
  );
  const rawPoints = precision(
    (modifiedBase + modifiedLevels) * state.multiplier,
  );

  return deepFreeze({
    status: "ready",
    contributions,
    aggregates: {
      ...snapshot(state),
      modifiedBase,
      levelSubtotal,
      modifiedLevels,
    },
    rawPoints,
    diagnostics,
    policy,
  });
}

export function getTraitModifierPercentagePolicies() {
  return [...PERCENTAGE_POLICIES];
}

function createState(baseCost) {
  if (baseCost.formula === "fixed") {
    return emptyState(baseCost.rawPoints, 0, 0);
  }
  if (baseCost.formula === "per-level") {
    return emptyState(
      0,
      baseCost.inputs.pointsPerLevel,
      baseCost.inputs.levels,
    );
  }
  return emptyState(
    baseCost.inputs.basePoints,
    baseCost.inputs.pointsPerLevel,
    baseCost.inputs.levels,
  );
}

function emptyState(basePoints, pointsPerLevel, levels) {
  return {
    basePoints,
    pointsPerLevel,
    levels,
    baseEnhancement: 0,
    baseLimitation: 0,
    levelEnhancement: 0,
    levelLimitation: 0,
    multiplier: 1,
  };
}

function applyContribution(state, type, affects, value) {
  if (type === "points") {
    if (affects === "levels-only") state.pointsPerLevel += value;
    else state.basePoints += value;
    return;
  }
  if (type === "multiplier") {
    state.multiplier = precision(state.multiplier * value);
    return;
  }

  const enhancement = value >= 0;
  if (["total", "base-only"].includes(affects)) {
    if (enhancement) state.baseEnhancement += value;
    else state.baseLimitation += value;
  }
  if (["total", "levels-only"].includes(affects)) {
    if (enhancement) state.levelEnhancement += value;
    else state.levelLimitation += value;
  }
}

function applyPercentages(points, enhancement, limitation, policy) {
  const limited = policy.limitationFloor === null
    ? limitation
    : Math.max(limitation, policy.limitationFloor);
  if (policy.percentagePolicy === "multiplicative") {
    return precision(
      points * (1 + enhancement / 100) * (1 + limited / 100),
    );
  }
  return precision(points * (1 + (enhancement + limited) / 100));
}

function normalizePolicy(options) {
  if (!isPlainObject(options)) {
    throw new Error("Trait modifier options must be object");
  }
  const percentagePolicy = options.percentagePolicy ?? "additive";
  if (!PERCENTAGE_POLICIES.includes(percentagePolicy)) {
    throw new Error("Trait modifier percentagePolicy is invalid");
  }
  const limitationFloor = options.limitationFloor === undefined
    ? -80
    : options.limitationFloor;
  if (
    limitationFloor !== null &&
    (typeof limitationFloor !== "number" || !Number.isFinite(limitationFloor))
  ) {
    throw new Error("Trait modifier limitationFloor must be finite or null");
  }
  return { percentagePolicy, limitationFloor };
}

function snapshot(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, precision(item)]),
  );
}

function diagnostic(code, severity, modifierId) {
  return { code, severity, modifierId };
}

function precision(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Trait modifier arithmetic produced non-finite result");
  }
  const normalized = Number(value.toFixed(12));
  return Object.is(normalized, -0) ? 0 : normalized;
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
