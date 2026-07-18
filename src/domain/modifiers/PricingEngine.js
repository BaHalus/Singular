import {
  createModifierBreakdown,
  createModifierBreakdownStep,
  createPricingRule,
  getModifierFrameworkSchemaVersion,
} from "./ModifierFrameworkModel.js";

const PRE_ALTERNATIVE_RULE_ORDER = Object.freeze({
  "one-use": 0,
  "character-point-activation": 1,
});
const ARITHMETIC_PRECISION_DIGITS = 12;

export function calculatePricing(input = {}) {
  requirePlainObject(input, "Pricing input");
  if (!Array.isArray(input.traits) || input.traits.length === 0) {
    throw new Error("Pricing traits must be non-empty array");
  }
  if (!Array.isArray(input.groupRules ?? [])) {
    throw new Error("Pricing groupRules must be array");
  }

  const traits = input.traits.map(normalizeTrait);
  rejectDuplicateIds(traits, "Pricing trait id");
  const groupRules = (input.groupRules ?? []).map(createPricingRule);
  rejectDuplicateIds(groupRules, "Pricing group rule id");
  if (groupRules.some(rule => rule.rule !== "alternative-ability")) {
    throw new Error("Pricing groupRules may only contain alternative-ability");
  }
  if (groupRules.length > 1) {
    throw new Error("Pricing group may contain only one alternative-ability rule");
  }

  const prepared = traits.map(applyPreAlternativePricing);
  const alternativeRule = groupRules[0] ?? null;
  const primaryTraitId = resolvePrimary(prepared, alternativeRule);
  const pricedTraits = prepared.map(item =>
    applyAlternativePricing(item, alternativeRule, primaryTraitId)
  );

  return deepFreeze({
    schemaVersion: getModifierFrameworkSchemaVersion(),
    primarySelectionBasis: "post-pre-alternative-pricing",
    primaryTraitId,
    traits: pricedTraits,
    totalPaidCost: pricedTraits.reduce((sum, item) => sum + item.paidCost, 0),
    diagnostics: alternativeRule && alternativeRule.enabled
      ? [{
          code: "PRICING_PRIMARY_SELECTED",
          primaryTraitId,
          basis: "post-pre-alternative-pricing",
          tieBreak: "lexicographically-lowest-trait-id",
        }]
      : [],
  });
}

function normalizeTrait(input, sourceIndex) {
  requirePlainObject(input, "Pricing trait");
  const id = requireString(input.id, "Pricing trait id");
  const normalCost = requireFinite(input.normalCost, "Pricing trait normalCost");
  if (normalCost < 0) {
    throw new Error("Pricing trait normalCost must be non-negative");
  }
  if (!Array.isArray(input.rules ?? [])) {
    throw new Error("Pricing trait rules must be array");
  }
  if (
    input.isPrimaryAlternative !== undefined &&
    input.isPrimaryAlternative !== null &&
    typeof input.isPrimaryAlternative !== "boolean"
  ) {
    throw new Error("Pricing trait isPrimaryAlternative must be boolean or null");
  }

  const rules = (input.rules ?? []).map(createPricingRule);
  rejectDuplicateIds(rules, "Pricing trait rule id");
  if (rules.some(rule => rule.rule === "alternative-ability")) {
    throw new Error("Alternative-ability must be declared as a group rule");
  }
  const kinds = new Set();
  for (const rule of rules) {
    if (kinds.has(rule.rule)) {
      throw new Error(`Pricing trait may contain only one ${rule.rule} rule`);
    }
    kinds.add(rule.rule);
  }

  return {
    id,
    sourceIndex,
    normalCost,
    isPrimaryAlternative: input.isPrimaryAlternative ?? null,
    rules: rules
      .map((rule, index) => ({ rule, index }))
      .sort((left, right) =>
        PRE_ALTERNATIVE_RULE_ORDER[left.rule.rule] -
          PRE_ALTERNATIVE_RULE_ORDER[right.rule.rule] ||
        left.index - right.index
      )
      .map(item => item.rule),
    source: clonePortable(input.source ?? null),
  };
}

function applyPreAlternativePricing(trait) {
  let current = trait.normalCost;
  const steps = [createModifierBreakdownStep({
    sequence: 0,
    stage: "pricing",
    phase: "normal-cost",
    ruleId: "pricing:normal-cost",
    inputValue: trait.normalCost,
    outputValue: trait.normalCost,
    source: { traitId: trait.id, declaredSource: trait.source },
  })];
  const diagnostics = [];

  for (const rule of trait.rules) {
    const before = current;
    const applied = rule.enabled;
    const unroundedValue = normalizeArithmetic(before / rule.divisor);
    if (applied) current = Math.ceil(unroundedValue);
    else diagnostics.push({
      code: "PRICING_RULE_DISABLED",
      traitId: trait.id,
      ruleId: rule.id,
    });
    steps.push(createModifierBreakdownStep({
      sequence: steps.length,
      stage: "pricing",
      phase: "pre-alternative",
      ruleId: rule.id,
      inputValue: before,
      outputValue: current,
      applied,
      reason: applied ? null : "rule-disabled",
      rounding: applied
        ? { policy: "ceil", mechanism: rule.rule }
        : { policy: "none", mechanism: null },
      source: {
        traitId: trait.id,
        rule: rule.rule,
        divisor: rule.divisor,
        unroundedValue,
        declaredSource: rule.source,
      },
    }));
  }

  return { ...trait, preAlternativeBasis: current, steps, diagnostics };
}

function resolvePrimary(traits, alternativeRule) {
  if (!alternativeRule || !alternativeRule.enabled) return null;
  if (traits.length < 2) {
    throw new Error("Alternative-ability pricing requires at least two traits");
  }
  const normalizedBases = new Map(traits.map(item => [
    item.id,
    normalizeArithmetic(item.preAlternativeBasis),
  ]));
  const maximum = Math.max(...normalizedBases.values());
  const candidates = traits.filter(item => normalizedBases.get(item.id) === maximum);
  const explicit = traits.filter(item => item.isPrimaryAlternative === true);
  if (explicit.length > 1) {
    throw new Error("Alternative-ability group cannot declare multiple primaries");
  }
  if (explicit.length === 1 && !candidates.includes(explicit[0])) {
    throw new Error("Alternative-ability primary must have maximum reduced basis");
  }
  return explicit[0]?.id ?? [...candidates]
    .sort((left, right) => left.id.localeCompare(right.id))[0].id;
}

function applyAlternativePricing(item, rule, primaryTraitId) {
  let current = item.preAlternativeBasis;
  const steps = [...item.steps];
  const diagnostics = [...item.diagnostics];
  let role = "standalone";

  if (rule) {
    const before = current;
    const enabled = rule.enabled;
    const isPrimary = enabled && item.id === primaryTraitId;
    role = enabled ? (isPrimary ? "primary" : "alternative") : "standalone";
    const unroundedValue = normalizeArithmetic(before / rule.divisor);
    if (enabled && !isPrimary) current = Math.ceil(unroundedValue);
    if (!enabled) diagnostics.push({
      code: "PRICING_RULE_DISABLED",
      traitId: item.id,
      ruleId: rule.id,
    });
    steps.push(createModifierBreakdownStep({
      sequence: steps.length,
      stage: "pricing",
      phase: "alternative-group",
      ruleId: rule.id,
      inputValue: before,
      outputValue: current,
      applied: enabled,
      reason: enabled ? null : "rule-disabled",
      rounding: enabled && !isPrimary
        ? { policy: "ceil", mechanism: "alternative-ability" }
        : { policy: "none", mechanism: null },
      source: {
        traitId: item.id,
        primaryTraitId,
        groupRole: role,
        primarySelectionBasis: "post-pre-alternative-pricing",
        divisor: rule.divisor,
        unroundedValue,
        declaredSource: rule.source,
      },
    }));
  }

  steps.push(createModifierBreakdownStep({
    sequence: steps.length,
    stage: "pricing",
    phase: "paid-cost",
    ruleId: "pricing:paid-cost",
    inputValue: current,
    outputValue: current,
    source: {
      traitId: item.id,
      normalCost: item.normalCost,
      preAlternativeBasis: item.preAlternativeBasis,
      groupRole: role,
    },
  }));

  const breakdown = createModifierBreakdown({
    normalCost: item.normalCost,
    paidCost: current,
    steps,
    diagnostics,
  });
  return {
    id: item.id,
    normalCost: item.normalCost,
    preAlternativeBasis: item.preAlternativeBasis,
    paidCost: current,
    groupRole: role,
    breakdown,
    diagnostics: breakdown.diagnostics,
  };
}

function rejectDuplicateIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`${label} must be unique: ${item.id}`);
    ids.add(item.id);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be non-empty string`);
  }
  return value.trim();
}

function requireFinite(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be finite number`);
  }
  return value;
}

function normalizeArithmetic(value) {
  if (!Number.isFinite(value)) return value;
  const normalized = Number(value.toFixed(ARITHMETIC_PRECISION_DIGITS));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function requirePlainObject(value, label) {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) throw new Error(`${label} must be plain object`);
}

function clonePortable(value) {
  if (value === null || ["string", "boolean"].includes(typeof value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object") throw new Error("Pricing source must be JSON portable");
  if (Array.isArray(value)) return value.map(clonePortable);
  requirePlainObject(value, "Pricing source");
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clonePortable(item)]));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
