import { createCharacter } from "./Character.js";
import {
  createMorphMaterialization,
  createMorphTemplateFingerprint,
} from "./MorphMaterialization.js";

const HARD_SELECTION_REASONS = new Set([
  "morph-known-form-not-found",
  "morph-known-form-unavailable",
  "morph-known-form-forgotten",
  "morph-known-form-template-missing",
  "morph-materialization-stale",
  "morph-materialization-invalid",
]);

export class MorphKnownFormMaterializationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MorphKnownFormMaterializationError";
    this.code = code;
    this.details = details;
  }
}

export function analyzeMorphKnownFormMaterialization(
  character,
  formSetId,
  knownFormId,
) {
  validateCharacterShape(character);
  const set = requireMorphSet(character, formSetId);
  const knownForm = set.morphProfile.knownForms.find(item => item.id === knownFormId) ?? null;

  if (knownForm === null) {
    return createAnalysis({
      set,
      knownForm: null,
      template: null,
      materializedForm: null,
      reasons: ["morph-known-form-not-found"],
    });
  }

  const template = knownForm.templateId === null
    ? null
    : character.templates.find(item => item.id === knownForm.templateId) ?? null;
  const materializedForm = set.forms.find(form => (
    form.morphKnownFormId === knownForm.id
  )) ?? null;
  const reasons = [];

  if (knownForm.state === "unavailable") {
    reasons.push("morph-known-form-unavailable");
  }
  if (knownForm.state === "forgotten") {
    reasons.push("morph-known-form-forgotten");
  }
  if (knownForm.templateId === null) {
    reasons.push("morph-known-form-template-unresolved");
  } else if (template === null) {
    reasons.push("morph-known-form-template-missing");
  }

  if (materializedForm !== null) {
    if (
      materializedForm.templateId !== knownForm.templateId ||
      materializedForm.morphMaterialization === null ||
      materializedForm.morphMaterialization.knownFormId !== knownForm.id ||
      materializedForm.morphMaterialization.templateId !== knownForm.templateId
    ) {
      reasons.push("morph-materialization-invalid");
    } else if (
      template !== null &&
      materializedForm.morphMaterialization.templateFingerprint !==
        createMorphTemplateFingerprint(template)
    ) {
      reasons.push("morph-materialization-stale");
    }
  }

  return createAnalysis({
    set,
    knownForm,
    template,
    materializedForm,
    reasons,
  });
}

export function materializeMorphKnownForm(
  character,
  formSetId,
  knownFormId,
  options = {},
) {
  const analysis = analyzeMorphKnownFormMaterialization(
    character,
    formSetId,
    knownFormId,
  );

  if (analysis.knownForm === null) {
    throw new MorphKnownFormMaterializationError(
      "KNOWN_FORM_NOT_FOUND",
      "Morfose known form not found",
      analysis,
    );
  }
  if (analysis.status === "pending") {
    throw new MorphKnownFormMaterializationError(
      "KNOWN_FORM_PENDING",
      "Morfose known form cannot be materialized yet",
      analysis,
    );
  }
  if (analysis.status === "blocked") {
    const staleOnly = analysis.reasons.every(reason => (
      ["morph-materialization-stale", "morph-materialization-invalid"].includes(reason)
    ));
    if (!(staleOnly && options.refresh === true)) {
      throw new MorphKnownFormMaterializationError(
        "KNOWN_FORM_BLOCKED",
        "Morfose known form materialization is blocked",
        analysis,
      );
    }
  }

  const set = requireMorphSet(character, formSetId);
  const { knownForm, template, materializedForm: existing } = analysis;
  const materializedAt = normalizeTimestamp(options.now);

  if (template === null) {
    throw new MorphKnownFormMaterializationError(
      "TEMPLATE_NOT_AVAILABLE",
      "Morfose known form template is not available",
      analysis,
    );
  }

  if (existing !== null && analysis.reasons.length === 0) {
    return {
      character,
      formId: existing.id,
      form: existing,
      knownForm,
      template,
      status: "already-materialized",
      changed: false,
      analysis,
    };
  }

  if (existing !== null && set.activeFormId === existing.id) {
    throw new MorphKnownFormMaterializationError(
      "ACTIVE_MATERIALIZATION_CANNOT_REFRESH",
      "Active Morfose materialization cannot be refreshed",
      analysis,
    );
  }

  const form = existing === null
    ? createMaterializedForm(set, knownForm, template, materializedAt, options)
    : refreshMaterializedForm(existing, knownForm, template, materializedAt);
  const nextSet = {
    ...set,
    forms: existing === null
      ? [...set.forms, form]
      : set.forms.map(candidate => candidate.id === existing.id ? form : candidate),
  };
  const nextCharacter = createCharacter({
    ...character,
    alternateFormSets: character.alternateFormSets.map(candidate => (
      candidate.id === set.id ? nextSet : candidate
    )),
    metadata: {
      ...character.metadata,
      updatedAt: materializedAt,
    },
  });
  const storedSet = nextCharacter.alternateFormSets.find(candidate => candidate.id === set.id);

  return {
    character: nextCharacter,
    formId: form.id,
    form: storedSet.forms.find(candidate => candidate.id === form.id),
    knownForm,
    template,
    status: existing === null ? "materialized" : "refreshed",
    changed: true,
    analysis,
  };
}

export function evaluateMaterializedMorphTarget(character, set, targetForm) {
  if (
    set.mechanism !== "morph" ||
    targetForm.id === set.baseFormId ||
    targetForm.morphKnownFormId === null
  ) {
    return null;
  }

  const knownForm = set.morphProfile.knownForms.find(item => (
    item.id === targetForm.morphKnownFormId
  )) ?? null;
  const reasons = [];
  let template = null;

  if (knownForm === null) {
    reasons.push("morph-known-form-not-found");
  } else {
    if (knownForm.state === "unavailable") {
      reasons.push("morph-known-form-unavailable");
    }
    if (knownForm.state === "forgotten") {
      reasons.push("morph-known-form-forgotten");
    }
    if (knownForm.templateId === null) {
      reasons.push("morph-known-form-template-unresolved");
    } else {
      template = character.templates.find(item => item.id === knownForm.templateId) ?? null;
      if (template === null) reasons.push("morph-known-form-template-missing");
    }

    if (
      targetForm.templateId !== knownForm.templateId ||
      targetForm.morphMaterialization === null ||
      targetForm.morphMaterialization.knownFormId !== knownForm.id ||
      targetForm.morphMaterialization.templateId !== knownForm.templateId
    ) {
      reasons.push("morph-materialization-invalid");
    } else if (
      template !== null &&
      targetForm.morphMaterialization.templateFingerprint !==
        createMorphTemplateFingerprint(template)
    ) {
      reasons.push("morph-materialization-stale");
    }
  }

  const uniqueReasons = unique(reasons);
  return {
    knownFormId: targetForm.morphKnownFormId,
    knownFormState: knownForm?.state ?? null,
    templateId: knownForm?.templateId ?? null,
    templateImportedPoints: template?.importedPoints ?? null,
    materialization: clone(targetForm.morphMaterialization),
    status: determineSelectionStatus(uniqueReasons),
    reasons: uniqueReasons,
    pointLimitEvaluation: createPointLimitEvaluation(set.morphProfile, template),
  };
}

function createAnalysis({ set, knownForm, template, materializedForm, reasons }) {
  const uniqueReasons = unique(reasons);
  return {
    formSetId: set.id,
    knownFormId: knownForm?.id ?? null,
    knownForm,
    templateId: knownForm?.templateId ?? null,
    template,
    materializedFormId: materializedForm?.id ?? null,
    materializedForm,
    status: determineSelectionStatus(uniqueReasons),
    reasons: uniqueReasons,
    pointLimitEvaluation: createPointLimitEvaluation(set.morphProfile, template),
  };
}

function createPointLimitEvaluation(profile, template) {
  return {
    mode: profile.pointLimitMode,
    pointLimit: profile.pointLimit,
    pointLimitSource: profile.pointLimitSource,
    templateImportedPoints: template?.importedPoints ?? null,
    status: "deferred-to-dom-morph-1.5",
    enforced: false,
  };
}

function determineSelectionStatus(reasons) {
  if (reasons.some(reason => HARD_SELECTION_REASONS.has(reason))) {
    return "blocked";
  }
  if (reasons.length > 0) return "pending";
  return "ready";
}

function createMaterializedForm(set, knownForm, template, materializedAt, options) {
  const id = options.formId ?? generateMaterializedFormId(set, knownForm);
  if (set.forms.some(form => form.id === id)) {
    throw new MorphKnownFormMaterializationError(
      "FORM_ID_COLLISION",
      "Morfose materialized form id already exists",
      { formSetId: set.id, knownFormId: knownForm.id, formId: id },
    );
  }
  return {
    id,
    name: knownForm.name || template.name || "Forma conhecida",
    templateId: template.id,
    sourceTraitId: set.sourceTraitId,
    morphKnownFormId: knownForm.id,
    morphMaterialization: createMorphMaterialization({
      knownFormId: knownForm.id,
      templateId: template.id,
      templateFingerprint: createMorphTemplateFingerprint(template),
      materializedAt,
      sourceName: knownForm.name,
      acquisitionMethod: knownForm.acquisitionMethod,
      externalIds: knownForm.externalIds,
    }),
    notes: knownForm.notes,
    tags: unique([...(knownForm.tags ?? []), ...(template.tags ?? [])]),
    state: {},
    runtimeState: null,
    transitionRules: null,
    transitionRulesOverride: null,
    transitionRulesResolution: null,
    importMeta: {
      source: "morph-known-form",
      morphKnownFormId: knownForm.id,
      templateId: template.id,
    },
    raw: null,
  };
}

function refreshMaterializedForm(existing, knownForm, template, materializedAt) {
  return {
    ...existing,
    templateId: template.id,
    morphKnownFormId: knownForm.id,
    morphMaterialization: createMorphMaterialization({
      knownFormId: knownForm.id,
      templateId: template.id,
      templateFingerprint: createMorphTemplateFingerprint(template),
      materializedAt,
      sourceName: knownForm.name,
      acquisitionMethod: knownForm.acquisitionMethod,
      externalIds: knownForm.externalIds,
    }),
  };
}

function requireMorphSet(character, formSetId) {
  const set = character.alternateFormSets.find(item => item.id === formSetId) ?? null;
  if (set === null) throw new Error("Alternate form set not found");
  if (set.mechanism !== "morph") {
    throw new Error("Morfose materialization requires a morph form set");
  }
  return set;
}

function validateCharacterShape(character) {
  if (!plain(character)) throw new Error("Character must be object");
  if (!Array.isArray(character.alternateFormSets)) {
    throw new Error("Character alternateFormSets must be array");
  }
  if (!Array.isArray(character.templates)) {
    throw new Error("Character templates must be array");
  }
}

function generateMaterializedFormId(set, knownForm) {
  return `morph:${set.id}:${knownForm.id}`;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Morfose materialization timestamp must be valid");
  }
  return value;
}

function unique(values) {
  return [...new Set(values)];
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
