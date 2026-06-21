import {
  createTemplate,
  serializeTemplates,
  validateTemplate,
  validateTemplates,
} from "./Templates.js";
import {
  validateResolvedTemplateComposition,
} from "./TemplateDependencyResolver.js";

const RECONCILIATION_STATUSES = [
  "unknown",
  "imported-only",
  "calculated-only",
  "partial",
  "reconciled",
  "divergent",
];

export function evaluateTemplatePointReconciliation(template) {
  validateTemplate(template);
  return deepFreeze(reconcilePointValues({
    scope: "template",
    templateId: template.id,
    importedPoints: template.importedPoints,
    calculatedPoints: template.calculatedPoints,
  }));
}

export function evaluateTemplateCompositionPointReconciliation(
  templates,
  resolution,
) {
  validateTemplates(templates);
  validateResolvedTemplateComposition(resolution);
  if (resolution.status !== "ready") {
    throw new Error(
      "Template composition point reconciliation requires ready resolution",
    );
  }

  const byId = new Map(templates.map(template => [template.id, template]));
  const evaluations = resolution.orderedTemplateIds.map(templateId => {
    const template = byId.get(templateId);
    if (!template) {
      throw new Error(
        `Resolved template ${templateId} is missing from point reconciliation catalog`,
      );
    }
    return evaluateTemplatePointReconciliation(template);
  });
  const importedKnownTotal = sumKnown(evaluations, "importedPoints");
  const calculatedKnownTotal = sumKnown(evaluations, "calculatedPoints");
  const missingImportedTemplateIds = evaluations
    .filter(item => item.importedPoints === null)
    .map(item => item.templateId);
  const missingCalculatedTemplateIds = evaluations
    .filter(item => item.calculatedPoints === null)
    .map(item => item.templateId);
  const divergentTemplateIds = evaluations
    .filter(item => item.status === "divergent")
    .map(item => item.templateId);
  const importedPoints = missingImportedTemplateIds.length === 0
    ? importedKnownTotal
    : null;
  const calculatedPoints = missingCalculatedTemplateIds.length === 0
    ? calculatedKnownTotal
    : null;
  const summary = reconcilePointValues({
    scope: "composition",
    templateId: null,
    importedPoints,
    calculatedPoints,
    hasAnyImported: evaluations.some(item => item.importedPoints !== null),
    hasAnyCalculated: evaluations.some(item => item.calculatedPoints !== null),
  });
  const status = determineCompositionStatus({
    evaluations,
    importedPoints,
    calculatedPoints,
    summaryStatus: summary.status,
  });
  const result = {
    scope: "composition",
    status,
    complete: importedPoints !== null && calculatedPoints !== null,
    reconciled: status === "reconciled",
    rootTemplateIds: [...resolution.rootTemplateIds],
    orderedTemplateIds: [...resolution.orderedTemplateIds],
    importedPoints,
    calculatedPoints,
    importedKnownTotal,
    calculatedKnownTotal,
    difference: importedPoints === null || calculatedPoints === null
      ? null
      : calculatedPoints - importedPoints,
    absoluteDifference: importedPoints === null || calculatedPoints === null
      ? null
      : Math.abs(calculatedPoints - importedPoints),
    missingImportedTemplateIds,
    missingCalculatedTemplateIds,
    divergentTemplateIds,
    evaluations,
    diagnostics: createCompositionDiagnostics({
      missingImportedTemplateIds,
      missingCalculatedTemplateIds,
      divergentTemplateIds,
      status,
    }),
  };

  validateTemplateCompositionPointReconciliation(result);
  return deepFreeze(result);
}

export function withTemplateCalculatedPoints(template, calculatedPoints) {
  validateTemplate(template);
  const normalized = normalizeNullablePoints(
    calculatedPoints,
    "Template calculated points must be finite number or null",
  );
  const nextTemplate = createTemplate({
    ...serializeTemplates([template])[0],
    calculatedPoints: normalized,
  });

  return deepFreeze({
    template: nextTemplate,
    reconciliation: evaluateTemplatePointReconciliation(nextTemplate),
  });
}

export function validateTemplatePointReconciliation(result) {
  if (!isPlainObject(result)) {
    throw new Error("Template point reconciliation must be object");
  }
  if (result.scope !== "template") {
    throw new Error("Template point reconciliation scope must be template");
  }
  requiredString(
    result.templateId,
    "Template point reconciliation templateId must be non-empty string",
  );
  validateReconciliationCore(result);
  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Template point reconciliation diagnostics must be array");
  }
  return true;
}

export function validateTemplateCompositionPointReconciliation(result) {
  if (!isPlainObject(result)) {
    throw new Error("Template composition point reconciliation must be object");
  }
  if (result.scope !== "composition") {
    throw new Error(
      "Template composition point reconciliation scope must be composition",
    );
  }
  validateReconciliationCore(result);
  validateUniqueStringArray(
    result.rootTemplateIds,
    "Template composition rootTemplateIds must be unique string array",
  );
  validateUniqueStringArray(
    result.orderedTemplateIds,
    "Template composition orderedTemplateIds must be unique string array",
  );
  validateUniqueStringArray(
    result.missingImportedTemplateIds,
    "Missing imported template ids must be unique string array",
  );
  validateUniqueStringArray(
    result.missingCalculatedTemplateIds,
    "Missing calculated template ids must be unique string array",
  );
  validateUniqueStringArray(
    result.divergentTemplateIds,
    "Divergent template ids must be unique string array",
  );
  if (!Array.isArray(result.evaluations)) {
    throw new Error("Template composition evaluations must be array");
  }
  result.evaluations.forEach(validateTemplatePointReconciliation);
  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Template composition diagnostics must be array");
  }
  validateNullableFiniteNumber(
    result.importedKnownTotal,
    "Template composition importedKnownTotal must be finite number",
    false,
  );
  validateNullableFiniteNumber(
    result.calculatedKnownTotal,
    "Template composition calculatedKnownTotal must be finite number",
    false,
  );
  return true;
}

export function serializeTemplatePointReconciliation(result) {
  if (result.scope === "template") {
    validateTemplatePointReconciliation(result);
  } else {
    validateTemplateCompositionPointReconciliation(result);
  }
  return cloneValue(result);
}

export function getTemplatePointReconciliationStatuses() {
  return [...RECONCILIATION_STATUSES];
}

function reconcilePointValues(input) {
  const importedPoints = normalizeNullablePoints(
    input.importedPoints,
    "Imported points must be finite number or null",
  );
  const calculatedPoints = normalizeNullablePoints(
    input.calculatedPoints,
    "Calculated points must be finite number or null",
  );
  const hasImported = input.hasAnyImported ?? importedPoints !== null;
  const hasCalculated = input.hasAnyCalculated ?? calculatedPoints !== null;
  const status = determineStatus({
    importedPoints,
    calculatedPoints,
    hasImported,
    hasCalculated,
  });
  const difference = importedPoints === null || calculatedPoints === null
    ? null
    : calculatedPoints - importedPoints;
  const result = {
    scope: input.scope,
    templateId: input.templateId,
    status,
    complete: importedPoints !== null && calculatedPoints !== null,
    reconciled: status === "reconciled",
    importedPoints,
    calculatedPoints,
    difference,
    absoluteDifference: difference === null ? null : Math.abs(difference),
    diagnostics: createTemplateDiagnostics(status),
  };

  if (input.scope === "template") {
    validateTemplatePointReconciliation(result);
  }
  return result;
}

function determineStatus(input) {
  if (input.importedPoints !== null && input.calculatedPoints !== null) {
    return input.importedPoints === input.calculatedPoints
      ? "reconciled"
      : "divergent";
  }
  if (input.importedPoints !== null && !input.hasCalculated) {
    return "imported-only";
  }
  if (input.calculatedPoints !== null && !input.hasImported) {
    return "calculated-only";
  }
  if (!input.hasImported && !input.hasCalculated) return "unknown";
  return "partial";
}

function determineCompositionStatus(input) {
  if (input.evaluations.length === 0) return "reconciled";
  if (input.importedPoints !== null && input.calculatedPoints !== null) {
    return input.summaryStatus;
  }
  const hasImported = input.evaluations.some(item => item.importedPoints !== null);
  const hasCalculated = input.evaluations.some(item => item.calculatedPoints !== null);
  if (!hasImported && !hasCalculated) return "unknown";
  if (input.importedPoints !== null && !hasCalculated) return "imported-only";
  if (input.calculatedPoints !== null && !hasImported) return "calculated-only";
  return "partial";
}

function createTemplateDiagnostics(status) {
  if (status === "unknown") {
    return [{ code: "template-points-unknown", severity: "pending" }];
  }
  if (status === "imported-only") {
    return [{
      code: "template-calculated-points-missing",
      severity: "pending",
    }];
  }
  if (status === "calculated-only") {
    return [{
      code: "template-imported-points-missing",
      severity: "pending",
    }];
  }
  if (status === "divergent") {
    return [{ code: "template-points-divergent", severity: "warning" }];
  }
  return [];
}

function createCompositionDiagnostics(input) {
  const diagnostics = [];
  if (input.missingImportedTemplateIds.length > 0) {
    diagnostics.push({
      code: "template-composition-imported-points-incomplete",
      severity: "pending",
      templateIds: [...input.missingImportedTemplateIds],
    });
  }
  if (input.missingCalculatedTemplateIds.length > 0) {
    diagnostics.push({
      code: "template-composition-calculated-points-incomplete",
      severity: "pending",
      templateIds: [...input.missingCalculatedTemplateIds],
    });
  }
  if (input.divergentTemplateIds.length > 0) {
    diagnostics.push({
      code: "template-composition-points-divergent",
      severity: "warning",
      templateIds: [...input.divergentTemplateIds],
    });
  }
  if (input.status === "unknown") {
    diagnostics.push({
      code: "template-composition-points-unknown",
      severity: "pending",
      templateIds: [],
    });
  }
  return diagnostics;
}

function validateReconciliationCore(result) {
  if (!RECONCILIATION_STATUSES.includes(result.status)) {
    throw new Error("Template point reconciliation status is invalid");
  }
  validateNullableFiniteNumber(
    result.importedPoints,
    "Template reconciliation importedPoints must be finite number or null",
  );
  validateNullableFiniteNumber(
    result.calculatedPoints,
    "Template reconciliation calculatedPoints must be finite number or null",
  );
  validateNullableFiniteNumber(
    result.difference,
    "Template reconciliation difference must be finite number or null",
  );
  validateNullableFiniteNumber(
    result.absoluteDifference,
    "Template reconciliation absoluteDifference must be finite number or null",
  );
  const expectedComplete = result.importedPoints !== null &&
    result.calculatedPoints !== null;
  if (result.complete !== expectedComplete) {
    throw new Error("Template reconciliation complete flag is inconsistent");
  }
  if (result.reconciled !== (result.status === "reconciled")) {
    throw new Error("Template reconciliation reconciled flag is inconsistent");
  }
  if (
    result.difference !== null &&
    result.difference !== result.calculatedPoints - result.importedPoints
  ) {
    throw new Error("Template reconciliation difference is inconsistent");
  }
  if (
    result.absoluteDifference !== null &&
    result.absoluteDifference !== Math.abs(result.difference)
  ) {
    throw new Error("Template reconciliation absoluteDifference is inconsistent");
  }
}

function sumKnown(evaluations, key) {
  return evaluations.reduce((total, item) => (
    item[key] === null ? total : total + item[key]
  ), 0);
}

function normalizeNullablePoints(value, message) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(message);
  return parsed;
}

function validateNullableFiniteNumber(value, message, nullable = true) {
  if (value === null && nullable) return;
  if (!Number.isFinite(value)) throw new Error(message);
}

function validateUniqueStringArray(value, message) {
  if (
    !Array.isArray(value) ||
    value.some(item => typeof item !== "string" || item === "") ||
    new Set(value).size !== value.length
  ) {
    throw new Error(message);
  }
}

function requiredString(value, message) {
  if (typeof value !== "string" || value === "") throw new Error(message);
  return value;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
