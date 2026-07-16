const SCHEMA_VERSION = 1;

const CONSTRUCTION_PHASES = Object.freeze([
  "base-and-levels",
  "additive",
  "own-factor",
  "percentage",
  "normal-cost",
]);
const PRICING_PHASES = Object.freeze([
  "normal-cost",
  "pre-alternative",
  "alternative-group",
  "paid-cost",
]);
const CONSTRUCTION_OPERATIONS = new Set([
  "addition",
  "multiplier",
  "divisor",
  "percentage",
]);
const CONSTRUCTION_TARGETS = new Set([
  "base",
  "levels",
  "total",
  "baseCost",
  "baseWeight",
]);
const PRICING_RULES = new Set([
  "one-use",
  "character-point-activation",
  "alternative-ability",
]);
const PRICING_SCOPES = new Set(["trait", "trait-group"]);
const BREAKDOWN_STAGES = new Set(["construction", "pricing"]);
const ROUNDING_POLICIES = new Set(["none", "ceil"]);

export function getModifierFrameworkSchemaVersion() {
  return SCHEMA_VERSION;
}

export function createModifierFrameworkContract() {
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    construction: {
      phases: [...CONSTRUCTION_PHASES],
      output: "normalCost",
      structuralPricingAllowed: false,
    },
    pricing: {
      phases: [...PRICING_PHASES],
      input: "normalCost",
      output: "paidCost",
      primarySelectionBasis: "post-pre-alternative-pricing",
      globalRoundingAllowed: false,
    },
    snapshots: {
      currentVersion: SCHEMA_VERSION,
      minimumReadableVersion: SCHEMA_VERSION,
      unknownVersionPolicy: "reject",
    },
  });
}

export function validateModifierFrameworkContract(contract) {
  requireObject(contract, "Modifier framework contract");
  requireVersion(contract.schemaVersion);
  requireExactArray(
    contract.construction?.phases,
    CONSTRUCTION_PHASES,
    "Construction phases",
  );
  if (
    contract.construction.output !== "normalCost" ||
    contract.construction.structuralPricingAllowed !== false
  ) {
    throw new Error("Construction contract must end at normalCost");
  }
  requireExactArray(contract.pricing?.phases, PRICING_PHASES, "Pricing phases");
  if (
    contract.pricing.input !== "normalCost" ||
    contract.pricing.output !== "paidCost" ||
    contract.pricing.primarySelectionBasis !==
      "post-pre-alternative-pricing" ||
    contract.pricing.globalRoundingAllowed !== false
  ) {
    throw new Error("Pricing contract is invalid");
  }
  if (
    contract.snapshots?.currentVersion !== SCHEMA_VERSION ||
    contract.snapshots?.minimumReadableVersion !== SCHEMA_VERSION ||
    contract.snapshots?.unknownVersionPolicy !== "reject"
  ) {
    throw new Error("Modifier framework snapshot policy is invalid");
  }
  assertPortable(contract, "Modifier framework contract");
  return true;
}

export function createConstructionModifier(input = {}) {
  requireObject(input, "Construction modifier");
  const operation = requireMember(
    input.operation,
    CONSTRUCTION_OPERATIONS,
    "Construction modifier operation",
  );
  const target = requireMember(
    input.target,
    CONSTRUCTION_TARGETS,
    "Construction modifier target",
  );
  const value = requireFinite(input.value, "Construction modifier value");
  if (operation === "divisor" && value <= 0) {
    throw new Error("Construction divisor must be positive");
  }

  const modifier = {
    schemaVersion: SCHEMA_VERSION,
    id: requireString(input.id, "Construction modifier id"),
    operation,
    target,
    value,
    enabled: input.enabled !== false,
    source: clonePortable(input.source ?? null),
  };
  validateConstructionModifier(modifier);
  return deepFreeze(modifier);
}

export function validateConstructionModifier(modifier) {
  requireObject(modifier, "Construction modifier");
  requireVersion(modifier.schemaVersion);
  requireString(modifier.id, "Construction modifier id");
  requireMember(
    modifier.operation,
    CONSTRUCTION_OPERATIONS,
    "Construction modifier operation",
  );
  requireMember(
    modifier.target,
    CONSTRUCTION_TARGETS,
    "Construction modifier target",
  );
  const value = requireFinite(
    modifier.value,
    "Construction modifier value",
  );
  if (modifier.operation === "divisor" && value <= 0) {
    throw new Error("Construction divisor must be positive");
  }
  if (typeof modifier.enabled !== "boolean") {
    throw new Error("Construction modifier enabled must be boolean");
  }
  assertPortable(modifier.source, "Construction modifier source");
  assertPortable(modifier, "Construction modifier");
  return true;
}

export function serializeConstructionModifier(modifier) {
  validateConstructionModifier(modifier);
  return clonePortable(modifier);
}

export function createPricingRule(input = {}) {
  requireObject(input, "Pricing rule");
  const rule = requireMember(
    input.rule,
    PRICING_RULES,
    "Pricing rule kind",
  );
  const scope = requireMember(
    input.scope,
    PRICING_SCOPES,
    "Pricing rule scope",
  );
  if (input.domain === "equipment") {
    throw new Error("Equipment cannot use character-point pricing rules");
  }
  const divisor = input.divisor ?? 5;
  if (divisor !== 5) {
    throw new Error("Canonical pricing divisor must be 5");
  }
  const rounding = input.rounding ?? "ceil";
  if (rounding !== "ceil") {
    throw new Error("Structural pricing must round up inside its mechanism");
  }

  const pricingRule = {
    schemaVersion: SCHEMA_VERSION,
    id: requireString(input.id, "Pricing rule id"),
    rule,
    scope,
    domain: "trait",
    divisor,
    rounding,
    enabled: input.enabled !== false,
    source: clonePortable(input.source ?? null),
  };
  validatePricingRule(pricingRule);
  return deepFreeze(pricingRule);
}

export function validatePricingRule(rule) {
  requireObject(rule, "Pricing rule");
  requireVersion(rule.schemaVersion);
  requireString(rule.id, "Pricing rule id");
  requireMember(rule.rule, PRICING_RULES, "Pricing rule kind");
  requireMember(rule.scope, PRICING_SCOPES, "Pricing rule scope");
  if (rule.domain !== "trait") {
    throw new Error("Pricing rule domain must be trait");
  }
  if (rule.divisor !== 5 || rule.rounding !== "ceil") {
    throw new Error("Pricing rule must divide by 5 and round up locally");
  }
  if (typeof rule.enabled !== "boolean") {
    throw new Error("Pricing rule enabled must be boolean");
  }
  assertPortable(rule.source, "Pricing rule source");
  assertPortable(rule, "Pricing rule");
  return true;
}

export function serializePricingRule(rule) {
  validatePricingRule(rule);
  return clonePortable(rule);
}

export function createModifierBreakdownStep(input = {}) {
  requireObject(input, "Modifier breakdown step");
  const stage = requireMember(
    input.stage,
    BREAKDOWN_STAGES,
    "Modifier breakdown stage",
  );
  const allowedPhases = stage === "construction"
    ? new Set(CONSTRUCTION_PHASES)
    : new Set(PRICING_PHASES);
  const phase = requireMember(
    input.phase,
    allowedPhases,
    "Modifier breakdown phase",
  );
  const rounding = normalizeRounding(input.rounding, stage);
  const step = {
    schemaVersion: SCHEMA_VERSION,
    sequence: requireNonNegativeInteger(
      input.sequence,
      "Modifier breakdown sequence",
    ),
    stage,
    phase,
    ruleId: requireString(input.ruleId, "Modifier breakdown ruleId"),
    inputValue: requireFinite(input.inputValue, "Modifier breakdown inputValue"),
    outputValue: requireFinite(
      input.outputValue,
      "Modifier breakdown outputValue",
    ),
    applied: input.applied !== false,
    reason: normalizeNullableString(input.reason),
    rounding,
    source: clonePortable(input.source ?? null),
  };
  validateModifierBreakdownStep(step);
  return deepFreeze(step);
}

export function validateModifierBreakdownStep(step) {
  requireObject(step, "Modifier breakdown step");
  requireVersion(step.schemaVersion);
  requireNonNegativeInteger(
    step.sequence,
    "Modifier breakdown sequence",
  );
  requireMember(step.stage, BREAKDOWN_STAGES, "Modifier breakdown stage");
  requireMember(
    step.phase,
    step.stage === "construction"
      ? new Set(CONSTRUCTION_PHASES)
      : new Set(PRICING_PHASES),
    "Modifier breakdown phase",
  );
  requireString(step.ruleId, "Modifier breakdown ruleId");
  requireFinite(step.inputValue, "Modifier breakdown inputValue");
  requireFinite(step.outputValue, "Modifier breakdown outputValue");
  if (typeof step.applied !== "boolean") {
    throw new Error("Modifier breakdown applied must be boolean");
  }
  normalizeNullableString(step.reason);
  normalizeRounding(step.rounding, step.stage);
  assertPortable(step.source, "Modifier breakdown source");
  assertPortable(step, "Modifier breakdown step");
  return true;
}

export function createModifierBreakdown(input = {}) {
  requireObject(input, "Modifier breakdown");
  if (!Array.isArray(input.steps)) {
    throw new Error("Modifier breakdown steps must be array");
  }
  const steps = input.steps.map(createModifierBreakdownStep);
  steps.forEach((step, index) => {
    if (step.sequence !== index) {
      throw new Error("Modifier breakdown sequence must be dense and ordered");
    }
  });
  const breakdown = {
    schemaVersion: SCHEMA_VERSION,
    normalCost: requireFinite(input.normalCost, "Modifier breakdown normalCost"),
    paidCost: input.paidCost === null || input.paidCost === undefined
      ? null
      : requireFinite(input.paidCost, "Modifier breakdown paidCost"),
    steps,
    diagnostics: clonePortable(input.diagnostics ?? []),
  };
  assertPortable(breakdown.diagnostics, "Modifier breakdown diagnostics");
  return deepFreeze(breakdown);
}

function normalizeRounding(value, stage) {
  const rounding = value ?? { policy: "none", mechanism: null };
  requireObject(rounding, "Modifier breakdown rounding");
  const policy = requireMember(
    rounding.policy,
    ROUNDING_POLICIES,
    "Modifier breakdown rounding policy",
  );
  const mechanism = normalizeNullableString(rounding.mechanism);
  if (stage === "construction" && (policy !== "none" || mechanism !== null)) {
    throw new Error("Construction breakdown cannot apply structural rounding");
  }
  if (stage === "pricing" && policy === "ceil" && mechanism === null) {
    throw new Error("Pricing rounding must identify its mechanism");
  }
  if (policy === "none" && mechanism !== null) {
    throw new Error("Non-rounding step cannot name a rounding mechanism");
  }
  return { policy, mechanism };
}

function requireVersion(value) {
  if (value !== SCHEMA_VERSION) {
    throw new Error("Modifier framework schemaVersion is invalid");
  }
}

function requireExactArray(value, expected, label) {
  if (
    !Array.isArray(value) ||
    value.length !== expected.length ||
    value.some((item, index) => item !== expected[index])
  ) {
    throw new Error(`${label} must preserve canonical order`);
  }
}

function requireMember(value, values, label) {
  if (!values.has(value)) throw new Error(`${label} is invalid`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be non-empty string`);
  }
  return value.trim();
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("Expected string or null");
  return value;
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

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(`${label} must be plain object`);
  }
}

function clonePortable(value, seen = new WeakMap()) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Value must be JSON portable");
    return value;
  }
  if (typeof value !== "object") throw new Error("Value must be JSON portable");
  if (seen.has(value)) throw new Error("Value must not contain cycles");
  const clone = Array.isArray(value) ? [] : {};
  if (!Array.isArray(value)) requireObject(value, "Portable value");
  seen.set(value, clone);
  for (const [key, item] of Object.entries(value)) {
    clone[key] = clonePortable(item, seen);
  }
  seen.delete(value);
  return clone;
}

function assertPortable(value, label) {
  try {
    clonePortable(value);
  } catch (error) {
    throw new Error(`${label} must be JSON portable: ${error.message}`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
