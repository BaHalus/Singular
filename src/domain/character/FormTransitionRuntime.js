const STATUSES = ["active", "maintenance-due", "maintenance-unpaid", "return-pending", "expired"];

export function createFormTransitionRuntime(input = null) {
  if (input == null) return null;
  const runtime = {
    activationId: text(input.activationId, "activationId"),
    formId: text(input.formId, "formId"),
    startedAt: time(input.startedAt, "startedAt"),
    observedAt: time(input.observedAt ?? input.startedAt, "observedAt"),
    elapsedSeconds: number(input.elapsedSeconds, 0, "elapsedSeconds"),
    status: input.status ?? "active",
    maintenance: maintenance(input.maintenance),
    duration: {
      minimumSeconds: nullableNumber(input.duration?.minimumSeconds, "minimumSeconds"),
      maximumSeconds: nullableNumber(input.duration?.maximumSeconds, "maximumSeconds"),
      minimumReached: input.duration?.minimumReached ?? false,
      maximumReached: input.duration?.maximumReached ?? false,
    },
    returnRequest: request(input.returnRequest),
  };
  validateFormTransitionRuntime(runtime);
  return runtime;
}

export function validateFormTransitionRuntime(runtime) {
  if (runtime == null) return true;
  if (!plain(runtime)) throw new Error("Form transition runtime must be object or null");
  text(runtime.activationId, "activationId");
  text(runtime.formId, "formId");
  time(runtime.startedAt, "startedAt");
  time(runtime.observedAt, "observedAt");
  if (Date.parse(runtime.observedAt) < Date.parse(runtime.startedAt)) throw new Error("Runtime clock cannot move before start");
  number(runtime.elapsedSeconds, null, "elapsedSeconds");
  if (!STATUSES.includes(runtime.status)) throw new Error("Form transition runtime status is invalid");
  maintenance(runtime.maintenance);
  if (!plain(runtime.duration)) throw new Error("Form transition runtime duration must be object");
  nullableNumber(runtime.duration.minimumSeconds, "minimumSeconds");
  nullableNumber(runtime.duration.maximumSeconds, "maximumSeconds");
  if (runtime.duration.minimumSeconds != null && runtime.duration.maximumSeconds != null && runtime.duration.minimumSeconds > runtime.duration.maximumSeconds) throw new Error("Runtime minimum duration cannot exceed maximum duration");
  if (typeof runtime.duration.minimumReached !== "boolean" || typeof runtime.duration.maximumReached !== "boolean") throw new Error("Runtime duration flags must be boolean");
  request(runtime.returnRequest);
  return true;
}

export function serializeFormTransitionRuntime(runtime) {
  validateFormTransitionRuntime(runtime);
  return clone(runtime);
}

function maintenance(value = []) {
  if (!Array.isArray(value)) throw new Error("Runtime maintenance must be array");
  const ids = new Set();
  return value.map((item, index) => {
    if (!plain(item)) throw new Error("Runtime maintenance entry must be object");
    const costId = text(item.costId ?? `maintenance-${index + 1}`, "maintenance costId");
    if (ids.has(costId)) throw new Error("Runtime maintenance costIds must be unique");
    ids.add(costId);
    const intervalSeconds = item.intervalSeconds == null ? null : positive(item.intervalSeconds, "maintenance intervalSeconds");
    return {
      costId,
      resource: item.resource ?? "",
      resourceKey: item.resourceKey ?? null,
      amount: nullableNumber(item.amount, "maintenance amount"),
      intervalSeconds,
      chargedIntervals: integer(item.chargedIntervals, 0, "chargedIntervals"),
      lastChargedAt: item.lastChargedAt == null ? null : time(item.lastChargedAt, "lastChargedAt"),
      nextDueAt: item.nextDueAt == null ? null : time(item.nextDueAt, "nextDueAt"),
      notes: item.notes ?? "",
    };
  });
}

function request(value) {
  if (value == null) return null;
  if (!plain(value)) throw new Error("Runtime returnRequest must be object or null");
  const intent = value.intent ?? "automatic";
  if (!["automatic", "involuntary"].includes(intent)) throw new Error("Runtime return intent is invalid");
  return {
    requestedAt: time(value.requestedAt, "return requestedAt"),
    intent,
    reasons: strings(value.reasons, "return reasons"),
    triggerIds: strings(value.triggerIds, "return triggerIds"),
    targetFormId: value.targetFormId ?? null,
  };
}

function text(value, name) { if (typeof value !== "string" || value === "") throw new Error(`Runtime ${name} must be non-empty string`); return value; }
function time(value, name) { if (value instanceof Date) return value.toISOString(); if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error(`Runtime ${name} must be timestamp`); return value; }
function number(value, fallback, name) { if (value == null) return fallback; const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new Error(`Runtime ${name} must be non-negative number`); return n; }
function nullableNumber(value, name) { return value == null ? null : number(value, null, name); }
function positive(value, name) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error(`Runtime ${name} must be positive number`); return n; }
function integer(value, fallback, name) { if (value == null) return fallback; const n = Number(value); if (!Number.isInteger(n) || n < 0) throw new Error(`Runtime ${name} must be non-negative integer`); return n; }
function strings(value = [], name) { if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error(`Runtime ${name} must be string array`); return [...value]; }
function clone(value) { if (Array.isArray(value)) return value.map(clone); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])); return value; }
function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
