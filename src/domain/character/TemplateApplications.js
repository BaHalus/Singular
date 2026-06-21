const APPLICATION_STATUSES = ["active", "removed"];
const APPLICATION_EVENT_TYPES = ["applied", "removed", "updated"];
const COMPONENT_KEYS = [
  "advantages",
  "perks",
  "disadvantages",
  "quirks",
  "skills",
  "techniques",
  "spells",
  "languages",
  "familiarities",
  "equipment",
];

export function createTemplateApplications(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Template applications must be an array");
  }

  const applications = input.map(createTemplateApplication);
  validateTemplateApplications(applications);
  return applications;
}

export function createTemplateApplication(input = {}) {
  const templateId = input.templateId ?? "";
  const rootTemplateId = input.rootTemplateId ?? templateId;

  return {
    id: input.id ?? generateTemplateApplicationId(),
    templateId,
    rootTemplateId,
    templateName: input.templateName ?? "",
    templateType: input.templateType ?? "unknown",
    importedPoints: normalizeNullableNumber(input.importedPoints),

    resolvedTemplateIds: normalizeResolvedTemplateIds(
      input.resolvedTemplateIds,
      rootTemplateId,
    ),
    compositionFingerprint: normalizeNullableString(
      input.compositionFingerprint,
      "Template application compositionFingerprint must be string or null",
    ),
    choices: normalizePlainObject(
      input.choices,
      "Template application choices must be object",
    ),
    replacesApplicationId: normalizeNullableString(
      input.replacesApplicationId,
      "Template application replacesApplicationId must be string or null",
    ),
    replacedByApplicationId: normalizeNullableString(
      input.replacedByApplicationId,
      "Template application replacedByApplicationId must be string or null",
    ),

    status: input.status ?? "active",
    appliedAt: input.appliedAt ?? new Date().toISOString(),
    removedAt: input.removedAt ?? null,

    componentIds: normalizeComponentIds(input.componentIds),
    history: normalizeApplicationHistory(input.history),
    notes: input.notes ?? "",
  };
}

export function createTemplateApplicationEvent(input = {}) {
  return {
    id: input.id ?? generateTemplateApplicationEventId(),
    type: input.type ?? "applied",
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    operationId: normalizeNullableString(
      input.operationId,
      "Template application event operationId must be string or null",
    ),
    planFingerprint: normalizeNullableString(
      input.planFingerprint,
      "Template application event planFingerprint must be string or null",
    ),
    receipt: normalizePlainObject(
      input.receipt,
      "Template application event receipt must be object",
    ),
    notes: input.notes ?? "",
  };
}

export function validateTemplateApplications(applications) {
  if (!Array.isArray(applications)) {
    throw new Error("Template applications must be an array");
  }

  const ids = new Set();
  for (const application of applications) {
    validateTemplateApplication(application);
    if (ids.has(application.id)) {
      throw new Error("Template application ids must be unique");
    }
    ids.add(application.id);
  }
  return true;
}

export function validateTemplateApplication(application) {
  if (!isPlainObject(application)) {
    throw new Error("Template application must be an object");
  }

  requiredString(application.id, "Template application must have id");
  requiredString(
    application.templateId,
    "Template application templateId must be non-empty string",
  );
  requiredString(
    application.rootTemplateId,
    "Template application rootTemplateId must be non-empty string",
  );

  if (typeof application.templateName !== "string") {
    throw new Error("Template application templateName must be string");
  }
  if (typeof application.templateType !== "string") {
    throw new Error("Template application templateType must be string");
  }
  if (
    application.importedPoints !== null &&
    (!Number.isFinite(application.importedPoints))
  ) {
    throw new Error("Template application importedPoints must be finite number or null");
  }

  validateUniqueStringArray(
    application.resolvedTemplateIds,
    "Template application resolvedTemplateIds must be unique string array",
  );
  if (!application.resolvedTemplateIds.includes(application.rootTemplateId)) {
    throw new Error("Template application resolvedTemplateIds must include rootTemplateId");
  }

  validateNullableString(
    application.compositionFingerprint,
    "Template application compositionFingerprint must be string or null",
  );
  if (!isPlainObject(application.choices)) {
    throw new Error("Template application choices must be object");
  }
  validateNullableString(
    application.replacesApplicationId,
    "Template application replacesApplicationId must be string or null",
  );
  validateNullableString(
    application.replacedByApplicationId,
    "Template application replacedByApplicationId must be string or null",
  );
  if (application.replacesApplicationId === application.id) {
    throw new Error("Template application cannot replace itself");
  }
  if (application.replacedByApplicationId === application.id) {
    throw new Error("Template application cannot be replaced by itself");
  }

  if (!APPLICATION_STATUSES.includes(application.status)) {
    throw new Error("Template application status is invalid");
  }
  requiredString(
    application.appliedAt,
    "Template application appliedAt must be non-empty string",
  );
  if (application.removedAt !== null && typeof application.removedAt !== "string") {
    throw new Error("Template application removedAt must be string or null");
  }
  if (application.status === "active" && application.removedAt !== null) {
    throw new Error("Active template application cannot have removedAt");
  }
  if (application.status === "removed" && application.removedAt === null) {
    throw new Error("Removed template application must have removedAt");
  }

  validateComponentIds(application.componentIds);
  validateTemplateApplicationHistory(application.history);
  if (typeof application.notes !== "string") {
    throw new Error("Template application notes must be string");
  }
  return true;
}

export function validateTemplateApplicationHistory(history) {
  if (!Array.isArray(history)) {
    throw new Error("Template application history must be array");
  }

  const ids = new Set();
  for (const event of history) {
    validateTemplateApplicationEvent(event);
    if (ids.has(event.id)) {
      throw new Error("Template application history event ids must be unique");
    }
    ids.add(event.id);
  }
  return true;
}

export function validateTemplateApplicationEvent(event) {
  if (!isPlainObject(event)) {
    throw new Error("Template application event must be object");
  }
  requiredString(event.id, "Template application event id must be non-empty string");
  if (!APPLICATION_EVENT_TYPES.includes(event.type)) {
    throw new Error("Template application event type is invalid");
  }
  requiredString(
    event.occurredAt,
    "Template application event occurredAt must be non-empty string",
  );
  validateNullableString(
    event.operationId,
    "Template application event operationId must be string or null",
  );
  validateNullableString(
    event.planFingerprint,
    "Template application event planFingerprint must be string or null",
  );
  if (!isPlainObject(event.receipt)) {
    throw new Error("Template application event receipt must be object");
  }
  if (typeof event.notes !== "string") {
    throw new Error("Template application event notes must be string");
  }
  return true;
}

export function serializeTemplateApplications(applications) {
  validateTemplateApplications(applications);
  return applications.map(application => ({
    id: application.id,
    templateId: application.templateId,
    rootTemplateId: application.rootTemplateId,
    templateName: application.templateName,
    templateType: application.templateType,
    importedPoints: application.importedPoints,

    resolvedTemplateIds: [...application.resolvedTemplateIds],
    compositionFingerprint: application.compositionFingerprint,
    choices: cloneValue(application.choices),
    replacesApplicationId: application.replacesApplicationId,
    replacedByApplicationId: application.replacedByApplicationId,

    status: application.status,
    appliedAt: application.appliedAt,
    removedAt: application.removedAt,

    componentIds: Object.fromEntries(
      COMPONENT_KEYS.map(key => [key, [...application.componentIds[key]]]),
    ),
    history: application.history.map(serializeTemplateApplicationEvent),
    notes: application.notes,
  }));
}

export function serializeTemplateApplicationEvent(event) {
  validateTemplateApplicationEvent(event);
  return {
    id: event.id,
    type: event.type,
    occurredAt: event.occurredAt,
    operationId: event.operationId,
    planFingerprint: event.planFingerprint,
    receipt: cloneValue(event.receipt),
    notes: event.notes,
  };
}

export function getTemplateApplicationComponentKeys() {
  return [...COMPONENT_KEYS];
}

function normalizeComponentIds(input) {
  const source = input ?? {};
  if (!isPlainObject(source)) {
    throw new Error("Template application componentIds must be object");
  }
  return Object.fromEntries(
    COMPONENT_KEYS.map(key => [
      key,
      normalizeStringArray(
        source[key],
        `Template application componentIds.${key} must be array`,
      ),
    ]),
  );
}

function validateComponentIds(componentIds) {
  if (!isPlainObject(componentIds)) {
    throw new Error("Template application componentIds must be object");
  }
  for (const key of COMPONENT_KEYS) {
    validateUniqueStringArray(
      componentIds[key],
      `Template application componentIds.${key} must be unique string array`,
    );
  }
}

function normalizeResolvedTemplateIds(value, rootTemplateId) {
  if (value === undefined || value === null) {
    return rootTemplateId === "" ? [] : [rootTemplateId];
  }
  return normalizeStringArray(
    value,
    "Template application resolvedTemplateIds must be array",
  );
}

function normalizeApplicationHistory(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Template application history must be array");
  }
  return value.map(createTemplateApplicationEvent);
}

function normalizeStringArray(value, errorMessage) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || item === "")) {
    throw new Error(errorMessage);
  }
  return [...value];
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

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error("Template application importedPoints must be finite number or null");
  }
  return parsed;
}

function normalizeNullableString(value, message) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(message);
  return value;
}

function validateNullableString(value, message) {
  if (value !== null && (typeof value !== "string" || value === "")) {
    throw new Error(message);
  }
}

function normalizePlainObject(value, message) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) throw new Error(message);
  return cloneValue(value);
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateTemplateApplicationId() {
  return `template_application_${Math.random().toString(36).slice(2, 10)}`;
}

function generateTemplateApplicationEventId() {
  return `template_application_event_${Math.random().toString(36).slice(2, 10)}`;
}
