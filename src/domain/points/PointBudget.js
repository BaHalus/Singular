const BUDGET_STATUSES = [
  "unknown",
  "declared-only",
  "imported-only",
  "reconciled",
  "divergent",
  "conflict",
];

export function createPointBudget(input = {}) {
  requireObject(input, "Point budget");
  const budget = {
    declaredPoints: normalizeNullableFinite(input.declaredPoints),
    importedPoints: normalizeNullableFinite(input.importedPoints),
    importedUnspentPoints: normalizeNullableFinite(input.importedUnspentPoints),
    source: normalizeSource(input.source),
    importMeta: normalizeNullableObject(input.importMeta),
    notes: normalizeString(input.notes),
    raw: cloneValue(input.raw ?? null),
  };
  validatePointBudget(budget);
  return deepFreeze(budget);
}

export function validatePointBudget(budget) {
  requireObject(budget, "Point budget");
  validateNullableFinite(budget.declaredPoints, "Point budget declaredPoints");
  validateNullableFinite(budget.importedPoints, "Point budget importedPoints");
  validateNullableFinite(
    budget.importedUnspentPoints,
    "Point budget importedUnspentPoints",
  );
  validateSource(budget.source);
  if (budget.importMeta !== null) {
    requireObject(budget.importMeta, "Point budget importMeta");
  }
  if (typeof budget.notes !== "string") {
    throw new Error("Point budget notes must be string");
  }
  return true;
}

export function evaluatePointBudget(budget, totalSpentPoints = null) {
  validatePointBudget(budget);
  validateNullableFinite(totalSpentPoints, "Point budget totalSpentPoints");

  const status = reconcileStatus(budget);
  const effectivePoints = effectiveBudgetPoints(budget, status);
  const calculatedUnspentPoints = effectivePoints === null || totalSpentPoints === null
    ? null
    : effectivePoints - totalSpentPoints;
  const importedUnspentDifference = calculatedUnspentPoints === null ||
    budget.importedUnspentPoints === null
    ? null
    : calculatedUnspentPoints - budget.importedUnspentPoints;
  const result = {
    status,
    complete: !["unknown", "divergent", "conflict"].includes(status),
    declaredPoints: budget.declaredPoints,
    importedPoints: budget.importedPoints,
    effectivePoints,
    totalSpentPoints,
    calculatedUnspentPoints,
    importedUnspentPoints: budget.importedUnspentPoints,
    importedUnspentDifference,
    diagnostics: createDiagnostics({
      status,
      importMeta: budget.importMeta,
      totalSpentPoints,
      importedUnspentPoints: budget.importedUnspentPoints,
      importedUnspentDifference,
    }),
  };
  validatePointBudgetEvaluation(result);
  return deepFreeze(result);
}

export function validatePointBudgetEvaluation(value) {
  requireObject(value, "Point budget evaluation");
  if (!BUDGET_STATUSES.includes(value.status)) {
    throw new Error("Point budget evaluation status is invalid");
  }
  if (value.complete !== !["unknown", "divergent", "conflict"].includes(value.status)) {
    throw new Error("Point budget evaluation complete flag is inconsistent");
  }
  for (const field of [
    "declaredPoints",
    "importedPoints",
    "effectivePoints",
    "totalSpentPoints",
    "calculatedUnspentPoints",
    "importedUnspentPoints",
    "importedUnspentDifference",
  ]) {
    validateNullableFinite(value[field], `Point budget evaluation ${field}`);
  }
  if (!Array.isArray(value.diagnostics)) {
    throw new Error("Point budget evaluation diagnostics must be array");
  }
  if (["divergent", "conflict"].includes(value.status) && value.effectivePoints !== null) {
    throw new Error("Conflicting point budget cannot expose effectivePoints");
  }
  if (value.status === "reconciled" && !Object.is(
    value.declaredPoints,
    value.importedPoints,
  )) {
    throw new Error("Reconciled point budget values are inconsistent");
  }
  if (value.calculatedUnspentPoints !== null && !Object.is(
    value.calculatedUnspentPoints,
    value.effectivePoints - value.totalSpentPoints,
  )) {
    throw new Error("Point budget calculated unspent is inconsistent");
  }
  return true;
}

export function serializePointBudget(budget) {
  validatePointBudget(budget);
  return cloneValue(budget);
}

function reconcileStatus(budget) {
  if (budget.importMeta?.status === "conflict") return "conflict";
  const declared = budget.declaredPoints;
  const imported = budget.importedPoints;
  if (declared === null && imported === null) return "unknown";
  if (declared !== null && imported === null) return "declared-only";
  if (declared === null && imported !== null) return "imported-only";
  return Object.is(declared, imported) ? "reconciled" : "divergent";
}

function effectiveBudgetPoints(budget, status) {
  if (status === "declared-only" || status === "reconciled") {
    return budget.declaredPoints;
  }
  if (status === "imported-only") return budget.importedPoints;
  return null;
}

function createDiagnostics(input) {
  const diagnostics = [];
  if (input.status === "unknown") {
    diagnostics.push({ code: "point-budget-unknown", severity: "pending" });
  }
  if (input.status === "divergent") {
    diagnostics.push({ code: "point-budget-divergent", severity: "warning" });
  }
  if (input.status === "conflict") {
    diagnostics.push({
      code: "point-budget-import-conflict",
      severity: "warning",
      details: cloneValue(input.importMeta?.diagnostics ?? []),
    });
  }
  if (input.totalSpentPoints === null) {
    diagnostics.push({ code: "point-ledger-total-incomplete", severity: "pending" });
  }
  if (
    input.importedUnspentPoints !== null &&
    input.importedUnspentDifference !== null &&
    input.importedUnspentDifference !== 0
  ) {
    diagnostics.push({
      code: "point-budget-unspent-divergent",
      severity: "warning",
      difference: input.importedUnspentDifference,
    });
  }
  return diagnostics;
}

function normalizeSource(value) {
  const source = value ?? {};
  requireObject(source, "Point budget source");
  return {
    kind: normalizeString(source.kind) || "unknown",
    provider: normalizeNullableString(source.provider),
    format: normalizeNullableString(source.format),
    reference: normalizeNullableString(source.reference),
    version: source.version ?? null,
  };
}

function validateSource(value) {
  requireObject(value, "Point budget source");
  if (typeof value.kind !== "string" || value.kind === "") {
    throw new Error("Point budget source kind is required");
  }
  for (const field of ["provider", "format", "reference"]) {
    if (value[field] !== null && typeof value[field] !== "string") {
      throw new Error(`Point budget source ${field} must be string or null`);
    }
  }
}

function normalizeNullableObject(value) {
  if (value === undefined || value === null) return null;
  requireObject(value, "Point budget importMeta");
  return cloneValue(value);
}

function normalizeNullableFinite(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) throw new Error("Point value must be finite or null");
  return parsed;
}

function validateNullableFinite(value, label) {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${label} must be finite number or null`);
  }
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Point budget text must be string");
  return value;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("Point budget source field is invalid");
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
