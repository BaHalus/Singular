const CONTRIBUTION_STATUSES = ["ready", "pending", "unsupported"];

export function createPointContribution(input = {}) {
  requireObject(input, "Point contribution");
  const contribution = {
    id: requiredString(input.id, "Point contribution id"),
    characterId: requiredString(input.characterId, "Point contribution characterId"),
    domain: requiredString(input.domain, "Point contribution domain"),
    category: requiredString(input.category, "Point contribution category"),
    sourceId: requiredString(input.sourceId, "Point contribution sourceId"),
    sourceType: requiredString(input.sourceType, "Point contribution sourceType"),
    status: input.status ?? "pending",
    points: normalizeNullableFinite(input.points),
    authorityFingerprint: normalizeNullableString(input.authorityFingerprint),
    declaredPoints: normalizeNullableFinite(input.declaredPoints),
    importedPoints: normalizeNullableFinite(input.importedPoints),
    reconciliation: normalizeNullableObject(input.reconciliation),
    provenance: normalizeObject(input.provenance),
    diagnostics: normalizeDiagnostics(input.diagnostics),
  };
  validatePointContribution(contribution);
  return deepFreeze(contribution);
}

export function validatePointContribution(value) {
  requireObject(value, "Point contribution");
  for (const field of [
    "id",
    "characterId",
    "domain",
    "category",
    "sourceId",
    "sourceType",
  ]) {
    requiredString(value[field], `Point contribution ${field}`);
  }
  if (!CONTRIBUTION_STATUSES.includes(value.status)) {
    throw new Error("Point contribution status is invalid");
  }
  validateNullableFinite(value.points, "Point contribution points");
  validateNullableFinite(value.declaredPoints, "Point contribution declaredPoints");
  validateNullableFinite(value.importedPoints, "Point contribution importedPoints");
  if (value.authorityFingerprint !== null && typeof value.authorityFingerprint !== "string") {
    throw new Error("Point contribution authorityFingerprint must be string or null");
  }
  if (value.reconciliation !== null) {
    requireObject(value.reconciliation, "Point contribution reconciliation");
  }
  requireObject(value.provenance, "Point contribution provenance");
  if (!Array.isArray(value.diagnostics)) {
    throw new Error("Point contribution diagnostics must be array");
  }
  if (value.status === "ready") {
    if (!Number.isFinite(value.points)) {
      throw new Error("Ready point contribution requires finite points");
    }
    if (value.authorityFingerprint === null || value.authorityFingerprint === "") {
      throw new Error("Ready point contribution requires authorityFingerprint");
    }
  } else if (value.points !== null) {
    throw new Error("Non-ready point contribution cannot expose points");
  }
  return true;
}

export function serializePointContribution(value) {
  validatePointContribution(value);
  return cloneValue(value);
}

export function getPointContributionStatuses() {
  return [...CONTRIBUTION_STATUSES];
}

function normalizeDiagnostics(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Point contribution diagnostics must be array");
  return cloneValue(value);
}

function normalizeObject(value) {
  if (value === undefined || value === null) return {};
  requireObject(value, "Point contribution provenance");
  return cloneValue(value);
}

function normalizeNullableObject(value) {
  if (value === undefined || value === null) return null;
  requireObject(value, "Point contribution reconciliation");
  return cloneValue(value);
}

function normalizeNullableFinite(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) throw new Error("Point contribution value must be finite or null");
  return parsed;
}

function validateNullableFinite(value, label) {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${label} must be finite number or null`);
  }
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("Point contribution text field is invalid");
  return value;
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
