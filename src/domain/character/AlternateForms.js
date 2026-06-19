import {
  createAlternateFormStatePolicy,
  validateAlternateFormStatePolicy,
  serializeAlternateFormStatePolicy,
  createAlternateFormRuntimeState,
  validateAlternateFormRuntimeState,
  serializeAlternateFormRuntimeState,
} from "./AlternateFormState.js";

const FORM_MECHANISMS = ["alternateForm", "morph"];

export function createAlternateFormSets(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Alternate form sets must be an array");
  }

  const sets = input.map(createAlternateFormSet);

  validateAlternateFormSets(sets);

  return sets;
}

export function createAlternateFormSet(input = {}) {
  const forms = normalizeForms(input.forms);
  const baseFormId = input.baseFormId ?? forms[0]?.id ?? null;
  const activeFormId = input.activeFormId ?? baseFormId;

  return {
    id: input.id ?? generateFormSetId(),
    name: input.name ?? "",
    mechanism: input.mechanism ?? "alternateForm",
    sourceTraitId: input.sourceTraitId ?? null,

    baseFormId,
    activeFormId,
    activeActivationId: input.activeActivationId ?? null,
    activeSince: input.activeSince ?? null,

    statePolicy: createAlternateFormStatePolicy(input.statePolicy),
    statePolicyResolution: normalizePlainObject(
      input.statePolicyResolution,
      "Alternate form statePolicyResolution must be object or null",
      null,
    ),
    forms,

    notes: input.notes ?? "",
    tags: normalizeStringArray(input.tags, "Alternate form set tags must be array"),
    importMeta: normalizePlainObject(
      input.importMeta,
      "Alternate form set importMeta must be object or null",
      null,
    ),
    raw: input.raw ?? null,
  };
}

export function createAlternateForm(input = {}) {
  return {
    id: input.id ?? generateFormId(),
    name: input.name ?? "",
    templateId: input.templateId ?? null,
    sourceTraitId: input.sourceTraitId ?? null,
    notes: input.notes ?? "",
    tags: normalizeStringArray(input.tags, "Alternate form tags must be array"),
    state: normalizePlainObject(
      input.state,
      "Alternate form state must be object",
      {},
    ),
    runtimeState: createAlternateFormRuntimeState(input.runtimeState),
    importMeta: normalizePlainObject(
      input.importMeta,
      "Alternate form importMeta must be object or null",
      null,
    ),
    raw: input.raw ?? null,
  };
}

export function validateAlternateFormSets(sets) {
  if (!Array.isArray(sets)) {
    throw new Error("Alternate form sets must be an array");
  }

  const ids = new Set();

  for (const set of sets) {
    validateAlternateFormSet(set);

    if (ids.has(set.id)) {
      throw new Error("Alternate form set ids must be unique");
    }

    ids.add(set.id);
  }

  return true;
}

export function validateAlternateFormSet(set) {
  if (!set || typeof set !== "object" || Array.isArray(set)) {
    throw new Error("Alternate form set must be an object");
  }

  if (!set.id) {
    throw new Error("Alternate form set must have id");
  }

  if (typeof set.name !== "string") {
    throw new Error("Alternate form set name must be string");
  }

  if (!FORM_MECHANISMS.includes(set.mechanism)) {
    throw new Error("Alternate form set mechanism is invalid");
  }

  validateNullableString(
    set.sourceTraitId,
    "Alternate form set sourceTraitId must be string or null",
  );

  validateAlternateFormStatePolicy(set.statePolicy);

  if (
    set.statePolicyResolution !== null &&
    !isPlainObject(set.statePolicyResolution)
  ) {
    throw new Error("Alternate form statePolicyResolution must be object or null");
  }

  if (!Array.isArray(set.forms) || set.forms.length === 0) {
    throw new Error("Alternate form set must have at least one form");
  }

  const formIds = new Set();

  for (const form of set.forms) {
    validateAlternateForm(form);

    if (formIds.has(form.id)) {
      throw new Error("Alternate form ids must be unique inside a set");
    }

    formIds.add(form.id);
  }

  if (typeof set.baseFormId !== "string" || !formIds.has(set.baseFormId)) {
    throw new Error("Alternate form set baseFormId must reference a form");
  }

  if (typeof set.activeFormId !== "string" || !formIds.has(set.activeFormId)) {
    throw new Error("Alternate form set activeFormId must reference a form");
  }

  validateNullableString(
    set.activeActivationId,
    "Alternate form set activeActivationId must be string or null",
  );
  validateNullableString(
    set.activeSince,
    "Alternate form set activeSince must be string or null",
  );

  if (typeof set.notes !== "string") {
    throw new Error("Alternate form set notes must be string");
  }

  validateStringArray(set.tags, "Alternate form set tags must be string array");

  if (set.importMeta !== null && !isPlainObject(set.importMeta)) {
    throw new Error("Alternate form set importMeta must be object or null");
  }

  return true;
}

export function validateAlternateForm(form) {
  if (!form || typeof form !== "object" || Array.isArray(form)) {
    throw new Error("Alternate form must be an object");
  }

  if (!form.id) {
    throw new Error("Alternate form must have id");
  }

  if (typeof form.name !== "string") {
    throw new Error("Alternate form name must be string");
  }

  validateNullableString(
    form.templateId,
    "Alternate form templateId must be string or null",
  );
  validateNullableString(
    form.sourceTraitId,
    "Alternate form sourceTraitId must be string or null",
  );

  if (typeof form.notes !== "string") {
    throw new Error("Alternate form notes must be string");
  }

  validateStringArray(form.tags, "Alternate form tags must be string array");

  if (!isPlainObject(form.state)) {
    throw new Error("Alternate form state must be object");
  }

  validateAlternateFormRuntimeState(form.runtimeState);

  if (form.importMeta !== null && !isPlainObject(form.importMeta)) {
    throw new Error("Alternate form importMeta must be object or null");
  }

  return true;
}

export function serializeAlternateFormSets(sets) {
  validateAlternateFormSets(sets);

  return sets.map(set => ({
    id: set.id,
    name: set.name,
    mechanism: set.mechanism,
    sourceTraitId: set.sourceTraitId,

    baseFormId: set.baseFormId,
    activeFormId: set.activeFormId,
    activeActivationId: set.activeActivationId,
    activeSince: set.activeSince,

    statePolicy: serializeAlternateFormStatePolicy(set.statePolicy),
    statePolicyResolution: cloneValue(set.statePolicyResolution),
    forms: set.forms.map(form => ({
      id: form.id,
      name: form.name,
      templateId: form.templateId,
      sourceTraitId: form.sourceTraitId,
      notes: form.notes,
      tags: [...form.tags],
      state: { ...form.state },
      runtimeState: serializeAlternateFormRuntimeState(form.runtimeState),
      importMeta: form.importMeta,
      raw: form.raw,
    })),

    notes: set.notes,
    tags: [...set.tags],
    importMeta: set.importMeta,
    raw: set.raw,
  }));
}

function normalizeForms(value) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error("Alternate form set forms must be array");
  }

  return value.map(createAlternateForm);
}

function normalizeStringArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function validateStringArray(value, errorMessage) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(errorMessage);
  }
}

function normalizePlainObject(value, errorMessage, fallback) {
  if (value === undefined || value === null) return fallback;

  if (!isPlainObject(value)) {
    throw new Error(errorMessage);
  }

  return cloneValue(value);
}

function validateNullableString(value, errorMessage) {
  if (value !== null && typeof value !== "string") {
    throw new Error(errorMessage);
  }
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

function generateFormSetId() {
  return `form_set_${Math.random().toString(36).slice(2, 10)}`;
}

function generateFormId() {
  return `form_${Math.random().toString(36).slice(2, 10)}`;
}
