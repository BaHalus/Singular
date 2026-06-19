import { createCharacter } from "./Character.js";
import {
  cloneTemplateComponents,
  appendTemplateComponents,
  removeTemplateComponents,
} from "./TemplateComponentOperations.js";

export function activateAlternateForm(character, formSetId, formId, options = {}) {
  const set = findAlternateFormSet(character, formSetId);

  if (!set) {
    throw new Error("Alternate form set not found");
  }

  const form = findAlternateForm(set, formId);

  if (!form) {
    throw new Error("Alternate form not found");
  }

  if (set.activeFormId === formId) {
    return character;
  }

  const changedAt = normalizeTimestamp(options.now);
  const activationId = form.templateId === null
    ? null
    : options.activationId ?? generateFormActivationId();

  if (
    activationId !== null &&
    character.alternateFormSets.some(candidate => (
      candidate.id !== formSetId &&
      candidate.activeActivationId === activationId
    ))
  ) {
    throw new Error("Alternate form activation id already exists");
  }

  const stripped = removeTemplateComponents(
    character,
    record => record?.importMeta?.alternateFormSetId === formSetId,
  );
  let nextCollections = stripped;

  if (form.templateId !== null) {
    const template = findTemplate(character, form.templateId);

    if (!template) {
      throw new Error("Alternate form template not found");
    }

    const cloned = cloneTemplateComponents(template, {
      idNamespace: activationId,
      provenance: {
        alternateFormSetId: set.id,
        alternateFormId: form.id,
        alternateFormActivationId: activationId,
      },
    });

    nextCollections = appendTemplateComponents(
      {
        ...character,
        ...stripped,
      },
      cloned,
    );
  }

  const nextSets = character.alternateFormSets.map(candidate => (
    candidate.id === formSetId
      ? {
        ...candidate,
        activeFormId: form.id,
        activeActivationId: activationId,
        activeSince: changedAt,
      }
      : candidate
  ));

  return createCharacter({
    ...character,
    ...nextCollections,
    alternateFormSets: nextSets,
    metadata: touchMetadata(character.metadata, changedAt),
  });
}

export function switchAlternateForm(character, formSetId, formId, options = {}) {
  return activateAlternateForm(character, formSetId, formId, options);
}

export function deactivateAlternateForm(character, formSetId, options = {}) {
  const set = findAlternateFormSet(character, formSetId);

  if (!set) {
    throw new Error("Alternate form set not found");
  }

  return activateAlternateForm(
    character,
    formSetId,
    set.baseFormId,
    options,
  );
}

export function findAlternateFormSet(character, formSetId) {
  return (character.alternateFormSets ?? []).find(
    set => set.id === formSetId,
  ) ?? null;
}

export function findAlternateForm(set, formId) {
  return (set.forms ?? []).find(form => form.id === formId) ?? null;
}

export function getActiveAlternateForm(character, formSetId) {
  const set = findAlternateFormSet(character, formSetId);

  if (!set) return null;

  return findAlternateForm(set, set.activeFormId);
}

export function getActiveAlternateForms(character) {
  return (character.alternateFormSets ?? []).map(set => ({
    set,
    form: findAlternateForm(set, set.activeFormId),
  }));
}

function findTemplate(character, templateId) {
  return (character.templates ?? []).find(template => template.id === templateId) ?? null;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "string" || value === "") {
    throw new Error("Alternate form transition timestamp must be string, Date or null");
  }

  return value;
}

function touchMetadata(metadata, updatedAt) {
  return {
    ...metadata,
    updatedAt,
  };
}

function generateFormActivationId() {
  return `form_activation_${Math.random().toString(36).slice(2, 10)}`;
}
