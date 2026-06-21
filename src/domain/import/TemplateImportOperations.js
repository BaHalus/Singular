import {
  createTemplate,
  createTemplates,
  serializeTemplates,
  validateTemplates,
} from "../character/Templates.js";
import { importTemplates as importLegacyTemplates } from "./importers/TemplatesImporter.js";

const IMPORT_STATUSES = ["ready", "ready-with-warnings", "blocked"];
const MERGE_POLICIES = ["reject", "keep-existing", "replace"];
const DEFAULT_SUPPORTED_VERSIONS = [2];

export class TemplateImportOperationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TemplateImportOperationError";
    this.code = code;
    this.details = details;
  }
}

export function analyzeTemplateImport(source = [], options = {}) {
  const normalizedOptions = normalizeImportOptions(options);
  const sourceFingerprint = createValueFingerprint(source);
  const diagnostics = [];
  let parsed;

  try {
    parsed = importLegacyTemplates(source);
  } catch (error) {
    const analysis = {
      status: "blocked",
      executable: false,
      sourceKind: detectSourceKind(source),
      sourceFingerprint,
      options: normalizedOptions,
      templates: [],
      opaqueTemplates: [],
      allTemplates: [],
      unknownNodes: [],
      recognizedTemplateIds: [],
      opaqueTemplateIds: [],
      diagnostics: [{
        code: "template-import-source-invalid",
        severity: "blocked",
        message: error instanceof Error ? error.message : String(error),
      }],
    };
    analysis.analysisFingerprint = createAnalysisFingerprint(analysis);
    validateTemplateImportAnalysis(analysis);
    return deepFreeze(analysis);
  }

  const recognized = parsed.templates.map(template => (
    canonicalizeRecognizedTemplate(template, normalizedOptions)
  ));
  const opaque = parsed.unknownNodes.map(node => (
    canonicalizeUnknownTemplateNode(node, normalizedOptions)
  ));

  collectVersionDiagnostics(recognized, normalizedOptions, diagnostics);
  for (const template of opaque) {
    diagnostics.push({
      code: "template-import-unknown-node-preserved",
      severity: "warning",
      templateId: template.id,
      sourceType: template.importMeta?.sourceType ?? null,
    });
  }

  const deduplicatedRecognized = deduplicateBySovereignId(
    recognized,
    diagnostics,
    "recognized",
  );
  const deduplicatedOpaque = deduplicateBySovereignId(
    opaque,
    diagnostics,
    "opaque",
  );
  const allTemplates = deduplicateBySovereignId(
    [...deduplicatedRecognized, ...deduplicatedOpaque],
    diagnostics,
    "catalog",
  );

  detectExternalIdentityConflicts(allTemplates, diagnostics);

  if (allTemplates.length === 0) {
    diagnostics.push({
      code: "template-import-empty",
      severity: "info",
    });
  }

  const status = determineImportStatus(diagnostics);
  const analysis = {
    status,
    executable: status !== "blocked",
    sourceKind: detectSourceKind(source),
    sourceFingerprint,
    options: normalizedOptions,
    templates: serializeTemplates(deduplicatedRecognized),
    opaqueTemplates: serializeTemplates(deduplicatedOpaque),
    allTemplates: serializeTemplates(allTemplates),
    unknownNodes: cloneValue(parsed.unknownNodes),
    recognizedTemplateIds: deduplicatedRecognized.map(template => template.id),
    opaqueTemplateIds: deduplicatedOpaque.map(template => template.id),
    diagnostics,
  };
  analysis.analysisFingerprint = createAnalysisFingerprint(analysis);

  validateTemplateImportAnalysis(analysis);
  return deepFreeze(analysis);
}

export function planTemplateImport(source = [], options = {}) {
  const analysis = analyzeTemplateImport(source, options);
  const plannedAt = normalizeTimestamp(options.now);
  const plan = {
    id: options.planId ?? generateId("template_import_plan"),
    operationId: options.operationId ?? generateId("template_import_operation"),
    plannedAt,
    status: analysis.status,
    executable: analysis.executable,
    sourceKind: analysis.sourceKind,
    sourceFingerprint: analysis.sourceFingerprint,
    analysisFingerprint: analysis.analysisFingerprint,
    snapshotFingerprint: createValueFingerprint(analysis),
    options: cloneValue(analysis.options),
    analysis: cloneValue(analysis),
  };
  plan.planFingerprint = createPlanFingerprint(plan);
  validateTemplateImportPlan(plan);
  return deepFreeze(plan);
}

export function executeTemplateImportPlan(source = [], plan, options = {}) {
  validateTemplateImportPlan(plan);
  if (!isPlainObject(options)) {
    throw new Error("Template import execution options must be object");
  }

  const currentAnalysis = analyzeTemplateImport(source, plan.options);
  if (
    currentAnalysis.sourceFingerprint !== plan.sourceFingerprint ||
    currentAnalysis.analysisFingerprint !== plan.analysisFingerprint
  ) {
    throw new TemplateImportOperationError(
      "TEMPLATE_IMPORT_PLAN_STALE",
      "Template import plan is stale",
      {
        expectedSourceFingerprint: plan.sourceFingerprint,
        currentSourceFingerprint: currentAnalysis.sourceFingerprint,
        expectedAnalysisFingerprint: plan.analysisFingerprint,
        currentAnalysisFingerprint: currentAnalysis.analysisFingerprint,
      },
    );
  }

  if (currentAnalysis.status === "blocked") {
    throw new TemplateImportOperationError(
      "TEMPLATE_IMPORT_BLOCKED",
      "Template import analysis is blocked",
      { diagnostics: currentAnalysis.diagnostics },
    );
  }
  const approvedAnalysis = plan.analysis;
  validateTemplateImportAnalysis(approvedAnalysis);
  const approvedSnapshotFingerprint = createValueFingerprint(approvedAnalysis);
  const approvedPlanFingerprint = createPlanFingerprint(plan);
  if (
    approvedSnapshotFingerprint !== plan.snapshotFingerprint ||
    approvedPlanFingerprint !== plan.planFingerprint
  ) {
    throw new TemplateImportOperationError(
      "TEMPLATE_IMPORT_PLAN_TAMPERED",
      "Template import plan snapshot was altered",
      {
        expectedSnapshotFingerprint: plan.snapshotFingerprint,
        currentSnapshotFingerprint: approvedSnapshotFingerprint,
        expectedPlanFingerprint: plan.planFingerprint,
        currentPlanFingerprint: approvedPlanFingerprint,
      },
    );
  }
  const executedAt = normalizeTimestamp(options.now ?? plan.plannedAt);
  const templates = createTemplates(approvedAnalysis.templates);
  const opaqueTemplates = createTemplates(approvedAnalysis.opaqueTemplates);
  const allTemplates = createTemplates(approvedAnalysis.allTemplates);
  const receipt = deepFreeze({
    id: plan.operationId,
    executedAt,
    status: approvedAnalysis.status,
    sourceKind: approvedAnalysis.sourceKind,
    sourceFingerprint: approvedAnalysis.sourceFingerprint,
    analysisFingerprint: approvedAnalysis.analysisFingerprint,
    planFingerprint: plan.planFingerprint,
    recognizedTemplateIds: [...approvedAnalysis.recognizedTemplateIds],
    opaqueTemplateIds: [...approvedAnalysis.opaqueTemplateIds],
    recognizedCount: templates.length,
    opaqueCount: opaqueTemplates.length,
    diagnosticCount: approvedAnalysis.diagnostics.length,
  });

  return deepFreeze({
    status: approvedAnalysis.status,
    templates,
    opaqueTemplates,
    allTemplates,
    unknownNodes: cloneValue(approvedAnalysis.unknownNodes),
    diagnostics: cloneValue(approvedAnalysis.diagnostics),
    report: createImportReport(approvedAnalysis, receipt),
    receipt,
    plan,
  });
}

export function importTemplateCatalog(source = [], options = {}) {
  const plan = planTemplateImport(source, options);
  return executeTemplateImportPlan(source, plan, options);
}

export function mergeImportedTemplateCatalog(
  existingTemplates,
  importedResult,
  options = {},
) {
  validateTemplates(existingTemplates);
  validateImportedResult(importedResult);
  if (!isPlainObject(options)) {
    throw new Error("Template catalog merge options must be object");
  }

  const policy = options.onIdConflict ?? "reject";
  if (!MERGE_POLICIES.includes(policy)) {
    throw new Error("Template catalog merge policy is invalid");
  }
  const includeOpaqueTemplates = options.includeOpaqueTemplates ?? false;
  if (typeof includeOpaqueTemplates !== "boolean") {
    throw new Error("includeOpaqueTemplates must be boolean");
  }

  const incoming = includeOpaqueTemplates
    ? importedResult.allTemplates
    : importedResult.templates;
  const existing = createTemplates(serializeTemplates(existingTemplates));
  detectCrossCatalogExternalConflicts(existing, incoming);

  const byId = new Map(existing.map(template => [template.id, template]));
  const orderedIds = existing.map(template => template.id);
  const addedTemplateIds = [];
  const replacedTemplateIds = [];
  const keptTemplateIds = [];
  const unchangedTemplateIds = [];

  for (const candidate of incoming) {
    const current = byId.get(candidate.id) ?? null;
    if (current === null) {
      byId.set(candidate.id, candidate);
      orderedIds.push(candidate.id);
      addedTemplateIds.push(candidate.id);
      continue;
    }

    if (templateFingerprint(current) === templateFingerprint(candidate)) {
      unchangedTemplateIds.push(candidate.id);
      continue;
    }

    if (policy === "reject") {
      throw new TemplateImportOperationError(
        "TEMPLATE_IMPORT_ID_CONFLICT",
        "Imported template conflicts with existing sovereign id",
        { templateId: candidate.id },
      );
    }
    if (policy === "keep-existing") {
      keptTemplateIds.push(candidate.id);
      continue;
    }

    byId.set(candidate.id, candidate);
    replacedTemplateIds.push(candidate.id);
  }

  const templates = createTemplates(orderedIds.map(id => byId.get(id)));
  return deepFreeze({
    templates,
    report: {
      policy,
      includeOpaqueTemplates,
      addedTemplateIds,
      replacedTemplateIds,
      keptTemplateIds,
      unchangedTemplateIds,
      resultingTemplateIds: templates.map(template => template.id),
    },
  });
}

export function validateTemplateImportAnalysis(analysis) {
  if (!isPlainObject(analysis)) {
    throw new Error("Template import analysis must be object");
  }
  if (!IMPORT_STATUSES.includes(analysis.status)) {
    throw new Error("Template import analysis status is invalid");
  }
  if (analysis.executable !== (analysis.status !== "blocked")) {
    throw new Error("Template import analysis executable flag is inconsistent");
  }
  for (const key of [
    "sourceKind",
    "sourceFingerprint",
    "analysisFingerprint",
  ]) {
    requiredString(analysis[key], `Template import analysis ${key} is required`);
  }
  if (!isPlainObject(analysis.options)) {
    throw new Error("Template import analysis options must be object");
  }
  validateSerializedTemplateArray(analysis.templates, "templates");
  validateSerializedTemplateArray(analysis.opaqueTemplates, "opaqueTemplates");
  validateSerializedTemplateArray(analysis.allTemplates, "allTemplates");
  validateUniqueStringArray(
    analysis.recognizedTemplateIds,
    "Recognized template ids must be unique string array",
  );
  validateUniqueStringArray(
    analysis.opaqueTemplateIds,
    "Opaque template ids must be unique string array",
  );
  if (!Array.isArray(analysis.unknownNodes)) {
    throw new Error("Template import unknownNodes must be array");
  }
  if (!Array.isArray(analysis.diagnostics)) {
    throw new Error("Template import diagnostics must be array");
  }
  for (const diagnostic of analysis.diagnostics) {
    if (!isPlainObject(diagnostic)) {
      throw new Error("Template import diagnostic must be object");
    }
    requiredString(diagnostic.code, "Template import diagnostic code is required");
    if (!["info", "warning", "pending", "blocked"].includes(diagnostic.severity)) {
      throw new Error("Template import diagnostic severity is invalid");
    }
  }
  return true;
}

export function validateTemplateImportPlan(plan) {
  if (!isPlainObject(plan)) throw new Error("Template import plan must be object");
  for (const key of [
    "id",
    "operationId",
    "plannedAt",
    "status",
    "sourceKind",
    "sourceFingerprint",
    "analysisFingerprint",
    "snapshotFingerprint",
    "planFingerprint",
  ]) {
    requiredString(plan[key], `Template import plan ${key} is required`);
  }
  if (!IMPORT_STATUSES.includes(plan.status)) {
    throw new Error("Template import plan status is invalid");
  }
  if (plan.executable !== (plan.status !== "blocked")) {
    throw new Error("Template import plan executable flag is inconsistent");
  }
  if (!isPlainObject(plan.options) || !isPlainObject(plan.analysis)) {
    throw new Error("Template import plan snapshots are invalid");
  }
  return true;
}

export function getTemplateImportStatuses() {
  return [...IMPORT_STATUSES];
}

export function getTemplateCatalogMergePolicies() {
  return [...MERGE_POLICIES];
}

function canonicalizeRecognizedTemplate(imported, options) {
  const raw = imported.raw ?? {};
  const externalIds = cloneValue(imported.externalIds ?? {});
  const hasExternalIdentity = Object.values(externalIds).some(isExternalScalar);
  const id = hasExternalIdentity
    ? imported.id
    : `gct_template_${stableHash(canonicalStringify(raw))}`;
  const importFingerprint = createValueFingerprint(raw);

  return createTemplate({
    ...cloneValue(imported),
    id,
    externalIds,
    source: {
      kind: "imported",
      provider: options.provider,
      format: options.format,
      reference: imported.reference ?? null,
      version: imported.sourceVersion ?? null,
    },
    importMeta: {
      ...(imported.importMeta ?? {}),
      importFingerprint,
      identityStrategy: hasExternalIdentity ? "external-id" : "content-hash",
    },
    raw,
  });
}

function canonicalizeUnknownTemplateNode(node, options) {
  const raw = node.raw ?? node;
  const externalIds = cloneValue(node.externalIds ?? {});
  const hasExternalIdentity = Object.values(externalIds).some(isExternalScalar);
  const id = hasExternalIdentity
    ? node.id
    : `gct_template_unknown_${stableHash(canonicalStringify(raw))}`;
  const importFingerprint = createValueFingerprint(raw);

  return createTemplate({
    id,
    externalIds,
    name: node.name ?? "",
    templateType: "unknown",
    source: {
      kind: "imported",
      provider: options.provider,
      format: options.format,
      reference: null,
      version: null,
    },
    entries: [{
      id: `${id}:entry:unknown:source`,
      domain: "unknown",
      entryType: "unknown",
      externalIds,
      referenceId: null,
      payload: {
        name: node.name ?? "",
        sourceType: node.importMeta?.sourceType ?? raw?.type ?? null,
      },
      notes: "",
      tags: ["import:unknown-template-node"],
      importMeta: {
        ...(node.importMeta ?? {}),
        importFingerprint,
      },
      raw,
    }],
    importedPoints: null,
    calculatedPoints: null,
    notes: "",
    tags: ["import:gcs", "format:gct", "template-type:unknown"],
    importMeta: {
      ...(node.importMeta ?? {}),
      importFingerprint,
      identityStrategy: hasExternalIdentity ? "external-id" : "content-hash",
      opaque: true,
    },
    raw,
  });
}

function deduplicateBySovereignId(templates, diagnostics, scope) {
  const result = [];
  const byId = new Map();

  for (const template of templates) {
    const existing = byId.get(template.id) ?? null;
    if (existing === null) {
      byId.set(template.id, template);
      result.push(template);
      continue;
    }

    if (importDefinitionFingerprint(existing) ===
        importDefinitionFingerprint(template)) {
      diagnostics.push({
        code: "template-import-duplicate-collapsed",
        severity: "warning",
        templateId: template.id,
        scope,
      });
      continue;
    }

    diagnostics.push({
      code: "template-import-id-conflict",
      severity: "blocked",
      templateId: template.id,
      scope,
    });
  }

  return result;
}

function detectExternalIdentityConflicts(templates, diagnostics) {
  const identities = new Map();
  for (const template of templates) {
    for (const [key, value] of Object.entries(template.externalIds)) {
      if (!isExternalScalar(value)) continue;
      const identity = `${key}:${canonicalStringify(value)}`;
      const existing = identities.get(identity) ?? null;
      if (existing === null) {
        identities.set(identity, template.id);
        continue;
      }
      if (existing !== template.id) {
        diagnostics.push({
          code: "template-import-external-id-conflict",
          severity: "blocked",
          externalKey: key,
          externalValue: value,
          templateIds: [existing, template.id],
        });
      }
    }
  }
}

function detectCrossCatalogExternalConflicts(existing, incoming) {
  const identities = new Map();
  for (const template of existing) {
    for (const [key, value] of Object.entries(template.externalIds)) {
      if (isExternalScalar(value)) {
        identities.set(`${key}:${canonicalStringify(value)}`, template.id);
      }
    }
  }

  for (const template of incoming) {
    for (const [key, value] of Object.entries(template.externalIds)) {
      if (!isExternalScalar(value)) continue;
      const identity = `${key}:${canonicalStringify(value)}`;
      const existingId = identities.get(identity) ?? null;
      if (existingId !== null && existingId !== template.id) {
        throw new TemplateImportOperationError(
          "TEMPLATE_IMPORT_EXTERNAL_ID_CONFLICT",
          "Imported external identity belongs to another sovereign template id",
          {
            externalKey: key,
            externalValue: value,
            existingTemplateId: existingId,
            importedTemplateId: template.id,
          },
        );
      }
    }
  }
}

function collectVersionDiagnostics(templates, options, diagnostics) {
  for (const template of templates) {
    const version = template.source.version;
    if (version === null) {
      diagnostics.push({
        code: "template-import-version-missing",
        severity: "warning",
        templateId: template.id,
      });
      continue;
    }
    const numeric = typeof version === "number" ? version : Number(version);
    if (!options.supportedVersions.includes(numeric)) {
      diagnostics.push({
        code: "template-import-version-unsupported",
        severity: "warning",
        templateId: template.id,
        version,
        supportedVersions: [...options.supportedVersions],
      });
    }
  }
}

function normalizeImportOptions(options) {
  if (!isPlainObject(options)) {
    throw new Error("Template import options must be object");
  }
  const supportedVersions = options.supportedVersions ?? DEFAULT_SUPPORTED_VERSIONS;
  if (
    !Array.isArray(supportedVersions) ||
    supportedVersions.some(value => !Number.isInteger(value) || value < 0) ||
    new Set(supportedVersions).size !== supportedVersions.length
  ) {
    throw new Error("Template import supportedVersions must be unique non-negative integers");
  }
  return {
    provider: normalizeNonEmptyString(options.provider ?? "gcs", "provider"),
    format: normalizeNonEmptyString(options.format ?? "gct", "format"),
    supportedVersions: [...supportedVersions],
  };
}

function createImportReport(analysis, receipt) {
  return deepFreeze({
    status: analysis.status,
    sourceKind: analysis.sourceKind,
    sourceFingerprint: analysis.sourceFingerprint,
    recognizedTemplateIds: [...analysis.recognizedTemplateIds],
    opaqueTemplateIds: [...analysis.opaqueTemplateIds],
    diagnostics: cloneValue(analysis.diagnostics),
    receipt: cloneValue(receipt),
  });
}

function determineImportStatus(diagnostics) {
  if (diagnostics.some(item => item.severity === "blocked")) return "blocked";
  if (diagnostics.some(item => ["warning", "pending"].includes(item.severity))) {
    return "ready-with-warnings";
  }
  return "ready";
}

function detectSourceKind(source) {
  if (Array.isArray(source)) return "template-array";
  if (!isPlainObject(source)) return "invalid";
  const type = String(source.type ?? "").trim().toLowerCase();
  if (type === "template") return "standalone-template";
  if (type === "template_list") return "template-list";
  if (
    Array.isArray(source.templates) ||
    Array.isArray(source.templateRows) ||
    Array.isArray(source.template_rows)
  ) {
    return "embedded-templates";
  }
  return "empty-or-unknown";
}

function createAnalysisFingerprint(analysis) {
  return createValueFingerprint({
    status: analysis.status,
    sourceKind: analysis.sourceKind,
    sourceFingerprint: analysis.sourceFingerprint,
    options: analysis.options,
    recognizedTemplateIds: analysis.recognizedTemplateIds,
    opaqueTemplateIds: analysis.opaqueTemplateIds,
    importDefinitions: [
      ...analysis.templates,
      ...analysis.opaqueTemplates,
    ].map(template => ({
      id: template.id,
      importFingerprint: template.importMeta?.importFingerprint ?? null,
      opaque: template.importMeta?.opaque === true,
      sourceVersion: template.source?.version ?? null,
    })),
    diagnostics: analysis.diagnostics,
  });
}

function createPlanFingerprint(plan) {
  return createValueFingerprint({
    id: plan.id,
    operationId: plan.operationId,
    status: plan.status,
    sourceKind: plan.sourceKind,
    sourceFingerprint: plan.sourceFingerprint,
    analysisFingerprint: plan.analysisFingerprint,
    snapshotFingerprint: plan.snapshotFingerprint,
    options: plan.options,
  });
}

function validateSerializedTemplateArray(value, field) {
  if (!Array.isArray(value)) {
    throw new Error(`Template import analysis ${field} must be array`);
  }
  createTemplates(value);
}

function validateImportedResult(result) {
  if (!isPlainObject(result)) {
    throw new Error("Imported template result must be object");
  }
  validateTemplates(result.templates);
  validateTemplates(result.opaqueTemplates);
  validateTemplates(result.allTemplates);
}

function importDefinitionFingerprint(template) {
    const fingerprint = template.importMeta?.importFingerprint;
    return typeof fingerprint === "string" && fingerprint !== ""
      ? fingerprint
      : templateFingerprint(template);
  }

  function templateFingerprint(template) {
  return createValueFingerprint(serializeTemplates([template])[0]);
}

function createValueFingerprint(value) {
  return stableHash(canonicalStringify(value));
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value, new WeakSet()));
}

function canonicalize(value, stack) {
  if (Array.isArray(value)) {
    if (stack.has(value)) throw new Error("Template import source cannot be cyclic");
    stack.add(value);
    const result = value.map(item => canonicalize(item, stack));
    stack.delete(value);
    return result;
  }
  if (isPlainObject(value)) {
    if (stack.has(value)) throw new Error("Template import source cannot be cyclic");
    stack.add(value);
    const result = Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key], stack)]),
    );
    stack.delete(value);
    return result;
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function stableHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Template import timestamp must be valid string, Date or null");
  }
  return value;
}

function normalizeNonEmptyString(value, field) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`Template import ${field} must be non-empty string`);
  }
  return value;
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
}

function isExternalScalar(value) {
  return ["string", "number"].includes(typeof value) && value !== "";
}

function cloneValue(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    value.forEach(item => result.push(cloneValue(item, seen)));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    Object.entries(value).forEach(([key, item]) => {
      result[key] = cloneValue(item, seen);
    });
    return result;
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

function generateId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
