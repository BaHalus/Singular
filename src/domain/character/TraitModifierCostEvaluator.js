import {
  evaluateTraitBaseCost,
  serializeTraitBaseCost,
} from "./TraitBaseCost.js";
import { validateTrait } from "./Traits.js";

const STATUSES = ["ready", "incomplete", "conflict", "unsupported"];
const KINDS = [
  "addition",
  "percentage",
  "percentage-multiplier",
  "multiplier",
  "textual",
  "unsupported",
  "container",
];
const AFFECTS = ["total", "base", "levels"];
const PERCENTAGE_MODES = ["additive", "multiplicative"];
const ROUNDING_POLICIES = ["up", "down", "none"];
const LIMITATION_FLOOR_PERCENT = -80;
const PRECISION_DIGITS = 12;

export function evaluateTraitModifierCost(trait, options = {}) {
  validateTrait(trait);
  const policy = normalizePolicy(options);
  const baseCost = evaluateTraitBaseCost(trait);
  const modifiers = projectTraitCostModifiers(trait);

  if (baseCost.status !== "ready") {
    return freezeResult(createPendingResult({
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

  const unsupported = modifiers.filter(item => (
    item.enabled && item.kind === "unsupported"
  ));
  if (unsupported.length > 0) {
    return freezeResult(createPendingResult({
      traitId: trait.id,
      status: "unsupported",
      baseCost,
      policy,
      modifiers,
      diagnostics: unsupported.map(item => ({
        code: "trait-modifier-cost-unsupported",
        severity: "pending",
        modifierId: item.id,
        costExpression: item.costExpression,
      })),
    }));
  }

  const components = createBaseComponents(baseCost);
  let multiplier = 1;

  for (const modifier of modifiers) {
    if (!modifier.enabled || ["container", "textual"].includes(modifier.kind)) {
      continue;
    }

    const value = arithmetic(modifier.value * modifier.levelMultiplier);
    switch (modifier.kind) {
      case "addition":
        applyAddition(components, modifier.affects, value);
        break;
      case "percentage":
        applyPercentage(components, modifier.affects, value);
        break;
      case "percentage-multiplier":
        multiplier = arithmetic(multiplier * (value / 100));
        break;
      case "multiplier":
        multiplier = arithmetic(multiplier * value);
        break;
      default:
        throw new Error(`Unhandled Trait modifier kind: ${modifier.kind}`);
    }
  }

  const base = evaluateComponent(components.base, policy.percentageMode);
  const levels = evaluateComponent(components.levels, policy.percentageMode);
  const beforeMultiplier = arithmetic(base.afterPercentage + levels.afterPercentage);
  const rawPoints = arithmetic(beforeMultiplier * multiplier);
  const calculatedPoints = round(rawPoints, policy.rounding);

  const result = {
    traitId: trait.id,
    status: "ready",
    complete: true,
    baseCost: serializeTraitBaseCost(baseCost),
    policy,
    modifiers,
    components: { base, levels },
    multiplier,
    beforeMultiplier,
    rawPoints,
    calculatedPoints,
    rounding: {
      policy: policy.rounding,
      applied: !Object.is(rawPoints, calculatedPoints),
      input: rawPoints,
      output: calculatedPoints,
      difference: arithmetic(calculatedPoints - rawPoints),
    },
    diagnostics: [],
  };

  validateTraitModifierCost(result);
  return freezeResult(result);
}

export function projectTraitCostModifiers(trait) {
  validateTrait(trait);
  const projected = [];
  flattenModifiers(trait.modifiers, trait, [], projected, true);
  return deepFreeze(projected);
}

export function validateTraitModifierCost(result) {
  requireObject(result, "Trait modifier cost evaluation must be object");
  if (typeof result.traitId !== "string" || result.traitId === "") {
    throw new Error("Trait modifier cost traitId must be non-empty string");
  }
  if (!STATUSES.includes(result.status)) {
    throw new Error("Trait modifier cost status is invalid");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Trait modifier cost complete flag is inconsistent");
  }

  validatePolicy(result.policy);
  validateProjectedModifiers(result.modifiers);

  if (result.status === "ready") {
    requireObject(result.components, "Ready Trait modifier cost must expose components");
    validateComponent(result.components.base, "base");
    validateComponent(result.components.levels, "levels");
    finite(result.multiplier, "Trait modifier multiplier must be finite number");
    finite(
      result.beforeMultiplier,
      "Trait modifier beforeMultiplier must be finite number",
    );
    finite(result.rawPoints, "Trait modifier rawPoints must be finite number");
    finite(
      result.calculatedPoints,
      "Trait modifier calculatedPoints must be finite number",
    );
    validateRounding(result.rounding);
  } else {
    for (const field of [
      "components",
      "multiplier",
      "beforeMultiplier",
      "rawPoints",
      "calculatedPoints",
      "rounding",
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
  return clone(result);
}

export function getTraitModifierCostStatuses() {
  return [...STATUSES];
}

export function getTraitModifierKinds() {
  return [...KINDS];
}

export function getTraitModifierAffects() {
  return [...AFFECTS];
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
    diagnostics: clone(diagnostics),
  };
  validateTraitModifierCost(result);
  return result;
}

function createBaseComponents(baseCost) {
  const base = emptyComponent();
  const levels = emptyComponent();

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

function emptyComponent() {
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
    components.levels.addition = arithmetic(components.levels.addition + value);
  } else {
    components.base.addition = arithmetic(components.base.addition + value);
  }
}

function applyPercentage(components, affects, value) {
  if (["total", "base"].includes(affects)) {
    addPercentage(components.base, value);
  }
  if (["total", "levels"].includes(affects)) {
    addPercentage(components.levels, value);
  }
}

function addPercentage(component, value) {
  const field = value < 0 ? "limitationPercent" : "enhancementPercent";
  component[field] = arithmetic(component[field] + value);
}

function evaluateComponent(component, percentageMode) {
  const beforePercentage = component.levels === 0
    ? arithmetic(component.baseValue + component.addition)
    : arithmetic(
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
    const enhancementFactor = arithmetic(
      1 + (component.enhancementPercent / 100),
    );
    const limitationFactor = arithmetic(
      1 + (cappedLimitationPercent / 100),
    );
    const factor = arithmetic(enhancementFactor * limitationFactor);
    appliedPercent = arithmetic((factor - 1) * 100);
    afterPercentage = arithmetic(beforePercentage * factor);
  } else {
    appliedPercent = Math.max(
      LIMITATION_FLOOR_PERCENT,
      arithmetic(component.enhancementPercent + component.limitationPercent),
    );
    afterPercentage = arithmetic(
      beforePercentage * (1 + (appliedPercent / 100)),
    );
  }

  return {
    ...component,
    beforePercentage,
    cappedLimitationPercent,
    appliedPercent,
    afterPercentage,
  };
}

function flattenModifiers(modifiers, trait, path, projected, inheritedEnabled) {
  for (let index = 0; index < modifiers.length; index += 1) {
    const modifier = modifiers[index];
    const modifierPath = [...path, index];

    if (isObject(modifier) && Array.isArray(modifier.children)) {
      const enabled = inheritedEnabled && isLocallyEnabled(modifier);
      projected.push(containerProjection(modifier, modifierPath, enabled));
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
      inheritedEnabled,
    ));
  }
}

function containerProjection(modifier, path, enabled) {
  return {
    id: modifierId(modifier.id, path),
    name: typeof modifier.name === "string" ? modifier.name : "",
    kind: "container",
    value: null,
    affects: "total",
    enabled,
    levelMultiplier: 1,
    costExpression: null,
    sourceFormat: "container",
    raw: clone(modifier),
  };
}

function normalizeModifier(modifier, trait, path, inheritedEnabled) {
  if (typeof modifier === "string") {
    const parsed = parseCostExpression(modifier);
    const textual = parsed.kind === "unsupported";
    return projection({
      source: {},
      path,
      parsed: textual
        ? { kind: "textual", value: null, costExpression: null }
        : parsed,
      name: textual ? modifier : "",
      enabled: inheritedEnabled,
      affects: "total",
      levelMultiplier: 1,
      sourceFormat: textual ? "textual" : "cost-expression",
      raw: modifier,
    });
  }

  if (!isObject(modifier)) {
    return projection({
      source: {},
      path,
      parsed: {
        kind: "unsupported",
        value: null,
        costExpression: String(modifier),
      },
      name: "",
      enabled: inheritedEnabled,
      affects: "total",
      levelMultiplier: 1,
      sourceFormat: "unsupported",
      raw: modifier,
    });
  }

  const costExpression = first(modifier.cost_adj, modifier.costAdj);
  let parsed;
  let sourceFormat;
  if (typeof costExpression === "string") {
    parsed = parseCostExpression(costExpression);
    sourceFormat = "gcs-cost-adj";
  } else {
    const kind = first(
      modifier.kind,
      modifier.costKind,
      modifier.cost_kind,
      modifier.costType,
      modifier.cost_type,
      modifier.type,
    );
    const value = first(
      modifier.value,
      modifier.cost,
      modifier.amount,
      modifier.percent,
      modifier.percentage,
    );
    parsed = parseStructured(kind, value);
    sourceFormat = kind === undefined && value === undefined
      ? "textual"
      : "structured";
  }

  const useTraitLevel = modifier.useLevelFromTrait === true ||
    modifier.use_level_from_trait === true;
  const traitLevels = firstNumber(trait.pointValue?.levels, trait.levels);
  const ownLevels = firstNumber(modifier.levels);

  return projection({
    source: modifier,
    path,
    parsed,
    name: typeof modifier.name === "string" ? modifier.name : "",
    enabled: inheritedEnabled && isLocallyEnabled(modifier),
    affects: normalizeAffects(modifier.affects),
    levelMultiplier: useTraitLevel
      ? positiveOrOne(traitLevels)
      : positiveOrOne(ownLevels),
    sourceFormat,
    raw: modifier,
  });
}

function projection({
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
    id: modifierId(source.id, path),
    name,
    kind: parsed.kind,
    value: parsed.value,
    affects,
    enabled,
    levelMultiplier,
    costExpression: parsed.costExpression,
    sourceFormat,
    raw: clone(raw),
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
    return parsed("percentage-multiplier", percentageMultiplier[1], expression);
  }

  const multiplier = normalized.match(
    /^[x×*]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/i,
  );
  if (multiplier) return parsed("multiplier", multiplier[1], expression);

  const percentage = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*%$/,
  );
  if (percentage) return parsed("percentage", percentage[1], expression);

  const addition = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/,
  );
  if (addition) return parsed("addition", addition[1], expression);

  return { kind: "unsupported", value: null, costExpression: expression };
}

function parsed(kind, value, expression) {
  return { kind, value: Number(value), costExpression: expression };
}

function parseStructured(kind, value) {
  if (kind === undefined && value === undefined) {
    return { kind: "textual", value: null, costExpression: null };
  }

  const normalized = typeof kind === "string"
    ? kind.trim().toLowerCase().replaceAll("_", "-")
    : "";
  const mapped = {
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
  }[normalized];

  if (mapped === "textual") {
    return { kind: "textual", value: null, costExpression: null };
  }

  const number = numberOrNull(value);
  if (mapped && number !== null) {
    return {
      kind: mapped,
      value: number,
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
  requireObject(options, "Trait modifier cost options must be object");
  const policy = {
    percentageMode: options.percentageMode ?? "additive",
    rounding: options.rounding ?? "up",
    limitationFloorPercent: LIMITATION_FLOOR_PERCENT,
  };
  validatePolicy(policy);
  return policy;
}

function validatePolicy(policy) {
  requireObject(policy, "Trait modifier cost policy must be object");
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
    requireObject(modifier, "Projected Trait modifier must be object");
    if (typeof modifier.id !== "string" || modifier.id === "") {
      throw new Error("Projected Trait modifier id must be non-empty string");
    }
    if (ids.has(modifier.id)) {
      throw new Error(`Duplicate projected Trait modifier id: ${modifier.id}`);
    }
    ids.add(modifier.id);

    if (!KINDS.includes(modifier.kind)) {
      throw new Error("Projected Trait modifier kind is invalid");
    }
    if (!AFFECTS.includes(modifier.affects)) {
      throw new Error("Projected Trait modifier affects is invalid");
    }
    if (typeof modifier.enabled !== "boolean") {
      throw new Error("Projected Trait modifier enabled must be boolean");
    }
    finite(
      modifier.levelMultiplier,
      "Projected Trait modifier levelMultiplier must be finite number",
    );

    if ([
      "addition",
      "percentage",
      "percentage-multiplier",
      "multiplier",
    ].includes(modifier.kind)) {
      finite(
        modifier.value,
        "Mechanical Trait modifier value must be finite number",
      );
    } else if (modifier.value !== null) {
      throw new Error("Non-mechanical Trait modifier value must be null");
    }
  }
}

function validateComponent(component, label) {
  requireObject(component, `Trait modifier ${label} component must be object`);
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
    finite(
      component[field],
      `Trait modifier ${label}.${field} must be finite number`,
    );
  }
}

function validateRounding(rounding) {
  requireObject(rounding, "Trait modifier rounding must be object");
  if (!ROUNDING_POLICIES.includes(rounding.policy)) {
    throw new Error("Trait modifier rounding policy is invalid");
  }
  if (typeof rounding.applied !== "boolean") {
    throw new Error("Trait modifier rounding applied must be boolean");
  }
  for (const field of ["input", "output", "difference"]) {
    finite(
      rounding[field],
      `Trait modifier rounding ${field} must be finite number`,
    );
  }
}

function round(value, policy) {
  const normalized = arithmetic(value);
  if (policy === "none") return normalized;
  return arithmetic(policy === "down" ? Math.floor(normalized) : Math.ceil(normalized));
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

function isLocallyEnabled(modifier) {
  return modifier.disabled !== true && modifier.enabled !== false;
}

function modifierId(value, path) {
  return typeof value === "string" && value !== ""
    ? value
    : `trait-modifier-${path.join("-")}`;
}

function positiveOrOne(value) {
  return value !== null && value > 0 ? value : 1;
}

function firstNumber(...values) {
  for (const value of values) {
    const number = numberOrNull(value);
    if (number !== null) return number;
  }
  return null;
}

function numberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsedValue = Number(value.trim().replaceAll(",", "."));
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }
  return null;
}

function first(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function finite(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(message);
  }
}

function requireObject(value, message) {
  if (!isObject(value)) throw new Error(message);
}

function arithmetic(value) {
  if (!Number.isFinite(value)) return value;
  const normalized = Number(value.toFixed(PRECISION_DIGITS));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function clone(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    for (const item of value) result.push(clone(item, seen));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      result[key] = clone(item, seen);
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

function freezeResult(result) {
  return deepFreeze(result);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
