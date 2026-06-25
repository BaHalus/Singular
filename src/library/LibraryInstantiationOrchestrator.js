import {
  findLibraryAdapter,
  hasLibraryInstantiationCapability,
  validateLibraryAdapterRegistry,
  validateLibraryDefinitionWithAdapter,
} from "./LibraryAdapter.js";
import {
  createLibraryDefinitions,
  serializeLibraryDefinitions,
} from "./LibraryDefinition.js";
import {
  createLibraryInstantiationPlan,
  serializeLibraryInstantiationPlan,
} from "./LibraryInstantiationPlan.js";
import { executeLibraryInstantiationPlan } from "./LibraryInstantiationRunner.js";

const ORCHESTRATION_STATUSES = [
  "completed",
  "completed-with-warnings",
  "blocked",
];
const ANALYSIS_STATUSES = ["ready", "ready-with-warnings", "blocked"];

export function orchestrateLibraryInstantiation(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Library instantiation orchestration input must be an object");
  }

  const adapterRegistry = input.adapterRegistry;
  validateLibraryAdapterRegistry(adapterRegistry);
  const context = normalizePortableObject(
    input.context,
    "Library instantiation orchestration context",
    {},
  );
  const definitions = createLibraryDefinitions(input.definitions ?? []);
  const rootDefinitionIds = normalizeUniqueStringArray(
    input.rootDefinitionIds,
    "Library instantiation orchestration roots",
  );

  validateRoots(definitions, rootDefinitionIds);
  validateDefinitionsWithAdapters(definitions, adapterRegistry);
  const executableAdaptersByDomain = preflightInstantiationAdapters(
    definitions,
    adapterRegistry,
  );

  const analysisResults = analyzeDefinitions({
    definitions,
    rootDefinitionIds,
    adapterRegistry,
    executableAdaptersByDomain,
    context,
  });

  const analysisDiagnostics = collectDiagnostics(analysisResults);
  const blockedAnalysis = analysisResults.some(result => result.status === "blocked");
  if (blockedAnalysis) {
    return freezeOrchestrationResult({
      status: "blocked",
      rootDefinitionIds,
      analysisResults,
      diagnostics: analysisDiagnostics,
      plan: null,
      execution: null,
    });
  }

  const plan = planInstantiation({
    definitions,
    rootDefinitionIds,
    adapterRegistry,
    executableAdaptersByDomain,
    analysisResults,
    context,
  });
  const serializedPlan = serializeLibraryInstantiationPlan(plan);

  if (plan.status === "blocked") {
    return freezeOrchestrationResult({
      status: "blocked",
      rootDefinitionIds,
      analysisResults,
      diagnostics: [...analysisDiagnostics, ...plan.diagnostics],
      plan: serializedPlan,
      execution: null,
    });
  }

  const execution = executeLibraryInstantiationPlan(plan, adapterRegistry, context);

  return freezeOrchestrationResult({
    status: execution.status,
    rootDefinitionIds,
    analysisResults,
    diagnostics: [...analysisDiagnostics, ...execution.diagnostics],
    plan: serializedPlan,
    execution,
  });
}

function validateDefinitionsWithAdapters(definitions, adapterRegistry) {
  definitions.forEach(definition => {
    validateLibraryDefinitionWithAdapter(definition, adapterRegistry);
  });
}

function preflightInstantiationAdapters(definitions, adapterRegistry) {
  const adaptersByDomain = new Map();
  for (const definition of definitions) {
    if (!adaptersByDomain.has(definition.domain)) {
      const adapter = findLibraryAdapter(adapterRegistry, definition.domain);
      if (adapter === null) {
        throw new Error(`Library adapter not found for domain: ${definition.domain}`);
      }
      if (!hasLibraryInstantiationCapability(adapter)) {
        throw new Error(
          `Library adapter ${definition.domain} cannot orchestrate instantiation`,
        );
      }
      adaptersByDomain.set(definition.domain, adapter);
    }
  }
  return adaptersByDomain;
}

function analyzeDefinitions({
  definitions,
  rootDefinitionIds,
  adapterRegistry,
  executableAdaptersByDomain,
  context,
}) {
  const serializedDefinitions = serializeLibraryDefinitions(definitions);
  return definitions.map(definition => {
    const adapter = executableAdaptersByDomain.get(definition.domain);
    const analysis = adapter.analyzeInstantiation({
      definition: clonePortableValue(definition, `Library definition ${definition.id}`),
      definitions: serializedDefinitions,
      rootDefinitionIds: [...rootDefinitionIds],
      adapterRegistry,
      context: clonePortableValue(context, "Library instantiation orchestration context"),
    });
    return normalizePhaseResult(
      analysis,
      definition,
      `Library instantiation analysis for ${definition.id}`,
    );
  });
}

function planInstantiation({
  definitions,
  rootDefinitionIds,
  adapterRegistry,
  executableAdaptersByDomain,
  analysisResults,
  context,
}) {
  const definitionsById = new Map(definitions.map(definition => [definition.id, definition]));
  const serializedDefinitions = serializeLibraryDefinitions(definitions);
  const planParts = [];

  for (const rootDefinitionId of rootDefinitionIds) {
    const definition = definitionsById.get(rootDefinitionId);
    const adapter = executableAdaptersByDomain.get(definition.domain);
    const planPart = adapter.planInstantiation({
      definition: clonePortableValue(definition, `Library definition ${definition.id}`),
      definitions: serializedDefinitions,
      rootDefinitionIds: [...rootDefinitionIds],
      analysisResults: clonePortableValue(
        analysisResults,
        "Library instantiation analysis results",
      ),
      adapterRegistry,
      context: clonePortableValue(context, "Library instantiation orchestration context"),
    });
    planParts.push(normalizePlanPart(planPart, definition));
  }

  const diagnostics = planParts.flatMap(part => part.diagnostics);
  const blocked = planParts.some(part => part.status === "blocked");
  const warned = planParts.some(part => part.status === "ready-with-warnings")
    || diagnostics.some(diagnostic => diagnostic.severity === "warning");

  return createLibraryInstantiationPlan({
    id: generateLibraryInstantiationOrchestrationPlanId(),
    status: blocked ? "blocked" : warned ? "ready-with-warnings" : "ready",
    rootDefinitionIds,
    resolvedDefinitionIds: definitions.map(definition => definition.id),
    actions: blocked ? [] : planParts.flatMap(part => part.actions),
    diagnostics,
  });
}

function normalizePhaseResult(result, definition, label) {
  if (!isPlainObject(result)) {
    throw new Error(`${label} must be an object`);
  }
  const status = normalizeAnalysisStatus(result.status ?? "ready", `${label} status`);
  const normalized = {
    definitionId: definition.id,
    domain: definition.domain,
    status,
    diagnostics: normalizeDiagnostics(result.diagnostics, `${label} diagnostics`),
  };
  return deepFreeze(normalized);
}

function normalizePlanPart(result, definition) {
  if (!isPlainObject(result)) {
    throw new Error(`Library instantiation plan part for ${definition.id} must be an object`);
  }
  const status = normalizeAnalysisStatus(
    result.status ?? "ready",
    `Library instantiation plan part for ${definition.id} status`,
  );
  const actions = normalizeActions(
    result.actions,
    `Library instantiation plan part for ${definition.id} actions`,
  );
  const diagnostics = normalizeDiagnostics(
    result.diagnostics,
    `Library instantiation plan part for ${definition.id} diagnostics`,
  );
  return deepFreeze({ status, actions, diagnostics });
}

function normalizeActions(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map((action, index) => {
    if (!isPlainObject(action)) {
      throw new Error(`${label}[${index}] must be an object`);
    }
    return clonePortableValue(action, `${label}[${index}]`);
  });
}

function normalizeDiagnostics(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map((diagnostic, index) => {
    if (!isPlainObject(diagnostic)) {
      throw new Error(`${label}[${index}] must be an object`);
    }
    const normalized = clonePortableValue(diagnostic, `${label}[${index}]`);
    normalizeRequiredString(normalized.code, `${label}[${index}].code`);
    if (!["info", "warning", "blocked"].includes(normalized.severity)) {
      throw new Error(`${label}[${index}].severity is invalid`);
    }
    return normalized;
  });
}

function collectDiagnostics(analysisResults) {
  return analysisResults.flatMap(result => result.diagnostics);
}

function freezeOrchestrationResult({
  status,
  rootDefinitionIds,
  analysisResults,
  diagnostics,
  plan,
  execution,
}) {
  if (!ORCHESTRATION_STATUSES.includes(status)) {
    throw new Error("Library instantiation orchestration status is invalid");
  }
  return deepFreeze({
    schemaVersion: 1,
    status,
    rootDefinitionIds: clonePortableValue(
      rootDefinitionIds,
      "Library instantiation orchestration roots",
    ),
    analysisResults: clonePortableValue(
      analysisResults,
      "Library instantiation analysis results",
    ),
    diagnostics: clonePortableValue(
      diagnostics,
      "Library instantiation orchestration diagnostics",
    ),
    plan: clonePortableValue(plan, "Library instantiation orchestration plan"),
    execution: clonePortableValue(
      execution,
      "Library instantiation orchestration execution",
    ),
  });
}

function validateRoots(definitions, rootDefinitionIds) {
  const ids = new Set(definitions.map(definition => definition.id));
  for (const rootDefinitionId of rootDefinitionIds) {
    if (!ids.has(rootDefinitionId)) {
      throw new Error(
        `Library instantiation orchestration root not found: ${rootDefinitionId}`,
      );
    }
  }
}

function normalizeAnalysisStatus(value, label) {
  if (!ANALYSIS_STATUSES.includes(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function normalizePortableObject(value, label, fallback) {
  if (value === undefined || value === null) {
    return clonePortableValue(fallback, label);
  }
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  return clonePortableValue(value, label);
}

function normalizeUniqueStringArray(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  const strings = value.map((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );
  if (new Set(strings).size !== strings.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
  return strings;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function clonePortableValue(value, label, seen = new WeakMap()) {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must contain only finite numbers`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error(`${label} must contain only portable JSON values`);
  }
  if (seen.has(value)) {
    throw new Error(`${label} must not contain cycles`);
  }
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach((item, index) => {
      clone.push(clonePortableValue(item, `${label}[${index}]`, seen));
    });
    seen.delete(value);
    return clone;
  }
  if (!isPlainObject(value)) {
    throw new Error(`${label} must contain only plain objects and arrays`);
  }
  const clone = {};
  seen.set(value, clone);
  for (const [key, item] of Object.entries(value)) {
    clone[key] = clonePortableValue(item, `${label}.${key}`, seen);
  }
  seen.delete(value);
  return clone;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function generateLibraryInstantiationOrchestrationPlanId() {
  return `library_orchestration_plan_${Math.random().toString(36).slice(2, 10)}`;
}
