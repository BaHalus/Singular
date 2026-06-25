import {
  findLibraryAdapter,
  hasLibraryInstantiationCapability,
  validateLibraryAdapterRegistry,
} from "./LibraryAdapter.js";
import {
  serializeLibraryInstantiationPlan,
  validateLibraryInstantiationPlan,
} from "./LibraryInstantiationPlan.js";

export function executeLibraryInstantiationPlan(plan, adapterRegistry, context = {}) {
  validateLibraryInstantiationPlan(plan);
  validateLibraryAdapterRegistry(adapterRegistry);
  validatePortableObject(context, "Library instantiation execution context");

  if (!plan.executable) {
    throw new Error("Library instantiation plan is not executable");
  }

  const orderedActions = orderActionsByDependencies(plan.actions);
  const executableAdaptersByDomain = preflightExecutableAdapters(
    adapterRegistry,
    orderedActions,
  );
  const actionResults = [];

  for (const action of orderedActions) {
    const adapter = executableAdaptersByDomain.get(action.domain);
    const result = adapter.executeInstantiationPlan({
      plan: serializeLibraryInstantiationPlan(plan),
      action: clonePortableValue(action, `Library instantiation action ${action.id}`),
      completedActions: clonePortableValue(actionResults, "Library instantiation completed actions"),
      context: clonePortableValue(context, "Library instantiation execution context"),
    });

    actionResults.push(normalizeActionResult(action, result));
  }

  return deepFreeze({
    schemaVersion: 1,
    planId: plan.id,
    status: plan.status === "ready-with-warnings"
      ? "completed-with-warnings"
      : "completed",
    actionResults: deepFreeze(actionResults),
    diagnostics: deepFreeze(collectPlanDiagnostics(plan)),
  });
}

function preflightExecutableAdapters(adapterRegistry, actions) {
  const adaptersByDomain = new Map();

  for (const action of actions) {
    if (!adaptersByDomain.has(action.domain)) {
      adaptersByDomain.set(
        action.domain,
        requireExecutableAdapter(adapterRegistry, action.domain),
      );
    }
  }

  return adaptersByDomain;
}

function requireExecutableAdapter(adapterRegistry, domain) {
  const adapter = findLibraryAdapter(adapterRegistry, domain);
  if (adapter === null) {
    throw new Error(`Library adapter not found for domain: ${domain}`);
  }
  if (!hasLibraryInstantiationCapability(adapter)) {
    throw new Error(
      `Library adapter ${domain} cannot execute instantiation plans`,
    );
  }
  return adapter;
}

function orderActionsByDependencies(actions) {
  const actionsById = new Map(actions.map(action => [action.id, action]));
  const emitted = new Set();
  const ordered = [];

  for (const action of actions) {
    emitAction(action, actionsById, emitted, ordered);
  }

  return ordered;
}

function emitAction(action, actionsById, emitted, ordered) {
  if (emitted.has(action.id)) return;
  for (const dependencyId of action.dependsOnActionIds) {
    emitAction(actionsById.get(dependencyId), actionsById, emitted, ordered);
  }
  emitted.add(action.id);
  ordered.push(action);
}

function normalizeActionResult(action, result) {
  if (!isPlainObject(result)) {
    throw new Error(
      `Library instantiation result for action ${action.id} must be an object`,
    );
  }

  return {
    actionId: action.id,
    definitionId: action.definitionId,
    domain: action.domain,
    type: action.type,
    result: clonePortableValue(
      result,
      `Library instantiation result for action ${action.id}`,
    ),
  };
}

function collectPlanDiagnostics(plan) {
  const diagnostics = [...plan.diagnostics];
  for (const action of plan.actions) {
    diagnostics.push(...action.diagnostics);
  }
  return clonePortableValue(diagnostics, "Library instantiation diagnostics");
}

function validatePortableObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  clonePortableValue(value, label);
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
