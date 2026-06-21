import { createCharacter } from "./Character.js";
import {
  executeTemplateApplicationPlan,
  planTemplateApplicationOperation,
} from "./TemplateApplicationOperations.js";

export function incorporateTemplate(character, templateId, options = {}) {
  const plan = planTemplateApplicationOperation(
    character,
    {
      operation: "apply",
      templateId,
      applicationId: options.applicationId,
      choices: options.choices ?? {},
    },
    {
      now: options.now,
      planId: options.planId,
      operationId: options.operationId,
      eventId: options.eventId,
      applicationId: options.applicationId,
    },
  );

  return executeTemplateApplicationPlan(character, plan, {
    now: options.now,
    notes: options.notes,
  }).character;
}

export function removeTemplateApplication(character, applicationId, options = {}) {
  const plan = planTemplateApplicationOperation(
    character,
    {
      operation: "remove",
      applicationId,
    },
    {
      now: options.now,
      planId: options.planId,
      operationId: options.operationId,
      eventId: options.eventId,
    },
  );

  return executeTemplateApplicationPlan(character, plan, {
    now: options.now,
    notes: options.notes,
  }).character;
}

export function updateTemplateApplication(
  character,
  applicationId,
  replacementTemplate,
  options = {},
) {
  const input = {
    operation: "update",
    applicationId,
    replacementTemplate,
    ...(Object.hasOwn(options, "choices")
      ? { choices: options.choices }
      : {}),
  };
  const plan = planTemplateApplicationOperation(character, input, {
    now: options.now,
    planId: options.planId,
    operationId: options.operationId,
    eventId: options.eventId,
    applicationId: options.newApplicationId,
  });

  return executeTemplateApplicationPlan(character, plan, {
    now: options.now,
    notes: options.notes,
  }).character;
}

export function removeTemplatePackage(character, templateId, options = {}) {
  const template = findTemplate(character, templateId);
  if (!template) throw new Error("Template not found");

  const activeApplications = getActiveTemplateApplications(character);
  if (activeApplications.some(application => (
    application.resolvedTemplateIds.includes(templateId)
  ))) {
    throw new Error("Cannot remove template package while it is incorporated");
  }

  const activeFormDependency = (character.alternateFormSets ?? []).some(set => {
    const active = set.forms?.find(form => form.id === set.activeFormId) ?? null;
    return active?.templateId === templateId;
  });
  if (activeFormDependency) {
    throw new Error("Cannot remove template package while an active form depends on it");
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
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Template operation timestamp must be valid string, Date or null");
  }
  return value;
}

function touchMetadata(metadata, updatedAt) {
  return { ...metadata, updatedAt };
}
