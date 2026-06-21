const DISCREPANCY_STATUSES = ["pending", "reconciled", "divergent", "informational"];

export function createPointDiscrepancy(input = {}) {
  requireObject(input, "Point discrepancy");
  const importedPoints = normalizeNullableFinite(input.importedPoints);
  const calculatedPoints = normalizeNullableFinite(input.calculatedPoints);
  const status = input.status ?? deriveStatus(importedPoints, calculatedPoints);
  const difference = importedPoints === null || calculatedPoints === null
    ? null
    : calculatedPoints - importedPoints;
  const discrepancy = {
    id: requiredString(input.id, "Point discrepancy id"),
    characterId: requiredString(input.characterId, "Point discrepancy characterId"),
    domain: requiredString(input.domain, "Point discrepancy domain"),
    sourceId: requiredString(input.sourceId, "Point discrepancy sourceId"),
    kind: requiredString(input.kind, "Point discrepancy kind"),
    status,
    importedPoints,
    calculatedPoints,
    difference,
    absoluteDifference: difference === null ? null : Math.abs(difference),
    provenance: normalizeObject(input.provenance),
    diagnostics: normalizeArray(input.diagnostics),
  };
  validatePointDiscrepancy(discrepancy);
  return deepFreeze(discrepancy);
}

export function validatePointDiscrepancy(value) {
  requireObject(value, "Point discrepancy");
  for (const field of ["id", "characterId", "domain", "sourceId", "kind"]) {
    requiredString(value[field], `Point discrepancy ${field}`);
  }
  if (!DISCREPANCY_STATUSES.includes(value.status)) {
    throw new Error("Point discrepancy status is invalid");
  }
  validateNullableFinite(value.importedPoints, "Point discrepancy importedPoints");
  validateNullableFinite(value.calculatedPoints, "Point discrepancy calculatedPoints");
  validateNullableFinite(value.difference, "Point discrepancy difference");
  validateNullableFinite(value.absoluteDifference, "Point discrepancy absoluteDifference");
  const expectedDifference = value.importedPoints === null || value.calculatedPoints === null
    ? null
    : value.calculatedPoints - value.importedPoints;
  if (!Object.is(value.difference, expectedDifference)) {
    throw new Error("Point discrepancy difference is inconsistent");
  }
  if (!Object.is(
    value.absoluteDifference,
    expectedDifference === null ? null : Math.abs(expectedDifference),
  )) {
    throw new Error("Point discrepancy absoluteDifference is inconsistent");
  }
  if (value.status === "reconciled" && expectedDifference !== 0) {
    throw new Error("Reconciled point discrepancy must have zero difference");
  }
  if (value.status === "divergent" && (expectedDifference === null || expectedDifference === 0)) {
    throw new Error("Divergent point discrepancy requires non-zero difference");
  }
  if (value.status === "pending" && expectedDifference !== null) {
    throw new Error("Pending point discrepancy cannot have complete values");
  }
  requireObject(value.provenance, "Point discrepancy provenance");
  if (!Array.isArray(value.diagnostics)) {
    throw new Error("Point discrepancy diagnostics must be array");
  }
  return true;
}

export function serializePointDiscrepancy(value) {
  validatePointDiscrepancy(value);
  return cloneValue(value);
}

function deriveStatus(importedPoints, calculatedPoints) {
  if (importedPoints === null || calculatedPoints === null) return "pending";
  return Object.is(importedPoints, calculatedPoints) ? "reconciled" : "divergent";
}

function normalizeObject(value) {
  if (value === undefined || value === null) return {};
  requireObject(value, "Point discrepancy provenance");
  return cloneValue(value);
}

function normalizeArray(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Point discrepancy diagnostics must be array");
  return cloneValue(value);
}

function normalizeNullableFinite(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) throw new Error("Point discrepancy value must be finite or null");
  return parsed;
}

function validateNullableFinite(value, label) {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${label} must be finite number or null`);
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${label} must be non-empty string`);
  }
  return value;
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be object`);
  }
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
