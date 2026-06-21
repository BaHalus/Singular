import {
  createTrait,
  serializeTrait,
  validateTrait,
} from "./Traits.js";
import {
  reconcileTraitPointValue,
} from "./TraitPointValue.js";

const BASE_COST_STATUSES = [
  "ready",
  "incomplete",
  "conflict",
  "unsupported",
];

const BASE_COST_FORMULAS = [
  "fixed",
  "per-level",
  "base-plus-levels",
];

const ROUNDING_POLICY = "none";

export function evaluateTraitBaseCost(trait) {
  validateTrait(trait);

  const result = {
    traitId: trait.id,
    ...evaluatePointValueBaseCost(trait.pointValue),
  };

  validateTraitBaseCost(result);
  return deepFreeze(result);
}

export function withTraitCalculatedBaseCost(trait) {
  const calculation = evaluateTraitBaseCost(trait);
  if (calculation.status !== "ready") {
    throw new Error(
      `Trait base cost calculation requires ready status, received ${calculation.status}`,
    );
  }

  const serialized = serializeTrait(trait);
  const nextTrait = createTrait({
    ...serialized,
    pointValue: {
      ...serialized.pointValue,
      calculatedPoints: calculation.calculatedPoints,
    },
  });

  return deepFreeze({
    trait: nextTrait,
    calculation: evaluateTraitBaseCost(nextTrait),
    reconciliation: reconcileTraitPointValue(nextTrait.pointValue),
  });
}

export function validateTraitBaseCost(result) {
  if (!isPlainObject(result)) {
    throw new Error("Trait base cost evaluation must be object");
  }
  if (typeof result.traitId !== "string" || result.traitId === "") {
    throw new Error("Trait base cost traitId must be non-empty string");
  }
  if (!BASE_COST_STATUSES.includes(result.status)) {
    throw new Error("Trait base cost status is invalid");
  }
  if (typeof result.mode !== "string" || result.mode === "") {
    throw new Error("Trait base cost mode must be non-empty string");
  }
  if (
    result.formula !== null &&
    !BASE_COST_FORMULAS.includes(result.formula)
  ) {
    throw new Error("Trait base cost formula is invalid");
  }
  if (typeof result.complete !== "boolean") {
    throw new Error("Trait base cost complete must be boolean");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Trait base cost complete flag is inconsistent");
  }

  validateNullableFiniteNumber(
    result.rawPoints,
    "Trait base cost rawPoints must be finite number or null",
  );
  validateNullableFiniteNumber(
    result.calculatedPoints,
    "Trait base cost calculatedPoints must be finite number or null",
  );
  validateInputs(result.inputs);
  validateUniqueStringArray(
    result.missingFields,
    "Trait base cost missingFields must be unique string array",
  );
  validateUniqueStringArray(
    result.conflictingAuthorities,
    "Trait base cost conflictingAuthorities must be unique string array",
  );
  validateRounding(result.rounding);
  validateDiagnostics(result.diagnostics);

  if (result.status === "ready") {
    if (result.formula === null) {
      throw new Error("Ready Trait base cost must have formula");
    }
    if (result.rawPoints === null || result.calculatedPoints === null) {
      throw new Error("Ready Trait base cost must have calculated points");
    }
    if (!Object.is(result.rawPoints, result.calculatedPoints)) {
      throw new Error("Trait base cost must preserve raw points before modifiers");
    }
    if (result.missingFields.length > 0) {
      throw new Error("Ready Trait base cost cannot have missing fields");
    }
    if (result.conflictingAuthorities.length > 0) {
      throw new Error("Ready Trait base cost cannot have conflicting authorities");
    }
    validateFormulaResult(result);
  } else {
    if (result.formula !== null && result.status === "unsupported") {
      throw new Error("Unsupported Trait base cost cannot have formula");
    }
    if (result.rawPoints !== null || result.calculatedPoints !== null) {
      throw new Error("Non-ready Trait base cost cannot expose calculated points");
    }
  }

  return true;
}

export function serializeTraitBaseCost(result) {
  validateTraitBaseCost(result);
  return cloneValue(result);
}

export function getTraitBaseCostStatuses() {
  return [...BASE_COST_STATUSES];
}

export function getTraitBaseCostFormulas() {
  return [...BASE_COST_FORMULAS];
}

export function getTraitBaseCostRoundingPolicy() {
  return ROUNDING_POLICY;
}

function evaluatePointValueBaseCost(pointValue) {
  switch (pointValue.mode) {
    case "total":
      return evaluateFixedCost(pointValue);
    case "per-level":
      return evaluatePerLevelCost(pointValue);
    case "base-plus-levels":
      return evaluateBasePlusLevelsCost(pointValue);
    default:
      return createPendingResult({
        status: "unsupported",
        mode: pointValue.mode,
        formula: null,
        inputs: createInputs(pointValue),
        diagnostics: [{
          code: "trait-base-cost-mode-unsupported",
          severity: "pending",
          mode: pointValue.mode,
        }],
      });
  }
}

function evaluateFixedCost(pointValue) {
  const inputs = createInputs(pointValue);

  if (pointValue.basePoints !== null) {
    const fixedPoints = requireFiniteNumber(
      pointValue.basePoints,
      "Trait fixed basePoints must be finite number",
    );
    return createReadyResult({
      mode: pointValue.mode,
      formula: "fixed",
      inputs: {
        ...inputs,
        fixedPoints,
        fixedAuthority: "basePoints",
      },
      rawPoints: fixedPoints,
    });
  }

  const authorities = [
    ["declaredPoints", pointValue.declaredPoints],
    ["importedPoints", pointValue.importedPoints],
  ].filter(([, value]) => value !== null);

  if (authorities.length === 0) {
    const legacyEvidenceOnly = pointValue.legacyPoints !== null;
    return createPendingResult({
      status: "incomplete",
      mode: pointValue.mode,
      formula: "fixed",
      inputs,
      missingFields: ["basePoints", "declaredPoints", "importedPoints"],
      diagnostics: [{
        code: legacyEvidenceOnly
          ? "trait-base-cost-legacy-evidence-only"
          : "trait-base-cost-fixed-value-missing",
        severity: "pending",
      }],
    });
  }

  const normalizedAuthorities = authorities.map(([name, value]) => [
    name,
    requireFiniteNumber(value, `Trait ${name} must be finite number`),
  ]);
  const firstValue = normalizeZero(normalizedAuthorities[0][1]);
  const divergent = normalizedAuthorities.some(([, value]) => (
    normalizeZero(value) !== firstValue
  ));

  if (divergent) {
    return createPendingResult({
      status: "conflict",
      mode: pointValue.mode,
      formula: "fixed",
      inputs,
      conflictingAuthorities: normalizedAuthorities.map(([name]) => name),
      diagnostics: [{
        code: "trait-base-cost-fixed-authorities-divergent",
        severity: "warning",
        authorities: normalizedAuthorities.map(([name]) => name),
      }],
    });
  }

  const fixedAuthority = normalizedAuthorities.length === 1
    ? normalizedAuthorities[0][0]
    : "reconciled-authorities";

  return createReadyResult({
    mode: pointValue.mode,
    formula: "fixed",
    inputs: {
      ...inputs,
      fixedPoints: firstValue,
      fixedAuthority,
    },
    rawPoints: firstValue,
  });
}

function evaluatePerLevelCost(pointValue) {
  const requiredFields = ["pointsPerLevel", "levels"];
  const missingFields = requiredFields.filter(field => pointValue[field] === null);
  const inputs = createInputs(pointValue);

  if (missingFields.length > 0) {
    return createPendingResult({
      status: "incomplete",
      mode: pointValue.mode,
      formula: "per-level",
      inputs,
      missingFields,
      diagnostics: [{
        code: "trait-base-cost-level-inputs-incomplete",
        severity: "pending",
        fields: [...missingFields],
      }],
    });
  }

  const pointsPerLevel = requireFiniteNumber(
    pointValue.pointsPerLevel,
    "Trait pointsPerLevel must be finite number",
  );
  const levels = requireFiniteNumber(
    pointValue.levels,
    "Trait levels must be finite number",
  );

  return createReadyResult({
    mode: pointValue.mode,
    formula: "per-level",
    inputs,
    rawPoints: normalizeZero(pointsPerLevel * levels),
  });
}

function evaluateBasePlusLevelsCost(pointValue) {
  const requiredFields = ["basePoints", "pointsPerLevel", "levels"];
  const missingFields = requiredFields.filter(field => pointValue[field] === null);
  const inputs = createInputs(pointValue);

  if (missingFields.length > 0) {
    return createPendingResult({
      status: "incomplete",
      mode: pointValue.mode,
      formula: "base-plus-levels",
      inputs,
      missingFields,
      diagnostics: [{
        code: "trait-base-cost-level-inputs-incomplete",
        severity: "pending",
        fields: [...missingFields],
      }],
    });
  }

  const basePoints = requireFiniteNumber(
    pointValue.basePoints,
    "Trait basePoints must be finite number",
  );
  const pointsPerLevel = requireFiniteNumber(
    pointValue.pointsPerLevel,
    "Trait pointsPerLevel must be finite number",
  );
  const levels = requireFiniteNumber(
    pointValue.levels,
    "Trait levels must be finite number",
  );

  return createReadyResult({
    mode: pointValue.mode,
    formula: "base-plus-levels",
    inputs,
    rawPoints: normalizeZero(basePoints + (pointsPerLevel * levels)),
  });
}

function createReadyResult({ mode, formula, inputs, rawPoints }) {
  const normalized = normalizeZero(requireFiniteNumber(
    rawPoints,
    "Trait base cost result must be finite number",
  ));

  return {
    status: "ready",
    mode,
    formula,
    complete: true,
    inputs,
    rawPoints: normalized,
    calculatedPoints: normalized,
    rounding: createRounding(normalized),
    missingFields: [],
    conflictingAuthorities: [],
    diagnostics: [],
  };
}

function createPendingResult({
  status,
  mode,
  formula,
  inputs,
  missingFields = [],
  conflictingAuthorities = [],
  diagnostics = [],
}) {
  return {
    status,
    mode,
    formula,
    complete: false,
    inputs,
    rawPoints: null,
    calculatedPoints: null,
    rounding: createRounding(null),
    missingFields: [...missingFields],
    conflictingAuthorities: [...conflictingAuthorities],
    diagnostics: cloneValue(diagnostics),
  };
}

function createInputs(pointValue) {
  return {
    fixedPoints: null,
    fixedAuthority: null,
    basePoints: pointValue.basePoints,
    pointsPerLevel: pointValue.pointsPerLevel,
    levels: pointValue.levels,
  };
}

function createRounding(value) {
  return {
    policy: ROUNDING_POLICY,
    applied: false,
    input: value,
    output: value,
    difference: value === null ? null : 0,
  };
}

function validateInputs(inputs) {
  if (!isPlainObject(inputs)) {
    throw new Error("Trait base cost inputs must be object");
  }
  validateNullableFiniteNumber(
    inputs.fixedPoints,
    "Trait base cost fixedPoints must be finite number or null",
  );
  validateNullableFiniteNumber(
    inputs.basePoints,
    "Trait base cost basePoints must be finite number or null",
  );
  validateNullableFiniteNumber(
    inputs.pointsPerLevel,
    "Trait base cost pointsPerLevel must be finite number or null",
  );
  validateNullableFiniteNumber(
    inputs.levels,
    "Trait base cost levels must be finite number or null",
  );
  if (
    inputs.fixedAuthority !== null &&
    (typeof inputs.fixedAuthority !== "string" || inputs.fixedAuthority === "")
  ) {
    throw new Error("Trait base cost fixedAuthority must be string or null");
  }
}

function validateRounding(rounding) {
  if (!isPlainObject(rounding)) {
    throw new Error("Trait base cost rounding must be object");
  }
  if (rounding.policy !== ROUNDING_POLICY) {
    throw new Error("Trait base cost rounding policy must be none");
  }
  if (rounding.applied !== false) {
    throw new Error("Trait base cost rounding cannot be applied");
  }
  validateNullableFiniteNumber(
    rounding.input,
    "Trait base cost rounding input must be finite number or null",
  );
  validateNullableFiniteNumber(
    rounding.output,
    "Trait base cost rounding output must be finite number or null",
  );
  validateNullableFiniteNumber(
    rounding.difference,
    "Trait base cost rounding difference must be finite number or null",
  );
  if (!Object.is(rounding.input, rounding.output)) {
    throw new Error("Trait base cost rounding output must preserve input");
  }
  const expectedDifference = rounding.input === null ? null : 0;
  if (!Object.is(rounding.difference, expectedDifference)) {
    throw new Error("Trait base cost rounding difference is inconsistent");
  }
}

function validateDiagnostics(diagnostics) {
  if (!Array.isArray(diagnostics)) {
    throw new Error("Trait base cost diagnostics must be array");
  }
  for (const diagnostic of diagnostics) {
    if (!isPlainObject(diagnostic)) {
      throw new Error("Trait base cost diagnostic must be object");
    }
    if (typeof diagnostic.code !== "string" || diagnostic.code === "") {
      throw new Error("Trait base cost diagnostic code must be non-empty string");
    }
    if (!["pending", "warning"].includes(diagnostic.severity)) {
      throw new Error("Trait base cost diagnostic severity is invalid");
    }
  }
}

function validateFormulaResult(result) {
  const inputs = result.inputs;
  let expected;

  if (result.formula === "fixed") {
    expected = inputs.fixedPoints;
  } else if (result.formula === "per-level") {
    expected = inputs.pointsPerLevel * inputs.levels;
  } else {
    expected = inputs.basePoints + (inputs.pointsPerLevel * inputs.levels);
  }

  if (!Object.is(result.rawPoints, normalizeZero(expected))) {
    throw new Error("Trait base cost formula result is inconsistent");
  }
}

function validateNullableFiniteNumber(value, message) {
  if (value === null) return;
  if (!Number.isFinite(value)) throw new Error(message);
}

function validateUniqueStringArray(value, message) {
  if (!Array.isArray(value)) throw new Error(message);
  if (value.some(item => typeof item !== "string" || item === "")) {
    throw new Error(message);
  }
  if (new Set(value).size !== value.length) throw new Error(message);
}

function requireFiniteNumber(value, message) {
  if (!Number.isFinite(value)) throw new Error(message);
  return value;
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
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
