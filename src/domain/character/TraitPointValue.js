const EXTERNAL_SOURCE_KINDS = new Set([
  "imported",
  "embedded",
  "external",
]);

const KNOWN_POINT_VALUE_MODES = [
  "unknown",
  "total",
  "per-level",
  "base-plus-levels",
];

const KNOWN_RECONCILIATION_STATUSES = [
  "unknown",
  "legacy-only",
  "declared-only",
  "imported-only",
  "calculated-only",
  "reconciled",
  "divergent",
];

export function createTraitPointValue(input = null, context = {}) {
  if (input !== null && input !== undefined && !isPlainObject(input)) {
    throw new Error("Trait pointValue must be object or null");
  }
  if (!isPlainObject(context)) {
    throw new Error("Trait pointValue context must be object");
  }

  const source = cloneValue(input ?? {});
  const legacyPoints = readNullableNumber(
    source,
    "legacyPoints",
    normalizeNullableNumber(context.points, "Trait legacy points"),
  );
  const sourceKind = normalizeNullableString(context.sourceKind);

  const declaredPoints = readNullableNumber(
    source,
    "declaredPoints",
    sourceKind === "singular" ? legacyPoints : null,
  );
  const importedPoints = readNullableNumber(
    source,
    "importedPoints",
    EXTERNAL_SOURCE_KINDS.has(sourceKind) ? legacyPoints : null,
  );
  const calculatedPoints = readNullableNumber(
    source,
    "calculatedPoints",
    null,
  );

  const basePoints = readNullableNumber(source, "basePoints", null);
  const pointsPerLevel = readNullableNumber(source, "pointsPerLevel", null);
  const levels = readNullableNumber(
    source,
    "levels",
    normalizeNullableNumber(context.levels, "Trait legacy levels"),
  );

  const mode = hasOwn(source, "mode")
    ? normalizeMode(source.mode)
    : inferMode({
      legacyPoints,
      declaredPoints,
      importedPoints,
      calculatedPoints,
      basePoints,
      pointsPerLevel,
    });
  const reconciliation = reconcilePointAuthorities({
    legacyPoints,
    declaredPoints,
    importedPoints,
    calculatedPoints,
  });
  const complete = evaluateCompleteness({
    mode,
    legacyPoints,
    declaredPoints,
    importedPoints,
    calculatedPoints,
    basePoints,
    pointsPerLevel,
    levels,
  });

  const pointValue = {
    ...source,
    mode,
    basePoints,
    pointsPerLevel,
    levels,
    legacyPoints,
    declaredPoints,
    importedPoints,
    calculatedPoints,
    complete,
    reconciliation,
  };

  validateTraitPointValue(pointValue);
  return pointValue;
}

export function validateTraitPointValue(pointValue) {
  if (!isPlainObject(pointValue)) {
    throw new Error("Trait pointValue must be object");
  }

  normalizeMode(pointValue.mode);
  validateNullableNumber(pointValue.basePoints, "Trait basePoints");
  validateNullableNumber(pointValue.pointsPerLevel, "Trait pointsPerLevel");
  validateNullableNumber(pointValue.levels, "Trait pointValue levels");
  validateNullableNumber(pointValue.legacyPoints, "Trait legacyPoints");
  validateNullableNumber(pointValue.declaredPoints, "Trait declaredPoints");
  validateNullableNumber(pointValue.importedPoints, "Trait importedPoints");
  validateNullableNumber(pointValue.calculatedPoints, "Trait calculatedPoints");

  if (typeof pointValue.complete !== "boolean") {
    throw new Error("Trait pointValue complete must be boolean");
  }

  validateReconciliation(pointValue.reconciliation);

  const expectedReconciliation = reconcilePointAuthorities(pointValue);
  if (canonicalStringify(pointValue.reconciliation) !== canonicalStringify(expectedReconciliation)) {
    throw new Error("Trait pointValue reconciliation is stale or inconsistent");
  }

  const expectedCompleteness = evaluateCompleteness(pointValue);
  if (pointValue.complete !== expectedCompleteness) {
    throw new Error("Trait pointValue completeness is stale or inconsistent");
  }

  return true;
}

export function serializeTraitPointValue(pointValue) {
  validateTraitPointValue(pointValue);
  return cloneValue(pointValue);
}

export function reconcileTraitPointValue(pointValue) {
  validateTraitPointValue(pointValue);
  return cloneValue(pointValue.reconciliation);
}

export function getKnownTraitPointValueModes() {
  return [...KNOWN_POINT_VALUE_MODES];
}

export function getKnownTraitPointReconciliationStatuses() {
  return [...KNOWN_RECONCILIATION_STATUSES];
}

function reconcilePointAuthorities(pointValue) {
  const authorities = [
    ["declared", pointValue.declaredPoints],
    ["imported", pointValue.importedPoints],
    ["calculated", pointValue.calculatedPoints],
  ].filter(([, value]) => value !== null && value !== undefined);

  let status;
  if (authorities.length === 0) {
    status = pointValue.legacyPoints === null || pointValue.legacyPoints === undefined
      ? "unknown"
      : "legacy-only";
  } else if (authorities.length === 1) {
    status = `${authorities[0][0]}-only`;
  } else {
    const firstValue = authorities[0][1];
    status = authorities.every(([, value]) => Object.is(value, firstValue))
      ? "reconciled"
      : "divergent";
  }

  return {
    status,
    differences: {
      importedMinusDeclared: subtractNullable(
        pointValue.importedPoints,
        pointValue.declaredPoints,
      ),
      calculatedMinusDeclared: subtractNullable(
        pointValue.calculatedPoints,
        pointValue.declaredPoints,
      ),
      calculatedMinusImported: subtractNullable(
        pointValue.calculatedPoints,
        pointValue.importedPoints,
      ),
    },
  };
}

function validateReconciliation(reconciliation) {
  if (!isPlainObject(reconciliation)) {
    throw new Error("Trait pointValue reconciliation must be object");
  }
  if (!KNOWN_RECONCILIATION_STATUSES.includes(reconciliation.status)) {
    throw new Error("Trait pointValue reconciliation status is invalid");
  }
  if (!isPlainObject(reconciliation.differences)) {
    throw new Error("Trait pointValue reconciliation differences must be object");
  }

  validateNullableNumber(
    reconciliation.differences.importedMinusDeclared,
    "Trait importedMinusDeclared",
  );
  validateNullableNumber(
    reconciliation.differences.calculatedMinusDeclared,
    "Trait calculatedMinusDeclared",
  );
  validateNullableNumber(
    reconciliation.differences.calculatedMinusImported,
    "Trait calculatedMinusImported",
  );
}

function inferMode(values) {
  if (values.pointsPerLevel !== null && values.basePoints !== null) {
    return "base-plus-levels";
  }
  if (values.pointsPerLevel !== null) {
    return "per-level";
  }
  if (
    values.legacyPoints !== null ||
    values.declaredPoints !== null ||
    values.importedPoints !== null ||
    values.calculatedPoints !== null
  ) {
    return "total";
  }
  return "unknown";
}

function evaluateCompleteness(pointValue) {
  switch (pointValue.mode) {
    case "total":
      return [
        pointValue.declaredPoints,
        pointValue.importedPoints,
        pointValue.calculatedPoints,
        pointValue.legacyPoints,
      ].some(value => value !== null && value !== undefined);
    case "per-level":
      return pointValue.pointsPerLevel !== null && pointValue.levels !== null;
    case "base-plus-levels":
      return (
        pointValue.basePoints !== null &&
        pointValue.pointsPerLevel !== null &&
        pointValue.levels !== null
      );
    default:
      return false;
  }
}

function normalizeMode(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Trait pointValue mode must be non-empty string");
  }
  return value.trim();
}

function readNullableNumber(source, key, fallback) {
  return hasOwn(source, key)
    ? normalizeNullableNumber(source[key], `Trait pointValue ${key}`)
    : fallback;
}

function normalizeNullableNumber(value, label) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (!Number.isNaN(parsed)) return parsed;
  }

  throw new Error(`${label} must be number or null`);
}

function validateNullableNumber(value, label) {
  if (value !== null && (typeof value !== "number" || Number.isNaN(value))) {
    throw new Error(`${label} must be number or null`);
  }
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Trait pointValue sourceKind must be string or null");
  }
  return value;
}

function subtractNullable(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) {
    return null;
  }
  return left - right;
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

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
