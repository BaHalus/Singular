const EVENT_TYPES = [
  "form-acquired",
  "form-observed",
  "form-memorized",
  "form-forgotten",
  "form-restored",
  "form-availability-changed",
  "form-replaced",
];

export function createMorphCatalogHistory(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Morfose catalog history must be array");
  }

  const history = input.map(createMorphCatalogHistoryEntry);
  validateMorphCatalogHistory(history);
  return history;
}

export function createMorphCatalogHistoryEntry(input = {}) {
  const entry = {
    id: requiredString(
      input.id ?? generateHistoryId(),
      "Morfose catalog history id must be non-empty string",
    ),
    type: input.type ?? "form-acquired",
    occurredAt: timestamp(input.occurredAt),
    characterId: requiredString(
      input.characterId,
      "Morfose catalog history characterId must be non-empty string",
    ),
    formSetId: requiredString(
      input.formSetId,
      "Morfose catalog history formSetId must be non-empty string",
    ),
    knownFormId: nullableString(input.knownFormId),
    relatedKnownFormId: nullableString(input.relatedKnownFormId),
    templateId: nullableString(input.templateId),
    acquisitionMethod: nullableString(input.acquisitionMethod),
    previousState: nullableString(input.previousState),
    nextState: nullableString(input.nextState),
    data: plainObject(input.data, "Morfose catalog history data must be object", {}),
  };

  validateMorphCatalogHistoryEntry(entry);
  return entry;
}

export function validateMorphCatalogHistory(history) {
  if (!Array.isArray(history)) {
    throw new Error("Morfose catalog history must be array");
  }

  const ids = new Set();
  for (const entry of history) {
    validateMorphCatalogHistoryEntry(entry);
    if (ids.has(entry.id)) {
      throw new Error("Morfose catalog history ids must be unique");
    }
    ids.add(entry.id);
  }

  return true;
}

export function validateMorphCatalogHistoryEntry(entry) {
  if (!plain(entry)) throw new Error("Morfose catalog history entry must be object");
  requiredString(entry.id, "Morfose catalog history id must be non-empty string");
  if (!EVENT_TYPES.includes(entry.type)) {
    throw new Error("Morfose catalog history type is invalid");
  }
  timestamp(entry.occurredAt);
  requiredString(
    entry.characterId,
    "Morfose catalog history characterId must be non-empty string",
  );
  requiredString(
    entry.formSetId,
    "Morfose catalog history formSetId must be non-empty string",
  );

  for (const value of [
    entry.knownFormId,
    entry.relatedKnownFormId,
    entry.templateId,
    entry.acquisitionMethod,
    entry.previousState,
    entry.nextState,
  ]) {
    if (value !== null && (typeof value !== "string" || value === "")) {
      throw new Error("Morfose catalog history reference must be non-empty string or null");
    }
  }

  if (!plain(entry.data)) {
    throw new Error("Morfose catalog history data must be object");
  }

  if (
    [
      "form-acquired",
      "form-observed",
      "form-memorized",
      "form-forgotten",
      "form-restored",
      "form-availability-changed",
      "form-replaced",
    ].includes(entry.type) &&
    entry.knownFormId === null
  ) {
    throw new Error(`Morfose catalog history ${entry.type} requires knownFormId`);
  }

  if (entry.type === "form-replaced" && entry.relatedKnownFormId === null) {
    throw new Error("Morfose catalog history form-replaced requires relatedKnownFormId");
  }

  return true;
}

export function appendMorphCatalogHistory(history, input) {
  validateMorphCatalogHistory(history);
  const entry = createMorphCatalogHistoryEntry(input);
  const existing = history.find(candidate => candidate.id === entry.id);

  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(entry)) return history;
    throw new Error("Morfose catalog history id already exists with different data");
  }

  return [...history, entry];
}

export function serializeMorphCatalogHistory(history) {
  validateMorphCatalogHistory(history);
  return history.map(clone);
}

export function getMorphCatalogHistoryEventTypes() {
  return [...EVENT_TYPES];
}

function requiredString(value, errorMessage) {
  if (typeof value !== "string" || value === "") throw new Error(errorMessage);
  return value;
}

function nullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value === "") {
    throw new Error("Morfose catalog history reference must be non-empty string or null");
  }
  return value;
}

function timestamp(value) {
  const normalized = value ?? new Date().toISOString();
  if (
    typeof normalized !== "string" ||
    normalized === "" ||
    Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error("Morfose catalog history occurredAt must be valid timestamp");
  }
  return normalized;
}

function plainObject(value, errorMessage, fallback) {
  if (value === undefined || value === null) return fallback;
  if (!plain(value)) throw new Error(errorMessage);
  return clone(value);
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  }
  return value;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateHistoryId() {
  return `morph_history_${Math.random().toString(36).slice(2, 10)}`;
}
