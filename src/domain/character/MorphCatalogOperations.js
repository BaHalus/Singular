import { createCharacter } from "./Character.js";
import {
  createMorphKnownForm,
  createMorphProfile,
} from "./MorphProfile.js";

export function registerMorphKnownForm(character, formSetId, input = {}, options = {}) {
  const set = requireMorphSet(character, formSetId);
  const knownForm = createMorphKnownForm({
    ...input,
    acquiredAt: input.acquiredAt ?? normalizeTimestamp(options.now),
  });

  if (
    knownForm.templateId !== null &&
    !character.templates.some(template => template.id === knownForm.templateId)
  ) {
    throw new Error("Morfose known form template not found");
  }

  if (set.morphProfile.knownForms.some(form => form.id === knownForm.id)) {
    throw new Error("Morfose known form id already exists");
  }

  if (
    knownForm.templateId !== null &&
    set.morphProfile.knownForms.some(form => form.templateId === knownForm.templateId)
  ) {
    throw new Error("Morfose template is already registered in catalog");
  }

  return updateMorphProfile(
    character,
    set.id,
    {
      ...set.morphProfile,
      knownForms: [...set.morphProfile.knownForms, knownForm],
    },
    options.now,
  );
}

export function forgetMorphKnownForm(character, formSetId, knownFormId, options = {}) {
  const set = requireMorphSet(character, formSetId);
  const knownForm = findMorphKnownForm(set, knownFormId);

  if (!knownForm) {
    throw new Error("Morfose known form not found");
  }

  if (knownForm.state === "forgotten") {
    return character;
  }

  return updateMorphProfile(
    character,
    set.id,
    {
      ...set.morphProfile,
      knownForms: set.morphProfile.knownForms.map(form => (
        form.id === knownFormId
          ? { ...form, state: "forgotten" }
          : form
      )),
    },
    options.now,
  );
}

export function restoreMorphKnownForm(character, formSetId, knownFormId, options = {}) {
  const set = requireMorphSet(character, formSetId);
  const knownForm = findMorphKnownForm(set, knownFormId);

  if (!knownForm) {
    throw new Error("Morfose known form not found");
  }

  if (knownForm.state === "available") {
    return character;
  }

  return updateMorphProfile(
    character,
    set.id,
    {
      ...set.morphProfile,
      knownForms: set.morphProfile.knownForms.map(form => (
        form.id === knownFormId
          ? { ...form, state: "available" }
          : form
      )),
    },
    options.now,
  );
}

export function setMorphKnownFormAvailability(
  character,
  formSetId,
  knownFormId,
  available,
  options = {},
) {
  if (typeof available !== "boolean") {
    throw new Error("Morfose availability flag must be boolean");
  }

  const set = requireMorphSet(character, formSetId);
  const knownForm = findMorphKnownForm(set, knownFormId);

  if (!knownForm) {
    throw new Error("Morfose known form not found");
  }

  const nextState = available ? "available" : "unavailable";

  if (knownForm.state === nextState) {
    return character;
  }

  return updateMorphProfile(
    character,
    set.id,
    {
      ...set.morphProfile,
      knownForms: set.morphProfile.knownForms.map(form => (
        form.id === knownFormId
          ? { ...form, state: nextState }
          : form
      )),
    },
    options.now,
  );
}

export function setMorphPointLimit(
  character,
  formSetId,
  pointLimit,
  pointLimitSource = "manual",
  options = {},
) {
  const set = requireMorphSet(character, formSetId);
  const pointLimitMode = pointLimit === null || pointLimit === undefined || pointLimit === ""
    ? "undeclared"
    : "limited";
  const profile = createMorphProfile({
    ...set.morphProfile,
    pointLimitMode,
    pointLimit: pointLimitMode === "limited" ? pointLimit : null,
    pointLimitSource: pointLimitMode === "limited"
      ? pointLimitSource
      : "undeclared",
  });

  return updateMorphProfile(character, set.id, profile, options.now);
}

export function findMorphKnownForm(set, knownFormId) {
  return set?.morphProfile?.knownForms.find(form => form.id === knownFormId) ?? null;
}

export function findMorphKnownFormByTemplate(set, templateId) {
  return set?.morphProfile?.knownForms.find(form => form.templateId === templateId) ?? null;
}

export function listAvailableMorphKnownForms(character, formSetId) {
  const set = requireMorphSet(character, formSetId);
  return set.morphProfile.knownForms.filter(form => form.state === "available");
}

function requireMorphSet(character, formSetId) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new Error("Character must be object");
  }

  const set = character.alternateFormSets?.find(candidate => candidate.id === formSetId);

  if (!set) {
    throw new Error("Alternate form set not found");
  }

  if (set.mechanism !== "morph") {
    throw new Error("Morfose operations require a morph form set");
  }

  if (set.morphProfile === null) {
    throw new Error("Morfose form set must have morphProfile");
  }

  return set;
}

function updateMorphProfile(character, formSetId, morphProfile, now) {
  const updatedAt = normalizeTimestamp(now);

  return createCharacter({
    ...character,
    alternateFormSets: character.alternateFormSets.map(set => (
      set.id === formSetId
        ? { ...set, morphProfile }
        : set
    )),
    metadata: {
      ...character.metadata,
      updatedAt,
    },
  });
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Morfose operation timestamp must be valid");
  }

  return value;
}
