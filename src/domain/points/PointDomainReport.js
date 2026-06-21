import {
  createPointContribution,
  serializePointContribution,
  validatePointContribution,
} from "./PointContribution.js";

const REPORT_STATUSES = ["ready", "partial", "pending", "unsupported", "excluded"];

export function createPointDomainReport(input = {}) {
  requireObject(input, "Point domain report");
  const contributions = (input.contributions ?? []).map(createPointContribution);
  const excluded = input.status === "excluded" || input.excluded === true;
  const status = excluded ? "excluded" : deriveStatus(contributions, input.status);
  const complete = status === "ready" || status === "excluded";
  const knownPoints = contributions.reduce((total, item) => (
    item.status === "ready" ? total + item.points : total
  ), 0);
  const report = {
    characterId: requiredString(input.characterId, "Point domain report characterId"),
    domain: requiredString(input.domain, "Point domain report domain"),
    status,
    complete,
    required: input.required ?? true,
    categories: normalizeStringArray(input.categories),
    contributions,
    knownPoints,
    totalPoints: status === "ready" ? knownPoints : status === "excluded" ? 0 : null,
    sourceFingerprint: normalizeNullableString(input.sourceFingerprint),
    diagnostics: normalizeArray(input.diagnostics),
  };
  validatePointDomainReport(report);
  return deepFreeze(report);
}

export function validatePointDomainReport(report) {
  requireObject(report, "Point domain report");
  requiredString(report.characterId, "Point domain report characterId");
  requiredString(report.domain, "Point domain report domain");
  if (!REPORT_STATUSES.includes(report.status)) {
    throw new Error("Point domain report status is invalid");
  }
  if (report.complete !== ["ready", "excluded"].includes(report.status)) {
    throw new Error("Point domain report complete flag is inconsistent");
  }
  if (typeof report.required !== "boolean") {
    throw new Error("Point domain report required must be boolean");
  }
  validateUniqueStrings(report.categories, "Point domain report categories");
  if (!Array.isArray(report.contributions)) {
    throw new Error("Point domain report contributions must be array");
  }
  const ids = new Set();
  let expectedKnown = 0;
  for (const contribution of report.contributions) {
    validatePointContribution(contribution);
    if (contribution.characterId !== report.characterId) {
      throw new Error("Point contribution belongs to another character");
    }
    if (contribution.domain !== report.domain) {
      throw new Error("Point contribution belongs to another domain");
    }
    if (ids.has(contribution.id)) {
      throw new Error(`Duplicate point contribution id: ${contribution.id}`);
    }
    ids.add(contribution.id);
    if (contribution.status === "ready") expectedKnown += contribution.points;
  }
  if (!Object.is(report.knownPoints, expectedKnown)) {
    throw new Error("Point domain report knownPoints is inconsistent");
  }
  const expectedTotal = report.status === "ready"
    ? expectedKnown
    : report.status === "excluded" ? 0 : null;
  if (!Object.is(report.totalPoints, expectedTotal)) {
    throw new Error("Point domain report totalPoints is inconsistent");
  }
  if (report.status === "ready" && report.contributions.some(item => item.status !== "ready")) {
    throw new Error("Ready point domain report has non-ready contributions");
  }
  if (report.status === "excluded" && report.contributions.length > 0) {
    throw new Error("Excluded point domain report cannot have contributions");
  }
  if (report.sourceFingerprint !== null && typeof report.sourceFingerprint !== "string") {
    throw new Error("Point domain report sourceFingerprint must be string or null");
  }
  if (!Array.isArray(report.diagnostics)) {
    throw new Error("Point domain report diagnostics must be array");
  }
  return true;
}

export function serializePointDomainReport(report) {
  validatePointDomainReport(report);
  return {
    ...cloneValue(report),
    contributions: report.contributions.map(serializePointContribution),
  };
}

export function getPointDomainReportStatuses() {
  return [...REPORT_STATUSES];
}

function deriveStatus(contributions, explicitStatus) {
  if (explicitStatus !== undefined && explicitStatus !== null) {
    if (!REPORT_STATUSES.includes(explicitStatus) || explicitStatus === "excluded") {
      throw new Error("Point domain report explicit status is invalid");
    }
    return explicitStatus;
  }
  if (contributions.length === 0) return "ready";
  const readyCount = contributions.filter(item => item.status === "ready").length;
  const unsupportedCount = contributions.filter(item => item.status === "unsupported").length;
  if (readyCount === contributions.length) return "ready";
  if (readyCount > 0) return "partial";
  if (unsupportedCount > 0) return "unsupported";
  return "pending";
}

function normalizeStringArray(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Point domain report categories must be array");
  const result = value.map(item => requiredString(item, "Point domain category"));
  validateUniqueStrings(result, "Point domain report categories");
  return result;
}

function normalizeArray(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Point domain report diagnostics must be array");
  return cloneValue(value);
}

function validateUniqueStrings(value, label) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || item === "")) {
    throw new Error(`${label} must be string array`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must contain unique values`);
  }
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("Point domain report text field is invalid");
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
