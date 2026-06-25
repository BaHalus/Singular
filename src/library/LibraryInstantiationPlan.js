const PLAN_STATUSES = [
  "ready",
  "ready-with-warnings",
  "blocked",
];

export function createLibraryInstantiationPlan(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Library instantiation plan must be an object");
  }

  const status = normalizeStatus(input.status ?? "ready");
  const plan = {
    schemaVersion: normalizePositiveInteger(
      input.schemaVersion ?? 1,
      "Library instantiation plan schemaVersion",
    ),
    id: normalizeRequiredString(
      input.id ?? generateLibraryInstantiationPlanId(),
      "Library instantiation plan id",
    ),
    status,
    executable: normalizeExecutable(input.executable, status),
    rootDefinitionIds: normalizeUniqueStringArray(
      input.rootDefinitionIds,
      "Library instantiation plan roots",
    ),
    resolvedDefinitionIds: normalizeUniqueStringArray(
      input.resolvedDefinitionIds,
      "Library instantiation plan resolution order",
    ),
    actions: normalizeActions(input.actions),
    diagnostics: normalizeDiagnostics(input.diagnostics),
  };

  validateLibraryInstantiationPlan(plan);
  return deepFreeze(plan);
}

export function validateLibraryInstantiationPlan(plan) {
  if (!isPlainObject(plan)) {
    throw new Error("Library instantiation plan must be an object");
  }

  normalizePositiveInteger(
    plan.schemaVersion,
    "Library instantiation plan schemaVersion",
  );
  normalizeRequiredString(plan.id, "Library instantiation plan id");
  const status = normalizeStatus(plan.status);

  if (plan.executable !== (status !== "blocked")) {
    throw new Error("Library instantiation plan executable flag is inconsistent");
  }

  validateUniqueStringArray(
    plan.rootDefinitionIds,
    "Library instantiation plan roots",
  );
  validateUniqueStringArray(
    plan.resolvedDefinitionIds,
    "Library instantiation plan resolution order",
  );
  validateActions(plan.actions);
  validateDiagnostics(plan.diagnostics);
  validatePlanCoverage(plan);

  return true;
}

export function serializeLibraryInstantiationPlan(plan) {
  validateLibraryInstantiationPlan(plan);
  return clonePortableValue(plan, "Library instantiation plan");
}

function normalizeExecutable(value, status) {
  if (value === undefined || value === null) {
    return status !== "blocked";
  }
  if (typeof value !== "boolean") {
    throw new Error("Library instantiation plan executable must be boolean");
  }
  return value;
}

function normalizeStatus(value) {
  if (!PLAN_STATUSES.includes(value)) {
    throw new Error("Library instantiation plan status is invalid");
  }
  return value;
}

function normalizeActions(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Library instantiation plan actions must be an array");
  }

  const actions = value.map((action, index) => normalizeAction(action, index));
  validateActionUniqueness(actions);
  return actions;
}

function normalizeAction(action, index) {
  if (!isPlainObject(action)) {
    throw new Error(`Library instantiation plan action[${index}] must be an object`);
  }

  return {
    id: normalizeRequiredString(
      action.id,
      `Library instantiation plan action[${index}] id`,
    ),
    definitionId: normalizeRequiredString(
      action.definitionId,
      `Library instantiation plan action[${index}] definitionId`,
    ),
    domain: normalizeRequiredString(
      action.domain,
      `Library instantiation plan action[${index}] domain`,
    ),
    type: normalizeRequiredString(
      action.type,
      `Library instantiation plan action[${index}] type`,
    ),
    payload: normalizePortableObject(
      action.payload,
      `Library instantiation plan action[${index}] payload`,
      {},
    ),
    dependsOnActionIds: normalizeUniqueStringArray(
      action.dependsOnActionIds,
      `Library instantiation plan action[${index}] dependencies`,
    ),
    diagnostics: normalizeDiagnostics(action.diagnostics),
  };
}

function validateActions(actions) {
  if (!Array.isArray(actions)) {
    throw new Error("Library instantiation plan actions must be an array");
  }

  actions.forEach((action, index) => {
    if (!isPlainObject(action)) {
      throw new Error(`Library instantiation plan action[${index}] must be an object`);
    }
    normalizeRequiredString(action.id, `Library instantiation plan action[${index}] id`);
    normalizeRequiredString(
      action.definitionId,
      `Library instantiation plan action[${index}] definitionId`,
    );
    normalizeRequiredString(
      action.domain,
      `Library instantiation plan action[${index}] domain`,
    );
    normalizeRequiredString(action.type, `Library instantiation plan action[${index}] type`);
    validatePortableObject(
      action.payload,
      `Library instantiation plan action[${index}] payload`,
    );
    validateUniqueStringArray(
      action.dependsOnActionIds,
      `Library instantiation plan action[${index}] dependencies`,
    );
    validateDiagnostics(action.diagnostics);
  });

  validateActionUniqueness(actions);
  validateActionDependencyReferences(actions);
  validateActionDependencyGraph(actions);
}

function validateActionUniqueness(actions) {
  const ids = new Set();
  for (const action of actions) {
    if (ids.has(action.id)) {
      throw new Error(`Duplicate Library instantiation plan action id: ${action.id}`);
    }
    ids.add(action.id);
  }
}

function validateActionDependencyReferences(actions) {
  const ids = new Set(actions.map(action => action.id));
  for (const action of actions) {
    for (const dependencyId of action.dependsOnActionIds) {
      if (!ids.has(dependencyId)) {
        throw new Error(
          `Library instantiation plan action dependency not found: ${dependencyId}`,
        );
      }
      if (dependencyId === action.id) {
        throw new Error("Library instantiation plan action must not depend on itself");
      }
    }
  }
}

function validateActionDependencyGraph(actions) {
  const visiting = new Set();
  const visited = new Set();
  const actionsById = new Map(actions.map(action => [action.id, action]));

  for (const action of actions) {
    visitActionDependency(action, actionsById, visiting, visited);
  }
}

function visitActionDependency(action, actionsById, visiting, visited) {
  if (visited.has(action.id)) return;
  if (visiting.has(action.id)) {
    throw new Error(
      `Library instantiation plan action dependency cycle detected: ${action.id}`,
    );
  }

  visiting.add(action.id);
  for (const dependencyId of action.dependsOnActionIds) {
    visitActionDependency(actionsById.get(dependencyId), actionsById, visiting, visited);
  }
  visiting.delete(action.id);
  visited.add(action.id);
}

function normalizeDiagnostics(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Library instantiation diagnostics must be an array");
  }
  return value.map((diagnostic, index) => normalizeDiagnostic(diagnostic, index));
}

function normalizeDiagnostic(diagnostic, index) {
  if (!isPlainObject(diagnostic)) {
    throw new Error(`Library instantiation diagnostic[${index}] must be an object`);
  }

  const normalized = clonePortableValue(
    diagnostic,
    `Library instantiation diagnostic[${index}]`,
  );
  normalizeRequiredString(
    normalized.code,
    `Library instantiation diagnostic[${index}] code`,
  );
  if (!["info", "warning", "blocked"].includes(normalized.severity)) {
    throw new Error(`Library instantiation diagnostic[${index}] severity is invalid`);
  }
  return normalized;
}

function validateDiagnostics(diagnostics) {
  if (!Array.isArray(diagnostics)) {
    throw new Error("Library instantiation diagnostics must be an array");
  }
  diagnostics.forEach((diagnostic, index) => {
    if (!isPlainObject(diagnostic)) {
      throw new Error(`Library instantiation diagnostic[${index}] must be an object`);
    }
    normalizeRequiredString(
      diagnostic.code,
      `Library instantiation diagnostic[${index}] code`,
    );
    if (!["info", "warning", "blocked"].includes(diagnostic.severity)) {
      throw new Error(`Library instantiation diagnostic[${index}] severity is invalid`);
    }
    clonePortableValue(diagnostic, `Library instantiation diagnostic[${index}]`);
  });
}

function validatePlanCoverage(plan) {
  const resolved = new Set(plan.resolvedDefinitionIds);
  for (const rootDefinitionId of plan.rootDefinitionIds) {
    if (!resolved.has(rootDefinitionId)) {
      throw new Error(
        `Library instantiation plan root references unresolved definition: ${rootDefinitionId}`,
      );
    }
  }

  for (const action of plan.actions) {
    if (!resolved.has(action.definitionId)) {
      throw new Error(
        `Library instantiation plan action references unresolved definition: ${action.definitionId}`,
      );
    }
  }

  if (plan.status === "blocked" && plan.actions.length !== 0) {
    throw new Error("Blocked Library instantiation plan must not contain actions");
  }
}

function normalizePortableObject(value, label, fallback) {
  if (value === undefined || value === null) {
    return clonePortableValue(fallback, label);
  }
  validatePortableObject(value, label);
  return clonePortableValue(value, label);
}

function validatePortableObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  clonePortableValue(value, label);
}

function normalizeUniqueStringArray(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  const strings = value.map((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );
  validateUniqueStringArray(strings, label);
  return strings;
}

function validateUniqueStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  value.forEach((item, index) => {
    normalizeRequiredString(item, `${label}[${index}]`);
  });
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
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

function generateLibraryInstantiationPlanId() {
  return `library_plan_${Math.random().toString(36).slice(2, 10)}`;
}
