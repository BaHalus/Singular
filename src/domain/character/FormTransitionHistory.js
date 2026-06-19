const EVENT_TYPES = [
  "transition-executed",
  "maintenance-charged",
  "maintenance-unpaid",
  "return-requested",
];

export function createFormTransitionHistory(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Form transition history must be an array");
  }

  const history = input.map(createFormTransitionHistoryEntry);
  validateFormTransitionHistory(history);
  return history;
}

export function createFormTransitionHistoryEntry(input = {}) {
  const entry = {
    id: normalizeRequiredString(
      input.id ?? generateHistoryId(),
      "Form transition history id must be non-empty string",
    ),
    type: input.type ?? "transition-executed",
    occurredAt: normalizeTimestamp(input.occurredAt),
    characterId: normalizeRequiredString(
      input.characterId,
      "Form transition history characterId must be non-empty string",
    ),
    formSetId: normalizeRequiredString(
      input.formSetId,
      "Form transition history formSetId must be non-empty string",
    ),
    formId: normalizeNullableString(input.formId),
    fromFormId: normalizeNullableString(input.fromFormId),
    targetFormId: normalizeNullableString(input.targetFormId),
    activationId: normalizeNullableString(input.activationId),
    runtimeId: normalizeNullableString(input.runtimeId),
    executionId: normalizeNullableString(input.executionId),
    data: normalizeData(input.data),
  };

  validateFormTransitionHistoryEntry(entry);
  return entry;
}

export function validateFormTransitionHistory(history) {
  if (!Array.isArray(history)) {
    throw new Error("Form transition history must be an array");
  }

  const ids = new Set();

  for (const entry of history) {
    validateFormTransitionHistoryEntry(entry);

    if (ids.has(entry.id)) {
      throw new Error("Form transition history ids must be unique");
    }

    ids.add(entry.id);
  }

  return true;
}

export function validateFormTransitionHistoryEntry(entry) {
  if (!isPlainObject(entry)) {
    throw new Error("Form transition history entry must be object");
  }

  normalizeRequiredString(
    entry.id,
    "Form transition history id must be non-empty string",
  );

  if (!EVENT_TYPES.includes(entry.type)) {
    throw new Error("Form transition history type is invalid");
  }

  normalizeTimestamp(entry.occurredAt);
  normalizeRequiredString(
    entry.characterId,
    "Form transition history characterId must be non-empty string",
  );
  normalizeRequiredString(
    entry.formSetId,
    "Form transition history formSetId must be non-empty string",
  );

  for (const [key, value] of Object.entries({
    formId: entry.formId,
    fromFormId: entry.fromFormId,
    targetFormId: entry.targetFormId,
    activationId: entry.activationId,
    runtimeId: entry.runtimeId,
    executionId: entry.executionId,
  })) {
    if (value !== null && (typeof value !== "string" || value === "")) {
      throw new Error(`Form transition history ${key} must be non-empty string or null`);
    }
  }

  if (!isPlainObject(entry.data)) {
    throw new Error("Form transition history data must be object");
  }

  if (entry.type === "transition-executed") {
    requireEntryString(entry.fromFormId, "fromFormId", entry.type);
    requireEntryString(entry.targetFormId, "targetFormId", entry.type);
    requireEntryString(entry.executionId, "executionId", entry.type);
  }

  if (["maintenance-charged", "maintenance-unpaid"].includes(entry.type)) {
    requireEntryString(entry.formId, "formId", entry.type);
    requireEntryString(entry.runtimeId, "runtimeId", entry.type);
  }

  if (entry.type === "return-requested") {
    requireEntryString(entry.formId, "formId", entry.type);
    requireEntryString(entry.runtimeId, "runtimeId", entry.type);
    requireEntryString(entry.targetFormId, "targetFormId", entry.type);
  }

  return true;
}

export function validateFormTransitionHistoryForCharacter(history, characterId) {
  validateFormTransitionHistory(history);

  if (typeof characterId !== "string" || characterId === "") {
    throw new Error("Character id must be non-empty string");
  }

  if (history.some(entry => entry.characterId !== characterId)) {
    throw new Error("Form transition history entry belongs to another character");
  }

  return true;
}

export function appendFormTransitionHistory(history, input) {
  validateFormTransitionHistory(history);
  const entry = createFormTransitionHistoryEntry(input);
  const existing = history.find(candidate => candidate.id === entry.id);

  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(entry)) {
      return history;
    }

    throw new Error("Form transition history id already exists with different data");
  }

  return [...history, entry];
}

export function serializeFormTransitionHistory(history) {
  validateFormTransitionHistory(history);
  return history.map(cloneValue);
}

export function getFormTransitionHistoryEventTypes() {
  return [...EVENT_TYPES];
}

function requireEntryString(value, key, type) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`Form transition history ${type} requires ${key}`);
  }
}

function normalizeRequiredString(value, errorMessage) {
  if (typeof value !== "string" || value === "") {
    throw new Error(errorMessage);
  }
  return value;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value === "") {
    throw new Error("Form transition history reference must be non-empty string or null");
  }
  return value;
}

function normalizeTimestamp(value) {
  const normalized = value ?? new Date().toISOString();

  if (
    typeof normalized !== "string" ||
    normalized === "" ||
    Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error("Form transition history occurredAt must be valid timestamp");
  }

  return normalized;
}

function normalizeData(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    throw new Error("Form transition history data must be object");
  }
  return cloneValue(value);
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

function generateHistoryId() {
  return `form_history_${Math.random().toString(36).slice(2, 10)}`;
}
