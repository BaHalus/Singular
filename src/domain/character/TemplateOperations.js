import { createCharacter } from "./Character.js";
import { createTemplateApplication } from "./TemplateApplications.js";
import {
  cloneTemplateComponents,
  appendTemplateComponents,
  removeTemplateComponents,
} from "./TemplateComponentOperations.js";

export function incorporateTemplate(character, templateId, options = {}) {
  const template = findTemplate(character, templateId);

  if (!template) {
    throw new Error("Template not found");
  }

  if (getActiveTemplateApplications(character).some(item => item.templateId === templateId)) {
    throw new Error("Template is already incorporated");
  }

  const applicationId = options.applicationId ?? generateTemplateApplicationId();

  if ((character.templateApplications ?? []).some(item => item.id === applicationId)) {
    throw new Error("Template application id already exists");
  }

  const appliedAt = normalizeTimestamp(options.now);
  const cloned = cloneTemplateComponents(template, {
    idNamespace: applicationId,
    provenance: {
      templateApplicationId: applicationId,
    },
  });
  const appended = appendTemplateComponents(character, cloned);
  const application = createTemplateApplication({
    id: applicationId,
    templateId: template.id,
    templateName: template.name,
    templateType: template.templateType,
    importedPoints: template.importedPoints,
    status: "active",
    appliedAt,
    removedAt: null,
    componentIds: cloned.componentIds,
    notes: options.notes ?? "",
  });

  return createCharacter({
    ...character,
    ...appended,
    templateApplications: [
      ...(character.templateApplications ?? []),
      application,
    ],
    metadata: touchMetadata(character.metadata, appliedAt),
  });
}

export function removeTemplateApplication(character, applicationId, options = {}) {
  const application = findTemplateApplication(character, applicationId);

  if (!application) {
    throw new Error("Template application not found");
  }

  if (application.status !== "active") {
    throw new Error("Template application is not active");
  }

  const removedAt = normalizeTimestamp(options.now);
  const stripped = removeTemplateComponents(
    character,
    record => record?.importMeta?.templateApplicationId === applicationId,
  );
  const nextApplications = character.templateApplications.map(item => (
    item.id === applicationId
      ? {
        ...item,
        status: "removed",
        removedAt,
      }
      : item
  ));

  return createCharacter({
    ...character,
    ...stripped,
    templateApplications: nextApplications,
    metadata: touchMetadata(character.metadata, removedAt),
  });
}

export function removeTemplatePackage(character, templateId, options = {}) {
  const template = findTemplate(character, templateId);

  if (!template) {
    throw new Error("Template not found");
  }

  if (getActiveTemplateApplications(character).some(item => item.templateId === templateId)) {
    throw new Error("Cannot remove template package while it is incorporated");
  }

  const updatedAt = normalizeTimestamp(options.now);

  return createCharacter({
    ...character,
    templates: character.templates.filter(item => item.id !== templateId),
    metadata: touchMetadata(character.metadata, updatedAt),
  });
}

export function findTemplate(character, templateId) {
  return (character.templates ?? []).find(item => item.id === templateId) ?? null;
}

export function findTemplateApplication(character, applicationId) {
  return (character.templateApplications ?? []).find(
    item => item.id === applicationId,
  ) ?? null;
}

export function getActiveTemplateApplications(character) {
  return (character.templateApplications ?? []).filter(item => item.status === "active");
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "string" || value === "") {
    throw new Error("Template operation timestamp must be string, Date or null");
  }

  return value;
}

function touchMetadata(metadata, updatedAt) {
  return {
    ...metadata,
    updatedAt,
  };
}

function generateTemplateApplicationId() {
  return `template_application_${Math.random().toString(36).slice(2, 10)}`;
}
