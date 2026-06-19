const APPLICATION_STATUSES = ["active", "removed"];
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
  return {
    id: input.id ?? generateTemplateApplicationId(),
    templateId: input.templateId ?? "",
    templateName: input.templateName ?? "",
    templateType: input.templateType ?? "unknown",
    importedPoints: normalizeNullableNumber(input.importedPoints),

    status: input.status ?? "active",
    appliedAt: input.appliedAt ?? new Date().toISOString(),
    removedAt: input.removedAt ?? null,

    componentIds: normalizeComponentIds(input.componentIds),
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
  if (!application || typeof application !== "object" || Array.isArray(application)) {
    throw new Error("Template application must be an object");
  }

  if (!application.id) {
    throw new Error("Template application must have id");
  }

  if (typeof application.templateId !== "string" || application.templateId === "") {
    throw new Error("Template application templateId must be non-empty string");
  }

  if (typeof application.templateName !== "string") {
    throw new Error("Template application templateName must be string");
  }

  if (typeof application.templateType !== "string") {
    throw new Error("Template application templateType must be string");
  }

  if (
    application.importedPoints !== null &&
    (typeof application.importedPoints !== "number" || Number.isNaN(application.importedPoints))
  ) {
    throw new Error("Template application importedPoints must be number or null");
  }

  if (!APPLICATION_STATUSES.includes(application.status)) {
    throw new Error("Template application status is invalid");
  }

  if (typeof application.appliedAt !== "string" || application.appliedAt === "") {
    throw new Error("Template application appliedAt must be non-empty string");
  }

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

  if (typeof application.notes !== "string") {
    throw new Error("Template application notes must be string");
  }

  return true;
}

export function serializeTemplateApplications(applications) {
  validateTemplateApplications(applications);

  return applications.map(application => ({
    id: application.id,
    templateId: application.templateId,
    templateName: application.templateName,
    templateType: application.templateType,
    importedPoints: application.importedPoints,

    status: application.status,
    appliedAt: application.appliedAt,
    removedAt: application.removedAt,

    componentIds: Object.fromEntries(
      COMPONENT_KEYS.map(key => [key, [...application.componentIds[key]]]),
    ),
    notes: application.notes,
  }));
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
    const value = componentIds[key];

    if (!Array.isArray(value) || value.some(item => typeof item !== "string" || item === "")) {
      throw new Error(`Template application componentIds.${key} must be string array`);
    }
  }
}

function normalizeStringArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || item === "")) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateTemplateApplicationId() {
  return `template_application_${Math.random().toString(36).slice(2, 10)}`;
}
