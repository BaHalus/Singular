import { createCharacter } from "./Character.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import {
  createMorphImprovisationDraft,
  serializeMorphImprovisationDraft,
  createMorphImprovisationProjection,
  createMorphImprovisationDraftFingerprint,
  createMorphImprovisationPolicyFingerprint,
  createMorphImprovisationPointLimitEvaluation,
  evaluateMorphImprovisationPolicy,
} from "./MorphImprovisation.js";

export function analyzeMorphImprovisation(character, formSetId, input = {}) {
  const set = requireMorphSet(character, formSetId);
  const draft = createMorphImprovisationDraft(input);
  const policy = clone(set.morphProfile.improvisation);
  const evaluation = evaluateMorphImprovisationPolicy(policy, draft.evidence);
  const draftFingerprint = createMorphImprovisationDraftFingerprint(draft);
  const policyFingerprint = createMorphImprovisationPolicyFingerprint(policy);
  const existing = findImprovisedForm(set, draft.id);
  const reasons = [...evaluation.reasons];
  let status = evaluation.status;

  if (existing !== null) {
    const existingProjection = existing.morphImprovisation;
    const unchanged = existingProjection.draftFingerprint === draftFingerprint &&
      existingProjection.policyFingerprint === policyFingerprint;
    if (unchanged && reasons.length === 0) {
      status = "no-op";
    } else if (set.activeFormId === existing.id) {
      reasons.push("morph-active-improvisation-cannot-refresh");
      status = "blocked";
    }
  }

  return {
    characterId: character.identity.id,
    formSetId: set.id,
    draft: serializeMorphImprovisationDraft(draft),
    draftFingerprint,
    policySnapshot: policy,
    policyFingerprint,
    pointLimitEvaluation: createMorphImprovisationPointLimitEvaluation(
      set.morphProfile,
      draft,
    ),
    existingFormId: existing?.id ?? null,
    setFingerprint: createMorphImprovisationSetFingerprint(set),
    status,
    reasons: [...new Set(reasons)],
  };
}

export function planMorphImprovisation(
  character,
  formSetId,
  input = {},
  options = {},
) {
  return {
    id: options.planId ?? generatePlanId(),
    createdAt: normalizeTimestamp(options.now),
    ...analyzeMorphImprovisation(character, formSetId, input),
  };
}

export function executeMorphImprovisationPlan(character, plan, options = {}) {
  validatePlan(plan);
  if (character.identity.id !== plan.characterId) {
    throw new Error("Morfose improvisation plan belongs to another character");
  }

  const set = requireMorphSet(character, plan.formSetId);
  if (createMorphImprovisationSetFingerprint(set) !== plan.setFingerprint) {
    throw new Error("Morfose improvisation plan is stale");
  }

  const refreshed = analyzeMorphImprovisation(character, plan.formSetId, plan.draft);
  if (refreshed.status !== plan.status) {
    throw new Error("Morfose improvisation plan is no longer executable");
  }
  if (["blocked", "pending"].includes(refreshed.status)) {
    throw new Error("Morfose improvisation plan is not executable");
  }

  const existing = findImprovisedForm(set, plan.draft.id);
  if (refreshed.status === "no-op" && existing !== null) {
    return {
      character,
      formId: existing.id,
      form: existing,
      status: "already-materialized",
      changed: false,
      receipt: createReceipt(plan, existing, null),
    };
  }

  const materializedAt = normalizeTimestamp(options.now ?? plan.createdAt);
  const projection = createMorphImprovisationProjection({
    improvisationId: plan.draft.id,
    draft: plan.draft,
    draftFingerprint: plan.draftFingerprint,
    policyFingerprint: plan.policyFingerprint,
    materializedAt,
    pointLimitEvaluation: plan.pointLimitEvaluation,
  });
  const form = existing === null
    ? createImprovisedForm(set, projection, options)
    : refreshImprovisedForm(existing, projection);
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
  const storedForm = storedSet.forms.find(candidate => candidate.id === form.id);

  return {
    character: nextCharacter,
    formId: form.id,
    form: storedForm,
    status: existing === null ? "materialized" : "refreshed",
    changed: true,
    receipt: createReceipt(plan, storedForm, materializedAt),
  };
}

export function materializeMorphImprovisedForm(
  character,
  formSetId,
  input = {},
  options = {},
) {
  const plan = planMorphImprovisation(character, formSetId, input, options);
  return {
    plan,
    ...executeMorphImprovisationPlan(character, plan, options),
  };
}

export function prepareMorphImprovisedTransition(
  character,
  formSetId,
  input = {},
  context = {},
  options = {},
) {
  const materialization = materializeMorphImprovisedForm(
    character,
    formSetId,
    input,
    options,
  );
  const transitionPlan = planFormTransition(
    materialization.character,
    formSetId,
    materialization.formId,
    context,
  );

  return {
    character: materialization.character,
    formSetId,
    improvisationId: materialization.plan.draft.id,
    formId: materialization.formId,
    materialization,
    plan: transitionPlan,
  };
}

export function discardMorphImprovisedForm(
  character,
  formSetId,
  formId,
  options = {},
) {
  const set = requireMorphSet(character, formSetId);
  const form = set.forms.find(candidate => candidate.id === formId) ?? null;
  if (form === null || form.morphImprovisation === null) {
    throw new Error("Morfose improvised form not found");
  }
  if (form.id === set.baseFormId) {
    throw new Error("Morfose base form cannot be discarded as improvisation");
  }
  if (form.id === set.activeFormId) {
    throw new Error("Active Morfose improvisation cannot be discarded");
  }

  const occurredAt = normalizeTimestamp(options.now);
  return createCharacter({
    ...character,
    alternateFormSets: character.alternateFormSets.map(candidate => (
      candidate.id === set.id
        ? { ...candidate, forms: candidate.forms.filter(item => item.id !== form.id) }
        : candidate
    )),
    metadata: {
      ...character.metadata,
      updatedAt: occurredAt,
    },
  });
}

export function createMorphImprovisationSetFingerprint(set) {
  return canonicalStringify({
    activeFormId: set.activeFormId,
    sourceTraitId: set.sourceTraitId,
    improvisation: set.morphProfile.improvisation,
    improvisedForms: set.forms
      .filter(form => form.morphImprovisation !== null)
      .map(form => ({
        id: form.id,
        improvisationId: form.morphImprovisation.improvisationId,
        draftFingerprint: form.morphImprovisation.draftFingerprint,
        policyFingerprint: form.morphImprovisation.policyFingerprint,
      })),
  });
}

function createImprovisedForm(set, projection, options) {
  const id = options.formId ?? generateFormId(projection.improvisationId);
  if (set.forms.some(form => form.id === id)) {
    throw new Error("Morfose improvised form id already exists");
  }
  return {
    id,
    name: projection.draft.name || projection.draft.template.name || "Forma improvisada",
    templateId: null,
    sourceTraitId: set.sourceTraitId,
    morphKnownFormId: null,
    morphMaterialization: null,
    morphImprovisation: projection,
    notes: projection.draft.notes,
    tags: [...new Set([
      "morph-improvised",
      ...projection.draft.tags,
      ...projection.draft.template.tags,
    ])],
    state: {},
    runtimeState: {},
    transitionRules: null,
    transitionRulesOverride: null,
    transitionRulesResolution: null,
    importMeta: {
      source: "morph-improvisation",
      improvisationId: projection.improvisationId,
    },
    raw: null,
  };
}

function refreshImprovisedForm(existing, projection) {
  return {
    ...existing,
    name: projection.draft.name || projection.draft.template.name || existing.name,
    morphImprovisation: projection,
    notes: projection.draft.notes,
    tags: [...new Set([
      "morph-improvised",
      ...projection.draft.tags,
      ...projection.draft.template.tags,
    ])],
  };
}

function createReceipt(plan, form, materializedAt) {
  return {
    type: "morph-improvisation-materialized",
    planId: plan.id,
    characterId: plan.characterId,
    formSetId: plan.formSetId,
    improvisationId: plan.draft.id,
    formId: form.id,
    materializedAt,
    draftFingerprint: plan.draftFingerprint,
    policyFingerprint: plan.policyFingerprint,
    pointLimitEvaluation: clone(plan.pointLimitEvaluation),
  };
}

function findImprovisedForm(set, improvisationId) {
  return set.forms.find(form => (
    form.morphImprovisation?.improvisationId === improvisationId
  )) ?? null;
}

function requireMorphSet(character, formSetId) {
  if (!plain(character)) throw new Error("Character must be object");
  const set = character.alternateFormSets?.find(candidate => candidate.id === formSetId) ?? null;
  if (set === null) throw new Error("Alternate form set not found");
  if (set.mechanism !== "morph") {
    throw new Error("Morfose improvisation requires a morph form set");
  }
  return set;
}

function validatePlan(plan) {
  if (!plain(plan)) throw new Error("Morfose improvisation plan must be object");
  requiredString(plan.id, "Morfose improvisation plan id must be non-empty string");
  requiredString(
    plan.characterId,
    "Morfose improvisation plan characterId must be non-empty string",
  );
  requiredString(
    plan.formSetId,
    "Morfose improvisation plan formSetId must be non-empty string",
  );
  requiredString(
    plan.setFingerprint,
    "Morfose improvisation plan setFingerprint must be non-empty string",
  );
  if (!plain(plan.draft)) throw new Error("Morfose improvisation plan draft must be object");
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Morfose improvisation timestamp must be valid");
  }
  return value;
}

function requiredString(value, message) {
  if (typeof value !== "string" || value === "") throw new Error(message);
  return value;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (plain(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
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

function generatePlanId() {
  return `morph_improvisation_plan_${Math.random().toString(36).slice(2, 10)}`;
}

function generateFormId(improvisationId) {
  const safe = improvisationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `morph_improvised_${safe}`;
}
