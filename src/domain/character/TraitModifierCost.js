import {
  evaluateTraitBaseCost,
  serializeTraitBaseCost,
} from "./TraitBaseCost.js";
import { validateTrait } from "./Traits.js";
import { isCanonicalPercentageModifier } from "./TraitModifiers.js";

const MODIFIER_COST_STATUSES = [
  "ready",
  "incomplete",
  "conflict",
  "unsupported",
];

const MODIFIER_KINDS = [
  "addition",
  "percentage",
  "percentage-multiplier",
  "multiplier",
  "textual",
  "unsupported",
  "container",
];

const MODIFIER_AFFECTS = ["total", "base", "levels"];
const PERCENTAGE_MODES = ["additive", "multiplicative"];
const ROUNDING_POLICIES = ["up", "down", "none"];
const LIMITATION_FLOOR_PERCENT = -80;
const ARITHMETIC_PRECISION_DIGITS = 12;

export function evaluateTraitModifierCost(trait, options = {}) {
  validateTrait(trait);
  const policy = normalizePolicy(options);
  const baseCost = evaluateTraitBaseCost(trait);
  const modifiers = projectTraitCostModifiers(trait);

  if (baseCost.status !== "ready") {
    return deepFreeze(createPendingResult({
      traitId: trait.id,
      status: baseCost.status,
      baseCost,
      policy,
      modifiers,
      diagnostics: [{
        code: `trait-modifier-cost-base-${baseCost.status}`,
        severity: baseCost.status === "conflict" ? "warning" : "pending",
      }],
    }));
  }

  const unsupported = modifiers.filter(modifier => (
    modifier.enabled && modifier.kind === "unsupported"
  ));
  if (unsupported.length > 0) {
    return deepFreeze(createPendingResult({
      traitId: trait.id,
      status: "unsupported",
      baseCost,
      policy,
      modifiers,
      diagnostics: unsupported.map(modifier => ({
        code: "trait-modifier-cost-unsupported",
        severity: "pending",
        modifierId: modifier.id,
        costExpression: modifier.costExpression,
      })),
    }));
  }

  const components = createBaseComponents(baseCost);
  let multiplier = 1;

  for (const modifier of modifiers) {
    if (!modifier.enabled || ["container", "textual"].includes(modifier.kind)) {
      continue;
    }

    const value = normalizeArithmetic(
      modifier.value * modifier.levelMultiplier,
    );

    switch (modifier.kind) {
      case "addition":
        applyAddition(components, modifier.affects, value);
        break;
      case "percentage":
        applyPercentage(components, modifier.affects, value);
        break;
      case "percentage-multiplier":
        multiplier = normalizeArithmetic(multiplier * (value / 100));
        break;
      case "multiplier":
        multiplier = normalizeArithmetic(multiplier * value);
        break;
      default:
        throw new Error(`Unhandled Trait modifier kind: ${modifier.kind}`);
    }
  }

  const baseEvaluation = evaluateComponent(
    components.base,
    policy.percentageMode,
  );
  const levelEvaluation = evaluateComponent(
    components.levels,
    policy.percentageMode,
  );
  const beforeMultiplier = normalizeArithmetic(
    baseEvaluation.afterPercentage + levelEvaluation.afterPercentage,
  );
  const rawPoints = normalizeArithmetic(beforeMultiplier * multiplier);
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
    baseCost: serializeTraitBaseCost(baseCost),
    policy,
    modifiers,
    components: {
      base: baseEvaluation,
      levels: levelEvaluation,
    },
    multiplier,
    beforeMultiplier,
    rawPoints,
    calculatedPoints,
    rounding,
    calculationBreakdown: createCalculationBreakdown({
      baseCost,
      modifiers,
      policy,
      components: {
        base: baseEvaluation,
        levels: levelEvaluation,
      },
      beforeMultiplier,
      multiplier,
      rawPoints,
      calculatedPoints,
      rounding,
    }),
    diagnostics: [],
  };

  validateTraitModifierCost(result);
  return deepFreeze(result);
}

export function projectTraitCostModifiers(trait) {
  validateTrait(trait);
  const projected = [];
  flattenModifiers(trait.modifiers, trait, [], projected, true);
  return deepFreeze(projected);
}

export function validateTraitModifierCost(result) {
  if (!isPlainObject(result)) {
    throw new Error("Trait modifier cost evaluation must be object");
  }
  if (typeof result.traitId !== "string" || result.traitId === "") {
    throw new Error("Trait modifier cost traitId must be non-empty string");
  }
  if (!MODIFIER_COST_STATUSES.includes(result.status)) {
    throw new Error("Trait modifier cost status is invalid");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Trait modifier cost complete flag is inconsistent");
  }

  validatePolicy(result.policy);
  validateProjectedModifiers(result.modifiers);

  if (result.status === "ready") {
    if (!isPlainObject(result.components)) {
      throw new Error("Ready Trait modifier cost must expose components");
    }
    validateComponentEvaluation(result.components.base, "base");
    validateComponentEvaluation(result.components.levels, "levels");
    validateFiniteNumber(
      result.multiplier,
      "Trait modifier multiplier must be finite number",
    );
    validateFiniteNumber(
      result.beforeMultiplier,
      "Trait modifier beforeMultiplier must be finite number",
    );
    validateFiniteNumber(
      result.rawPoints,
      "Trait modifier rawPoints must be finite number",
    );
    validateFiniteNumber(
      result.calculatedPoints,
      "Trait modifier calculatedPoints must be finite number",
    );
    validateRounding(result.rounding);
    validateCalculationBreakdown(result.calculationBreakdown, result);
  } else {
    for (const field of [
      "components",
      "multiplier",
      "beforeMultiplier",
      "rawPoints",
      "calculatedPoints",
      "rounding",
      "calculationBreakdown",
    ]) {
      if (result[field] !== null) {
        throw new Error(`Non-ready Trait modifier cost ${field} must be null`);
      }
    }
  }

  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Trait modifier cost diagnostics must be array");
  }

  return true;
}

export function serializeTraitModifierCost(result) {
  validateTraitModifierCost(result);
  return cloneValue(result);
}

export function getTraitModifierCostStatuses() {
  return [...MODIFIER_COST_STATUSES];
}

export function getTraitModifierKinds() {
  return [...MODIFIER_KINDS];
}

export function getTraitModifierAffects() {
  return [...MODIFIER_AFFECTS];
}

export function getTraitModifierPercentageModes() {
  return [...PERCENTAGE_MODES];
}

export function getTraitModifierRoundingPolicies() {
  return [...ROUNDING_POLICIES];
}

export function getTraitModifierLimitationFloorPercent() {
  return LIMITATION_FLOOR_PERCENT;
}

function createPendingResult({
  traitId,
  status,
  baseCost,
  policy,
  modifiers,
  diagnostics,
}) {
  const result = {
    traitId,
    status,
    complete: false,
    baseCost: serializeTraitBaseCost(baseCost),
    policy,
    modifiers,
    components: null,
    multiplier: null,
    beforeMultiplier: null,
    rawPoints: null,
    calculatedPoints: null,
    rounding: null,
    calculationBreakdown: null,
    diagnostics: cloneValue(diagnostics),
  };
  validateTraitModifierCost(result);
  return result;
}

function createBaseComponents(baseCost) {
  const base = createComponent();
  const levels = createComponent();

  switch (baseCost.formula) {
    case "fixed":
      base.baseValue = baseCost.rawPoints;
      break;
    case "per-level":
      levels.unitValue = baseCost.inputs.pointsPerLevel;
      levels.levels = baseCost.inputs.levels;
      break;
    case "base-plus-levels":
      base.baseValue = baseCost.inputs.basePoints;
      levels.unitValue = baseCost.inputs.pointsPerLevel;
      levels.levels = baseCost.inputs.levels;
      break;
    default:
      throw new Error(`Unsupported ready Trait base formula: ${baseCost.formula}`);
  }

  return { base, levels };
}

function createComponent() {
  return {
    baseValue: 0,
    unitValue: 0,
    levels: 0,
    addition: 0,
    enhancementPercent: 0,
    limitationPercent: 0,
  };
}

function applyAddition(components, affects, value) {
  if (affects === "levels") {
    components.levels.addition = normalizeArithmetic(
      components.levels.addition + value,
    );
    return;
  }

  components.base.addition = normalizeArithmetic(
    components.base.addition + value,
  );
}

function applyPercentage(components, affects, value) {
  if (affects === "total" || affects === "base") {
    addPercentage(components.base, value);
  }
  if (affects === "total" || affects === "levels") {
    addPercentage(components.levels, value);
  }
}

function addPercentage(component, value) {
  if (value < 0) {
    component.limitationPercent = normalizeArithmetic(
      component.limitationPercent + value,
    );
    return;
  }

  component.enhancementPercent = normalizeArithmetic(
    component.enhancementPercent + value,
  );
}

function evaluateComponent(component, percentageMode) {
  const beforePercentage = component.levels === 0
    ? normalizeArithmetic(component.baseValue + component.addition)
    : normalizeArithmetic(
      component.baseValue +
      ((component.unitValue + component.addition) * component.levels),
    );
  const cappedLimitationPercent = Math.max(
    LIMITATION_FLOOR_PERCENT,
    component.limitationPercent,
  );

  let appliedPercent;
  let afterPercentage;

  if (percentageMode === "multiplicative") {
    const enhancementFactor = normalizeArithmetic(
      1 + (component.enhancementPercent / 100),
    );
    const limitationFactor = normalizeArithmetic(
      1 + (cappedLimitationPercent / 100),
    );
    const combinedFactor = normalizeArithmetic(
      enhancementFactor * limitationFactor,
    );
    appliedPercent = normalizeArithmetic((combinedFactor - 1) * 100);
    afterPercentage = normalizeArithmetic(beforePercentage * combinedFactor);
  } else {
    appliedPercent = Math.max(
      LIMITATION_FLOOR_PERCENT,
      normalizeArithmetic(
        component.enhancementPercent + component.limitationPercent,
      ),
    );
    afterPercentage = normalizeArithmetic(
      beforePercentage * (1 + (appliedPercent / 100)),
    );
  }

  return {
    baseValue: component.baseValue,
    unitValue: component.unitValue,
    levels: component.levels,
    addition: component.addition,
    beforePercentage,
    enhancementPercent: component.enhancementPercent,
    limitationPercent: component.limitationPercent,
    cappedLimitationPercent,
    appliedPercent,
    afterPercentage,
  };
}

function createCalculationBreakdown({
  baseCost,
  modifiers,
  policy,
  components,
  beforeMultiplier,
  multiplier,
  rawPoints,
  calculatedPoints,
  rounding,
}) {
  const activePercentages = modifiers.filter(modifier => (
    modifier.enabled && modifier.kind === "percentage"
  ));
  const enhancementsPercent = normalizeArithmetic(
    activePercentages
      .filter(modifier => modifier.value >= 0)
      .reduce((total, modifier) => (
        total + (modifier.value * modifier.levelMultiplier)
      ), 0),
  );
  const limitationsGrossPercent = normalizeArithmetic(
    activePercentages
      .filter(modifier => modifier.value < 0)
      .reduce((total, modifier) => (
        total + (modifier.value * modifier.levelMultiplier)
      ), 0),
  );
  const limitationsEffectivePercent = policy.percentageMode === "multiplicative"
    ? Math.max(limitationsGrossPercent, LIMITATION_FLOOR_PERCENT)
    : Math.max(
      limitationsGrossPercent,
      normalizeArithmetic(LIMITATION_FLOOR_PERCENT - enhancementsPercent),
    );
  const netModifierPercent = policy.percentageMode === "multiplicative"
    ? normalizeArithmetic(
      (
        (1 + (enhancementsPercent / 100)) *
        (1 + (limitationsEffectivePercent / 100)) -
        1
      ) * 100,
    )
    : Math.max(
      LIMITATION_FLOOR_PERCENT,
      normalizeArithmetic(enhancementsPercent + limitationsGrossPercent),
    );

  return {
    basePoints: baseCost.rawPoints,
    percentageMode: policy.percentageMode,
    enhancementsPercent,
    limitationsGrossPercent,
    limitationsEffectivePercent,
    netModifierPercent,
    components: {
      base: createCalculationComponentBreakdown(components.base, policy),
      levels: createCalculationComponentBreakdown(components.levels, policy),
    },
    beforeMultiplier,
    multiplier,
    beforeRounding: rawPoints,
    rounding: cloneValue(rounding),
    finalPoints: calculatedPoints,
  };
}

function createCalculationComponentBreakdown(component, policy) {
  const limitationsEffectivePercent = policy.percentageMode === "multiplicative"
    ? component.cappedLimitationPercent
    : normalizeArithmetic(
      component.appliedPercent - component.enhancementPercent,
    );

  return {
    beforePercentage: component.beforePercentage,
    enhancementsPercent: component.enhancementPercent,
    limitationsGrossPercent: component.limitationPercent,
    limitationsEffectivePercent,
    netModifierPercent: component.appliedPercent,
    afterPercentage: component.afterPercentage,
  };
}

function validateCalculationBreakdown(breakdown, result) {
  if (!isPlainObject(breakdown)) {
    throw new Error("Trait modifier calculationBreakdown must be object");
  }
  for (const [field, value] of Object.entries({
    basePoints: breakdown.basePoints,
    enhancementsPercent: breakdown.enhancementsPercent,
    limitationsGrossPercent: breakdown.limitationsGrossPercent,
    limitationsEffectivePercent: breakdown.limitationsEffectivePercent,
    netModifierPercent: breakdown.netModifierPercent,
    beforeMultiplier: breakdown.beforeMultiplier,
    multiplier: breakdown.multiplier,
    beforeRounding: breakdown.beforeRounding,
    finalPoints: breakdown.finalPoints,
  })) {
    validateFiniteNumber(
      value,
      `Trait modifier calculationBreakdown ${field} must be finite number`,
    );
  }
  if (!PERCENTAGE_MODES.includes(breakdown.percentageMode)) {
    throw new Error("Trait modifier calculationBreakdown percentageMode is invalid");
  }
  if (breakdown.limitationsGrossPercent > 0) {
    throw new Error("Trait modifier gross limitations cannot be positive");
  }
  if (breakdown.limitationsEffectivePercent > 0) {
    throw new Error("Trait modifier effective limitations cannot be positive");
  }
  if (breakdown.netModifierPercent < LIMITATION_FLOOR_PERCENT) {
    throw new Error("Trait modifier net percentage cannot be below -80");
  }
  if (!isPlainObject(breakdown.components)) {
    throw new Error("Trait modifier calculationBreakdown components must be object");
  }
  validateCalculationBreakdownComponent(breakdown.components.base, "base");
  validateCalculationBreakdownComponent(breakdown.components.levels, "levels");
  const reconstructedBeforeMultiplier = normalizeArithmetic(
    breakdown.components.base.afterPercentage +
    breakdown.components.levels.afterPercentage,
  );
  if (!Object.is(breakdown.beforeMultiplier, reconstructedBeforeMultiplier)) {
    throw new Error("Trait modifier calculationBreakdown components do not sum");
  }
  const reconstructedRawPoints = normalizeArithmetic(
    breakdown.beforeMultiplier * breakdown.multiplier,
  );
  if (!Object.is(breakdown.beforeRounding, reconstructedRawPoints)) {
    throw new Error("Trait modifier calculationBreakdown multiplier is inconsistent");
  }
  if (!Object.is(breakdown.beforeRounding, result.rawPoints)) {
    throw new Error("Trait modifier calculationBreakdown raw cost is inconsistent");
  }
  if (!Object.is(breakdown.finalPoints, result.calculatedPoints)) {
    throw new Error("Trait modifier calculationBreakdown final cost is inconsistent");
  }
  validateRounding(breakdown.rounding);
}

function validateCalculationBreakdownComponent(component, label) {
  if (!isPlainObject(component)) {
    throw new Error(`Trait modifier calculationBreakdown ${label} must be object`);
  }
  for (const [field, value] of Object.entries({
    beforePercentage: component.beforePercentage,
    enhancementsPercent: component.enhancementsPercent,
    limitationsGrossPercent: component.limitationsGrossPercent,
    limitationsEffectivePercent: component.limitationsEffectivePercent,
    netModifierPercent: component.netModifierPercent,
    afterPercentage: component.afterPercentage,
  })) {
    validateFiniteNumber(
      value,
      `Trait modifier calculationBreakdown ${label}.${field} must be finite number`,
    );
  }
  if (component.limitationsGrossPercent > 0) {
    throw new Error(`Trait modifier calculationBreakdown ${label} gross limitations cannot be positive`);
  }
  if (component.limitationsEffectivePercent > 0) {
    throw new Error(`Trait modifier calculationBreakdown ${label} effective limitations cannot be positive`);
  }
  if (component.netModifierPercent < LIMITATION_FLOOR_PERCENT) {
    throw new Error(`Trait modifier calculationBreakdown ${label} net percentage cannot be below -80`);
  }
  const reconstructedAfterPercentage = normalizeArithmetic(
    component.beforePercentage * (1 + (component.netModifierPercent / 100)),
  );
  if (!Object.is(component.afterPercentage, reconstructedAfterPercentage)) {
    throw new Error(`Trait modifier calculationBreakdown ${label} percentage is inconsistent`);
  }
}

function flattenModifiers(
  modifiers,
  trait,
  path,
  projected,
  ancestorEnabled = true,
) {
  for (let index = 0; index < modifiers.length; index += 1) {
    const modifier = modifiers[index];
    const modifierPath = [...path, index];

    if (isPlainObject(modifier) && Array.isArray(modifier.children)) {
      const enabled = ancestorEnabled && isModifierEnabled(modifier);
      projected.push(createContainerProjection(modifier, modifierPath, enabled));
      flattenModifiers(
        modifier.children,
        trait,
        modifierPath,
        projected,
        enabled,
      );
      continue;
    }

    projected.push(normalizeModifier(
      modifier,
      trait,
      modifierPath,
      ancestorEnabled,
    ));
  }
}

function createContainerProjection(modifier, path, enabled) {
  return {
    id: normalizeModifierId(modifier.id, path),
    name: typeof modifier.name === "string" ? modifier.name : "",
    kind: "container",
    value: null,
    affects: "total",
    enabled,
    levelMultiplier: 1,
    costExpression: null,
    sourceFormat: "container",
    raw: cloneValue(modifier),
  };
}

function normalizeModifier(modifier, trait, path, ancestorEnabled = true) {
  if (typeof modifier === "string") {
    const parsed = parseCostExpression(modifier);
    const textual = parsed.kind === "unsupported";
    return createProjection({
      source: {},
      path,
      parsed: textual
        ? { kind: "textual", value: null, costExpression: null }
        : parsed,
      name: textual ? modifier : "",
      enabled: ancestorEnabled,
      affects: "total",
      levelMultiplier: 1,
      sourceFormat: textual ? "textual" : "cost-expression",
      raw: modifier,
    });
  }

  if (!isPlainObject(modifier)) {
    return createProjection({
      source: {},
      path,
      parsed: {
        kind: "unsupported",
        value: null,
        costExpression: String(modifier),
      },
      name: "",
      enabled: ancestorEnabled,
      affects: "total",
      levelMultiplier: 1,
      sourceFormat: "unsupported",
      raw: modifier,
    });
  }

  if (isCanonicalPercentageModifier(modifier)) {
    return createProjection({
      source: modifier,
      path,
      parsed: {
        kind: "percentage",
        value: modifier.kind === "limitation"
          ? -modifier.value
          : modifier.value,
        costExpression: null,
      },
      name: modifier.name,
      enabled: ancestorEnabled && isModifierEnabled(modifier),
      affects: normalizeAffects(modifier.affects),
      levelMultiplier: 1,
      sourceFormat: "canonical-percentage",
      raw: modifier,
    });
  }

  const costExpression = firstDefined(
    modifier.cost_adj,
    modifier.costAdj,
  );
  let parsed;
  let sourceFormat;

  if (typeof costExpression === "string") {
    parsed = parseCostExpression(costExpression);
    sourceFormat = "gcs-cost-adj";
  } else {
    const explicitKind = firstDefined(
      modifier.kind,
      modifier.costKind,
      modifier.cost_kind,
      modifier.costType,
      modifier.cost_type,
      modifier.type,
    );
    const explicitValue = firstDefined(
      modifier.value,
      modifier.cost,
      modifier.amount,
      modifier.percent,
      modifier.percentage,
    );
    parsed = parseExplicitModifier(explicitKind, explicitValue);
    sourceFormat = explicitKind === undefined && explicitValue === undefined
      ? "textual"
      : "structured";
  }

  const useTraitLevel = modifier.useLevelFromTrait === true ||
    modifier.use_level_from_trait === true;
  const traitLevels = firstFiniteNumber(
    trait.pointValue?.levels,
    trait.levels,
  );
  const modifierLevels = firstFiniteNumber(modifier.levels);
  const levelMultiplier = useTraitLevel
    ? positiveOrOne(traitLevels)
    : positiveOrOne(modifierLevels);

  return createProjection({
    source: modifier,
    path,
    parsed,
    name: typeof modifier.name === "string" ? modifier.name : "",
    enabled: ancestorEnabled && isModifierEnabled(modifier),
    affects: normalizeAffects(modifier.affects),
    levelMultiplier,
    sourceFormat,
    raw: modifier,
  });
}

function isModifierEnabled(modifier) {
  return modifier.disabled !== true && modifier.enabled !== false;
}

function createProjection({
  source,
  path,
  parsed,
  name,
  enabled,
  affects,
  levelMultiplier,
  sourceFormat,
  raw,
}) {
  return {
    id: normalizeModifierId(source.id, path),
    name,
    kind: parsed.kind,
    value: parsed.value,
    affects,
    enabled,
    levelMultiplier,
    costExpression: parsed.costExpression,
    sourceFormat,
    raw: cloneValue(raw),
  };
}

function parseCostExpression(expression) {
  const normalized = expression.trim().replaceAll(",", ".");
  if (normalized === "") {
    return { kind: "textual", value: null, costExpression: null };
  }

  const percentageMultiplier = normalized.match(
    /^[x×*]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*%$/i,
  );
  if (percentageMultiplier) {
    return {
      kind: "percentage-multiplier",
      value: Number(percentageMultiplier[1]),
      costExpression: expression,
    };
  }

  const multiplier = normalized.match(
    /^[x×*]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/i,
  );
  if (multiplier) {
    return {
      kind: "multiplier",
      value: Number(multiplier[1]),
      costExpression: expression,
    };
  }

  const percentage = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*%$/,
  );
  if (percentage) {
    return {
      kind: "percentage",
      value: Number(percentage[1]),
      costExpression: expression,
    };
  }

  const addition = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/,
  );
  if (addition) {
    return {
      kind: "addition",
      value: Number(addition[1]),
      costExpression: expression,
    };
  }

  return {
    kind: "unsupported",
    value: null,
    costExpression: expression,
  };
}

function parseExplicitModifier(kind, value) {
  if (kind === undefined && value === undefined) {
    return { kind: "textual", value: null, costExpression: null };
  }

  const normalizedKind = typeof kind === "string"
    ? kind.trim().toLowerCase().replaceAll("_", "-")
    : "";
  const mappedKind = {
    addition: "addition",
    point: "addition",
    points: "addition",
    flat: "addition",
    fixed: "addition",
    percentage: "percentage",
    percent: "percentage",
    "percentage-adder": "percentage",
    multiplier: "multiplier",
    multiply: "multiplier",
    "percentage-multiplier": "percentage-multiplier",
    "percent-multiplier": "percentage-multiplier",
    textual: "textual",
    text: "textual",
    note: "textual",
  }[normalizedKind];

  if (mappedKind === "textual") {
    return { kind: "textual", value: null, costExpression: null };
  }

  const numericValue = normalizeFiniteNumber(value);
  if (mappedKind && numericValue !== null) {
    return {
      kind: mappedKind,
      value: numericValue,
      costExpression: `${kind}:${value}`,
    };
  }

  return {
    kind: "unsupported",
    value: null,
    costExpression: `${kind ?? "unknown"}:${value ?? "unknown"}`,
  };
}

function normalizePolicy(options) {
  if (!isPlainObject(options)) {
    throw new Error("Trait modifier cost options must be object");
  }

  const policy = {
    percentageMode: options.percentageMode ?? "additive",
    rounding: options.rounding ?? "up",
    limitationFloorPercent: LIMITATION_FLOOR_PERCENT,
  };
  validatePolicy(policy);
  return policy;
}

function validatePolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new Error("Trait modifier cost policy must be object");
  }
  if (!PERCENTAGE_MODES.includes(policy.percentageMode)) {
    throw new Error("Trait modifier percentage mode is invalid");
  }
  if (!ROUNDING_POLICIES.includes(policy.rounding)) {
    throw new Error("Trait modifier rounding policy is invalid");
  }
  if (policy.limitationFloorPercent !== LIMITATION_FLOOR_PERCENT) {
    throw new Error("Trait modifier limitation floor must be -80 percent");
  }
}

function validateProjectedModifiers(modifiers) {
  if (!Array.isArray(modifiers)) {
    throw new Error("Trait modifier projection must be array");
  }

  const ids = new Set();
  for (const modifier of modifiers) {
    if (!isPlainObject(modifier)) {
      throw new Error("Projected Trait modifier must be object");
    }
    if (typeof modifier.id !== "string" || modifier.id === "") {
      throw new Error("Projected Trait modifier id must be non-empty string");
    }
    if (ids.has(modifier.id)) {
      throw new Error(`Duplicate projected Trait modifier id: ${modifier.id}`);
    }
    ids.add(modifier.id);

    if (!MODIFIER_KINDS.includes(modifier.kind)) {
      throw new Error("Projected Trait modifier kind is invalid");
    }
    if (!MODIFIER_AFFECTS.includes(modifier.affects)) {
      throw new Error("Projected Trait modifier affects is invalid");
    }
    if (typeof modifier.enabled !== "boolean") {
      throw new Error("Projected Trait modifier enabled must be boolean");
    }
    validateFiniteNumber(
      modifier.levelMultiplier,
      "Projected Trait modifier levelMultiplier must be finite number",
    );

    if ([
      "addition",
      "percentage",
      "percentage-multiplier",
      "multiplier",
    ].includes(modifier.kind)) {
      validateFiniteNumber(
        modifier.value,
        "Mechanical Trait modifier value must be finite number",
      );
    } else if (modifier.value !== null) {
      throw new Error("Non-mechanical Trait modifier value must be null");
    }
  }
}

function validateComponentEvaluation(component, label) {
  if (!isPlainObject(component)) {
    throw new Error(`Trait modifier ${label} component must be object`);
  }

  for (const field of [
    "baseValue",
    "unitValue",
    "levels",
    "addition",
    "beforePercentage",
    "enhancementPercent",
    "limitationPercent",
    "cappedLimitationPercent",
    "appliedPercent",
    "afterPercentage",
  ]) {
    validateFiniteNumber(
      component[field],
      `Trait modifier ${label}.${field} must be finite number`,
    );
  }
}

function validateRounding(rounding) {
  if (!isPlainObject(rounding)) {
    throw new Error("Trait modifier rounding must be object");
  }
  if (!ROUNDING_POLICIES.includes(rounding.policy)) {
    throw new Error("Trait modifier rounding policy is invalid");
  }
  if (typeof rounding.applied !== "boolean") {
    throw new Error("Trait modifier rounding applied must be boolean");
  }
  for (const field of ["input", "output", "difference"]) {
    validateFiniteNumber(
      rounding[field],
      `Trait modifier rounding ${field} must be finite number`,
    );
  }
}

function applyRounding(value, policy) {
  const normalized = normalizeArithmetic(value);
  if (policy === "none") return normalized;
  return normalizeArithmetic(
    policy === "down" ? Math.floor(normalized) : Math.ceil(normalized),
  );
}

function normalizeAffects(value) {
  if (typeof value !== "string") return "total";
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  if (["base", "base-only", "baseonly"].includes(normalized)) return "base";
  if (["levels", "levels-only", "levelsonly", "level"].includes(normalized)) {
    return "levels";
  }
  return "total";
}

function normalizeModifierId(value, path) {
  if (typeof value === "string" && value !== "") return value;
  return `trait-modifier-${path.join("-")}`;
}

function positiveOrOne(value) {
  return value !== null && value > 0 ? value : 1;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const normalized = normalizeFiniteNumber(value);
    if (normalized !== null) return normalized;
  }
  return null;
}

function normalizeFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim().replaceAll(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
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
