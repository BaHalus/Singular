const STATUSES = [
  "active",
  "maintenance-due",
  "maintenance-unpaid",
  "return-pending",
  "expired",
];

export function createFormTransitionRuntime(input = null) {
  if (input == null) return null;

  const runtime = {
    activationId: requiredText(input.activationId, "activationId"),
    formId: requiredText(input.formId, "formId"),
    startedAt: timestamp(input.startedAt, "startedAt"),
    observedAt: timestamp(
      input.observedAt ?? input.startedAt,
      "observedAt",
    ),
    elapsedSeconds: nonNegativeNumber(
      input.elapsedSeconds,
      0,
      "elapsedSeconds",
    ),
    status: input.status ?? "active",
    maintenance: normalizeMaintenance(input.maintenance),
    duration: {
      minimumSeconds: nullableNonNegativeNumber(
        input.duration?.minimumSeconds,
        "minimumSeconds",
      ),
      maximumSeconds: nullableNonNegativeNumber(
        input.duration?.maximumSeconds,
        "maximumSeconds",
      ),
      minimumReached: input.duration?.minimumReached ?? false,
      maximumReached: input.duration?.maximumReached ?? false,
    },
    returnRequest: normalizeReturnRequest(input.returnRequest),
  };

  validateFormTransitionRuntime(runtime);

  return runtime;
}

export function validateFormTransitionRuntime(runtime) {
  if (runtime == null) return true;

  if (!isPlainObject(runtime)) {
    throw new Error("Form transition runtime must be object or null");
  }

  requiredText(runtime.activationId, "activationId");
  requiredText(runtime.formId, "formId");
  timestamp(runtime.startedAt, "startedAt");
  timestamp(runtime.observedAt, "observedAt");

  if (Date.parse(runtime.observedAt) < Date.parse(runtime.startedAt)) {
    throw new Error("Runtime clock cannot move before start");
  }

  nonNegativeNumber(runtime.elapsedSeconds, null, "elapsedSeconds");

  if (!STATUSES.includes(runtime.status)) {
    throw new Error("Form transition runtime status is invalid");
  }

  validateMaintenance(runtime.maintenance);

  if (!isPlainObject(runtime.duration)) {
    throw new Error("Form transition runtime duration must be object");
  }

  nullableNonNegativeNumber(
    runtime.duration.minimumSeconds,
    "minimumSeconds",
  );
  nullableNonNegativeNumber(
    runtime.duration.maximumSeconds,
    "maximumSeconds",
  );

  if (
    runtime.duration.minimumSeconds != null &&
    runtime.duration.maximumSeconds != null &&
    runtime.duration.minimumSeconds > runtime.duration.maximumSeconds
  ) {
    throw new Error("Runtime minimum duration cannot exceed maximum duration");
  }

  if (
    typeof runtime.duration.minimumReached !== "boolean" ||
    typeof runtime.duration.maximumReached !== "boolean"
  ) {
    throw new Error("Runtime duration flags must be boolean");
  }

  validateReturnRequest(runtime.returnRequest);

  return true;
}

export function serializeFormTransitionRuntime(runtime) {
  validateFormTransitionRuntime(runtime);
  return cloneValue(runtime);
}

function normalizeMaintenance(value = []) {
  if (!Array.isArray(value)) {
    throw new Error("Runtime maintenance must be array");
  }

  const ids = new Set();

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new Error("Runtime maintenance entry must be object");
    }

    const costId = requiredText(
      item.costId ?? `maintenance-${index + 1}`,
      "maintenance costId",
    );

    if (ids.has(costId)) {
      throw new Error("Runtime maintenance costIds must be unique");
    }
    ids.add(costId);

    const entry = {
      costId,
      resource: item.resource ?? "",
      resourceKey: item.resourceKey ?? null,
      amount: nullableNonNegativeNumber(
        item.amount,
        "maintenance amount",
      ),
      intervalSeconds: nullablePositiveNumber(
        item.intervalSeconds,
        "maintenance intervalSeconds",
      ),
      chargedIntervals: nonNegativeInteger(
        item.chargedIntervals,
        0,
        "chargedIntervals",
      ),
      lastChargedAt: item.lastChargedAt == null
        ? null
        : timestamp(item.lastChargedAt, "lastChargedAt"),
      nextDueAt: item.nextDueAt == null
        ? null
        : timestamp(item.nextDueAt, "nextDueAt"),
      notes: item.notes ?? "",
    };

    validateMaintenanceEntry(entry);

    return entry;
  });
}

function validateMaintenance(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("Runtime maintenance must be array");
  }

  const ids = new Set();

  for (const entry of entries) {
    validateMaintenanceEntry(entry);

    if (ids.has(entry.costId)) {
      throw new Error("Runtime maintenance costIds must be unique");
    }
    ids.add(entry.costId);
  }
}

function validateMaintenanceEntry(entry) {
  if (!isPlainObject(entry)) {
    throw new Error("Runtime maintenance entry must be object");
  }

  requiredText(entry.costId, "maintenance costId");

  if (typeof entry.resource !== "string") {
    throw new Error("Runtime maintenance resource must be string");
  }

  if (entry.resourceKey != null && typeof entry.resourceKey !== "string") {
    throw new Error("Runtime maintenance resourceKey must be string or null");
  }

  nullableNonNegativeNumber(entry.amount, "maintenance amount");
  nullablePositiveNumber(
    entry.intervalSeconds,
    "maintenance intervalSeconds",
  );
  nonNegativeInteger(
    entry.chargedIntervals,
    null,
    "chargedIntervals",
  );

  if (entry.lastChargedAt != null) {
    timestamp(entry.lastChargedAt, "lastChargedAt");
  }
  if (entry.nextDueAt != null) {
    timestamp(entry.nextDueAt, "nextDueAt");
  }

  if (typeof entry.notes !== "string") {
    throw new Error("Runtime maintenance notes must be string");
  }
}

function normalizeReturnRequest(value) {
  if (value == null) return null;

  if (!isPlainObject(value)) {
    throw new Error("Runtime returnRequest must be object or null");
  }

  const request = {
    requestedAt: timestamp(value.requestedAt, "return requestedAt"),
    intent: value.intent ?? "automatic",
    reasons: stringArray(value.reasons, "return reasons"),
    triggerIds: stringArray(value.triggerIds, "return triggerIds"),
    targetFormId: value.targetFormId ?? null,
  };

  validateReturnRequest(request);

  return request;
}

function validateReturnRequest(value) {
  if (value == null) return;

  if (!isPlainObject(value)) {
    throw new Error("Runtime returnRequest must be object or null");
  }

  timestamp(value.requestedAt, "return requestedAt");

  if (!["automatic", "involuntary"].includes(value.intent)) {
    throw new Error("Runtime return intent is invalid");
  }

  stringArray(value.reasons, "return reasons");
  stringArray(value.triggerIds, "return triggerIds");

  if (value.targetFormId != null && typeof value.targetFormId !== "string") {
    throw new Error("Runtime return targetFormId must be string or null");
  }
}

function requiredText(value, name) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`Runtime ${name} must be non-empty string`);
  }
  return value;
}

function timestamp(value, name) {
  if (value instanceof Date) return value.toISOString();

  if (
    typeof value !== "string" ||
    value === "" ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error(`Runtime ${name} must be timestamp`);
  }

  return value;
}

function nonNegativeNumber(value, fallback, name) {
  if (value == null) return fallback;

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`Runtime ${name} must be non-negative number`);
  }
  return number;
}

function nullableNonNegativeNumber(value, name) {
  return value == null ? null : nonNegativeNumber(value, null, name);
}

function nullablePositiveNumber(value, name) {
  if (value == null) return null;

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Runtime ${name} must be positive number`);
  }
  return number;
}

function nonNegativeInteger(value, fallback, name) {
  if (value == null) return fallback;

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`Runtime ${name} must be non-negative integer`);
  }
  return number;
}

function stringArray(value = [], name) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(`Runtime ${name} must be string array`);
  }
  return [...value];
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
