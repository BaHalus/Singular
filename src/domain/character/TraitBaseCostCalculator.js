const CALCULATION_SCHEMA_VERSION = 1;

const KNOWN_CALCULATION_STATUSES = [
  "calculated",
  "incomplete",
  "unsupported",
  "conflict",
];

const KNOWN_ROUNDING_POLICIES = [
  "none",
  "ceiling",
  "floor",
  "nearest",
  "toward-zero",
  "away-from-zero",
];

const KNOWN_BASE_COST_MODES = [
  "total",
  "per-level",
  "base-plus-levels",
];

export class TraitBaseCostCalculationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TraitBaseCostCalculationError";
    this.code = code;
    this.details = details;
  }
}

export function calculateTraitBaseCost(pointValue, options = {}) {
  validatePointValueInput(pointValue);
  const rounding = normalizeRoundingOptions(options);
  const input = snapshotCalculationInput(pointValue);
  const diagnostics = [];
  let status = "calculated";
  let rawPoints = null;

  if (!KNOWN_BASE_COST_MODES.includes(pointValue.mode)) {
    status = "unsupported";
    diagnostics.push({
      code: "trait-base-cost-mode-unsupported",
      severity: "blocked",
      mode: pointValue.mode,
    });
  } else if (pointValue.mode === "total") {
    const fixedResult = resolveFixedCost(pointValue);
    status = fixedResult.status;
    rawPoints = fixedResult.rawPoints;
    diagnostics.push(...fixedResult.diagnostics);
  } else if (pointValue.mode === "per-level") {
    const perLevelResult = resolvePerLevelCost(pointValue);
    status = perLevelResult.status;
    rawPoints = perLevelResult.rawPoints;
    diagnostics.push(...perLevelResult.diagnostics);
  } else {
    const basePlusLevelsResult = resolveBasePlusLevelsCost(pointValue);
    status = basePlusLevelsResult.status;
    rawPoints = basePlusLevelsResult.rawPoints;
    diagnostics.push(...basePlusLevelsResult.diagnostics);
  }

  const calculatedPoints = status === "calculated"
    ? applyRounding(rawPoints, rounding)
    : null;
  const calculation = {
    schemaVersion: CALCULATION_SCHEMA_VERSION,
    status,
    mode: pointValue.mode,
    input,
    inputFingerprint: createTraitBaseCostInputFingerprint(pointValue, rounding),
    rawPoints,
    calculatedPoints,
    rounding: {
      policy: rounding.policy,
      increment: rounding.increment,
      applied: status === "calculated" && !Object.is(rawPoints, calculatedPoints),
    },
    diagnostics,
  };

  validateTraitBaseCostCalculation(calculation);
  return deepFreeze(calculation);
}

export function requireCalculatedTraitBaseCost(pointValue, options = {}) {
  const calculation = calculateTraitBaseCost(pointValue, options);
  if (calculation.status !== "calculated") {
    throw new TraitBaseCostCalculationError(
      statusToErrorCode(calculation.status),
      "Trait base cost cannot be calculated from the current declaration",
      { calculation },
    );
  }
  return calculation;
}

export function validateTraitBaseCostCalculation(calculation) {
  if (!isPlainObject(calculation)) {
    throw new Error("Trait base cost calculation must be object");
  }
  if (calculation.schemaVersion !== CALCULATION_SCHEMA_VERSION) {
    throw new Error("Trait base cost calculation schemaVersion is invalid");
  }
  if (!KNOWN_CALCULATION_STATUSES.includes(calculation.status)) {
    throw new Error("Trait base cost calculation status is invalid");
  }
  if (typeof calculation.mode !== "string" || calculation.mode === "") {
    throw new Error("Trait base cost calculation mode must be non-empty string");
  }
  if (!isPlainObject(calculation.input)) {
    throw new Error("Trait base cost calculation input must be object");
  }
  validateCalculationInput(calculation.input);
  if (typeof calculation.inputFingerprint !== "string" || calculation.inputFingerprint === "") {
    throw new Error("Trait base cost calculation inputFingerprint is required");
  }
  validateNullableFiniteNumber(
    calculation.rawPoints,
    "Trait base cost rawPoints must be finite number or null",
  );
  validateNullableFiniteNumber(
    calculation.calculatedPoints,
    "Trait base cost calculatedPoints must be finite number or null",
  );
  validateRoundingSnapshot(calculation.rounding);
  if (!Array.isArray(calculation.diagnostics)) {
    throw new Error("Trait base cost diagnostics must be array");
  }
  for (const diagnostic of calculation.diagnostics) {
    if (!isPlainObject(diagnostic)) {
      throw new Error("Trait base cost diagnostic must be object");
    }
    if (typeof diagnostic.code !== "string" || diagnostic.code === "") {
      throw new Error("Trait base cost diagnostic code is required");
    }
    if (!["info", "warning", "pending", "blocked"].includes(diagnostic.severity)) {
      throw new Error("Trait base cost diagnostic severity is invalid");
    }
  }

  if (calculation.status === "calculated") {
    if (calculation.rawPoints === null || calculation.calculatedPoints === null) {
      throw new Error("Calculated Trait base cost requires raw and calculated points");
    }
    const expectedCalculated = applyRounding(calculation.rawPoints, calculation.rounding);
    if (!Object.is(calculation.calculatedPoints, expectedCalculated)) {
      throw new Error("Trait base cost calculatedPoints is inconsistent with rounding");
    }
  } else if (calculation.rawPoints !== null || calculation.calculatedPoints !== null) {
    throw new Error("Uncalculated Trait base cost cannot expose point results");
  }

  const expectedApplied = (
    calculation.status === "calculated" &&
    !Object.is(calculation.rawPoints, calculation.calculatedPoints)
  );
  if (calculation.rounding.applied !== expectedApplied) {
    throw new Error("Trait base cost rounding applied flag is inconsistent");
  }

  return true;
}

export function validateTraitBaseCostCalculationForPointValue(
  calculation,
  pointValue,
) {
  validateTraitBaseCostCalculation(calculation);
  validatePointValueInput(pointValue);

  const expected = calculateTraitBaseCost(pointValue, {
    roundingPolicy: calculation.rounding.policy,
    roundingIncrement: calculation.rounding.increment,
  });

  if (canonicalStringify(expected) !== canonicalStringify(calculation)) {
    throw new Error("Trait base cost calculation is stale or inconsistent");
  }

  return true;
}

export function serializeTraitBaseCostCalculation(calculation) {
  validateTraitBaseCostCalculation(calculation);
  return cloneValue(calculation);
}

export function createTraitBaseCostInputFingerprint(pointValue, options = {}) {
  validatePointValueInput(pointValue);
  const rounding = isRoundingSnapshot(options)
    ? normalizeRoundingSnapshot(options)
    : normalizeRoundingOptions(options);
  return stableHash(canonicalStringify({
    schemaVersion: CALCULATION_SCHEMA_VERSION,
    input: snapshotCalculationInput(pointValue),
    rounding: {
      policy: rounding.policy,
      increment: rounding.increment,
    },
  }));
}

export function getKnownTraitBaseCostModes() {
  return [...KNOWN_BASE_COST_MODES];
}

export function getKnownTraitBaseCostCalculationStatuses() {
  return [...KNOWN_CALCULATION_STATUSES];
}

export function getKnownTraitBaseCostRoundingPolicies() {
  return [...KNOWN_ROUNDING_POLICIES];
}

function resolveFixedCost(pointValue) {
  const diagnostics = [];
  const fixedCandidates = [
    ["basePoints", pointValue.basePoints],
    ["declaredPoints", pointValue.declaredPoints],
  ].filter(([, value]) => value !== null);

  if (pointValue.pointsPerLevel !== null) {
    return {
      status: "conflict",
      rawPoints: null,
      diagnostics: [{
        code: "trait-base-cost-total-has-per-level-input",
        severity: "blocked",
      }],
    };
  }

  if (fixedCandidates.length === 0) {
    return {
      status: "incomplete",
      rawPoints: null,
      diagnostics: [{
        code: "trait-base-cost-fixed-declaration-missing",
        severity: "pending",
      }],
    };
  }

  const first = fixedCandidates[0][1];
  if (!fixedCandidates.every(([, value]) => Object.is(value, first))) {
    return {
      status: "conflict",
      rawPoints: null,
      diagnostics: [{
        code: "trait-base-cost-fixed-declarations-diverge",
        severity: "blocked",
        values: Object.fromEntries(fixedCandidates),
      }],
    };
  }

  if (fixedCandidates.length > 1) {
    diagnostics.push({
      code: "trait-base-cost-fixed-declarations-reconciled",
      severity: "info",
    });
  }

  return {
    status: "calculated",
    rawPoints: normalizePrecision(first),
    diagnostics,
  };
}

function resolvePerLevelCost(pointValue) {
  if (pointValue.pointsPerLevel === null || pointValue.levels === null) {
    return {
      status: "incomplete",
      rawPoints: null,
      diagnostics: [{
        code: "trait-base-cost-per-level-input-incomplete",
        severity: "pending",
        missing: [
          ...(pointValue.pointsPerLevel === null ? ["pointsPerLevel"] : []),
          ...(pointValue.levels === null ? ["levels"] : []),
        ],
      }],
    };
  }

  if (pointValue.basePoints !== null && !Object.is(pointValue.basePoints, 0)) {
    return {
      status: "conflict",
      rawPoints: null,
      diagnostics: [{
        code: "trait-base-cost-per-level-has-base-points",
        severity: "blocked",
        basePoints: pointValue.basePoints,
      }],
    };
  }

  return {
    status: "calculated",
    rawPoints: normalizePrecision(pointValue.pointsPerLevel * pointValue.levels),
    diagnostics: [],
  };
}

function resolveBasePlusLevelsCost(pointValue) {
  const missing = [
    ...(pointValue.basePoints === null ? ["basePoints"] : []),
    ...(pointValue.pointsPerLevel === null ? ["pointsPerLevel"] : []),
    ...(pointValue.levels === null ? ["levels"] : []),
  ];

  if (missing.length > 0) {
    return {
      status: "incomplete",
      rawPoints: null,
      diagnostics: [{
        code: "trait-base-cost-base-plus-levels-input-incomplete",
        severity: "pending",
        missing,
      }],
    };
  }

  return {
    status: "calculated",
    rawPoints: normalizePrecision(
      pointValue.basePoints + (pointValue.pointsPerLevel * pointValue.levels),
    ),
    diagnostics: [],
  };
}

function normalizeRoundingOptions(options) {
  if (!isPlainObject(options)) {
    throw new Error("Trait base cost calculation options must be object");
  }

  const policy = options.roundingPolicy ?? "none";
  const increment = options.roundingIncrement ?? 1;
  return normalizeRoundingSnapshot({ policy, increment, applied: false });
}

function normalizeRoundingSnapshot(rounding) {
  if (!isPlainObject(rounding)) {
    throw new Error("Trait base cost rounding must be object");
  }
  const policy = rounding.policy ?? "none";
  if (!KNOWN_ROUNDING_POLICIES.includes(policy)) {
    throw new Error("Trait base cost rounding policy is invalid");
  }
  const increment = normalizePositiveFiniteNumber(
    rounding.increment ?? 1,
    "Trait base cost rounding increment",
  );
  return {
    policy,
    increment,
    applied: rounding.applied === true,
  };
}

function validateRoundingSnapshot(rounding) {
  const normalized = normalizeRoundingSnapshot(rounding);
  if (typeof rounding.applied !== "boolean") {
    throw new Error("Trait base cost rounding applied must be boolean");
  }
  if (
    normalized.policy !== rounding.policy ||
    !Object.is(normalized.increment, rounding.increment)
  ) {
    throw new Error("Trait base cost rounding is not normalized");
  }
}

function applyRounding(value, rounding) {
  const normalized = normalizeRoundingSnapshot(rounding);
  if (normalized.policy === "none") return normalizePrecision(value);

  const units = value / normalized.increment;
  let roundedUnits;
  switch (normalized.policy) {
    case "ceiling":
      roundedUnits = Math.ceil(units);
      break;
    case "floor":
      roundedUnits = Math.floor(units);
      break;
    case "nearest":
      roundedUnits = Math.sign(units) * Math.round(Math.abs(units));
      break;
    case "toward-zero":
      roundedUnits = Math.trunc(units);
      break;
    case "away-from-zero":
      roundedUnits = Math.sign(units) * Math.ceil(Math.abs(units));
      break;
    default:
      roundedUnits = units;
  }

  return normalizePrecision(roundedUnits * normalized.increment);
}

function snapshotCalculationInput(pointValue) {
  return {
    mode: pointValue.mode,
    basePoints: pointValue.basePoints,
    pointsPerLevel: pointValue.pointsPerLevel,
    levels: pointValue.levels,
    declaredPoints: pointValue.declaredPoints,
  };
}

function validatePointValueInput(pointValue) {
  if (!isPlainObject(pointValue)) {
    throw new Error("Trait pointValue must be object for base cost calculation");
  }
  if (typeof pointValue.mode !== "string" || pointValue.mode === "") {
    throw new Error("Trait pointValue mode is required for base cost calculation");
  }
  for (const [key, value] of Object.entries(snapshotCalculationInput(pointValue))) {
    if (key === "mode") continue;
    validateNullableFiniteNumber(
      value,
      `Trait pointValue ${key} must be finite number or null`,
    );
  }
}

function validateCalculationInput(input) {
  if (typeof input.mode !== "string" || input.mode === "") {
    throw new Error("Trait base cost input mode is required");
  }
  for (const key of ["basePoints", "pointsPerLevel", "levels", "declaredPoints"]) {
    validateNullableFiniteNumber(
      input[key],
      `Trait base cost input ${key} must be finite number or null`,
    );
  }
}

function validateNullableFiniteNumber(value, message) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(message);
  }
}

function normalizePositiveFiniteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive finite number`);
  }
  return normalizePrecision(value);
}

function normalizePrecision(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Trait base cost arithmetic produced non-finite result");
  }
  const normalized = Number(value.toFixed(12));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function statusToErrorCode(status) {
  return {
    incomplete: "TRAIT_BASE_COST_INCOMPLETE",
    unsupported: "TRAIT_BASE_COST_UNSUPPORTED",
    conflict: "TRAIT_BASE_COST_CONFLICT",
  }[status] ?? "TRAIT_BASE_COST_NOT_CALCULATED";
}

function stableHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
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

function isRoundingSnapshot(value) {
  return isPlainObject(value) && Object.hasOwn(value, "policy");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
