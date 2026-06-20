import { createCharacter } from "./Character.js";
import {
  createMorphKnownForm,
  createMorphProfile,
} from "./MorphProfile.js";
import {
  appendMorphCatalogHistory,
  createMorphCatalogHistoryEntry,
} from "./MorphCatalogHistory.js";
import {
  countOccupiedMorphMemorySlots,
  resolveMorphMemorizationPolicy,
} from "./MorphMemorizationPolicy.js";

const OPERATION_TYPES = [
  "acquire-form",
  "observe-form",
  "memorize-form",
  "forget-form",
  "restore-form",
  "set-availability",
  "replace-memorized-form",
];

export function analyzeMorphCatalogOperation(
  character,
  formSetId,
  operationInput = {},
  options = {},
) {
  const set = requireMorphSet(character, formSetId);
  const normalizedInput = normalizeOperationInput(operationInput, options.now);
  const policy = resolveMorphMemorizationPolicy(character, set);
  const capacityEvaluation = evaluateCapacity(set, policy);
  const reasons = [];
  let status = "ready";

  const block = (code, details = {}) => {
    reasons.push({ code, severity: "blocked", ...details });
    status = "blocked";
  };
  const pending = (code, details = {}) => {
    reasons.push({ code, severity: "pending", ...details });
    if (status !== "blocked") status = "pending";
  };
  const noOp = (code, details = {}) => {
    reasons.push({ code, severity: "no-op", ...details });
    if (status === "ready") status = "no-op";
  };

  if (policy.conflicts.length > 0 && isRetentionOperation(normalizedInput.type)) {
    block("morph-memorization-policy-conflict", {
      ruleIds: [...policy.conflicts],
    });
  }

  switch (normalizedInput.type) {
    case "acquire-form":
      validateCandidate(character, set, normalizedInput.knownForm, block);
      break;

    case "observe-form":
      if (normalizedInput.originalPresent !== true) {
        block("morph-original-not-present");
      }
      if (policy.mode === "unknown") {
        pending("morph-memorization-policy-unknown");
      }
      if (policy.mode === "permanent") {
        validateCandidate(character, set, normalizedInput.knownForm, block, noOp);
      }
      break;

    case "memorize-form":
      validateCandidate(character, set, normalizedInput.knownForm, block, noOp);
      analyzeMemorization({
        normalizedInput,
        policy,
        capacityEvaluation,
        block,
        pending,
      });
      break;

    case "replace-memorized-form":
      validateCandidate(character, set, normalizedInput.knownForm, block, noOp);
      if (!normalizedInput.replacementKnownFormId) {
        block("morph-replacement-form-required");
      } else {
        const replaced = findMorphKnownForm(set, normalizedInput.replacementKnownFormId);
        if (!replaced) {
          block("morph-replacement-form-not-found");
        } else if (replaced.state === "forgotten") {
          block("morph-replacement-form-already-forgotten");
        } else if (isActiveKnownForm(set, replaced.id)) {
          block("morph-active-form-cannot-be-replaced");
        }
      }
      analyzeMemorization({
        normalizedInput,
        policy,
        capacityEvaluation,
        block,
        pending,
        replacementProvided: true,
      });
      break;

    case "forget-form": {
      const knownForm = findMorphKnownForm(set, normalizedInput.knownFormId);
      if (!knownForm) block("morph-known-form-not-found");
      else if (knownForm.state === "forgotten") noOp("morph-known-form-already-forgotten");
      else if (isActiveKnownForm(set, knownForm.id)) {
        block("morph-active-form-cannot-be-forgotten");
      }
      break;
    }

    case "restore-form": {
      const knownForm = findMorphKnownForm(set, normalizedInput.knownFormId);
      if (!knownForm) block("morph-known-form-not-found");
      else if (knownForm.state === "available") noOp("morph-known-form-already-available");
      break;
    }

    case "set-availability": {
      const knownForm = findMorphKnownForm(set, normalizedInput.knownFormId);
      if (!knownForm) block("morph-known-form-not-found");
      else {
        const targetState = normalizedInput.available ? "available" : "unavailable";
        if (knownForm.state === targetState) noOp("morph-known-form-state-unchanged");
      }
      break;
    }

    default:
      block("morph-catalog-operation-unsupported");
  }

  return {
    characterId: character.identity.id,
    formSetId: set.id,
    operation: normalizedInput.type,
    normalizedInput,
    policySnapshot: clone(policy),
    capacityEvaluation,
    catalogFingerprint: fingerprintMorphCatalog(set),
    status,
    reasons,
  };
}

export function planMorphCatalogOperation(
  character,
  formSetId,
  operationInput = {},
  options = {},
) {
  const createdAt = normalizeTimestamp(options.now);
  const analysis = analyzeMorphCatalogOperation(
    character,
    formSetId,
    operationInput,
    { now: createdAt },
  );

  return {
    id: options.planId ?? generatePlanId(),
    createdAt,
    ...analysis,
  };
}

export function executeMorphCatalogPlan(character, plan, options = {}) {
  validatePlanShape(plan);
  if (character.identity.id !== plan.characterId) {
    throw new Error("Morfose catalog plan belongs to another character");
  }

  const set = requireMorphSet(character, plan.formSetId);
  if (fingerprintMorphCatalog(set) !== plan.catalogFingerprint) {
    throw new Error("Morfose catalog plan is stale");
  }

  const refreshed = analyzeMorphCatalogOperation(
    character,
    plan.formSetId,
    plan.normalizedInput,
    { now: plan.createdAt },
  );
  if (refreshed.status !== plan.status || refreshed.status === "blocked" || refreshed.status === "pending") {
    throw new Error("Morfose catalog plan is no longer executable");
  }

  if (refreshed.status === "no-op") {
    return {
      character,
      receipt: {
        id: options.eventId ?? null,
        type: "no-op",
        occurredAt: normalizeTimestamp(options.now ?? plan.createdAt),
        characterId: character.identity.id,
        formSetId: set.id,
        knownFormId: plan.normalizedInput.knownFormId ??
          plan.normalizedInput.knownForm?.id ?? null,
        persisted: false,
        reasons: clone(refreshed.reasons),
      },
    };
  }

  const occurredAt = normalizeTimestamp(options.now ?? plan.createdAt);
  return applyCatalogOperation(character, set, plan.normalizedInput, {
    occurredAt,
    eventId: options.eventId,
    policy: refreshed.policySnapshot,
    capacityEvaluation: refreshed.capacityEvaluation,
  });
}

export function registerMorphKnownForm(character, formSetId, input = {}, options = {}) {
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    { type: "acquire-form", knownForm: input },
    options,
  );
  return executeMorphCatalogPlan(character, plan, options).character;
}

export function observeMorphForm(character, formSetId, input = {}, options = {}) {
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    {
      type: "observe-form",
      knownForm: input,
      originalPresent: options.originalPresent ?? input.originalPresent ?? true,
    },
    options,
  );
  return { plan, ...executeMorphCatalogPlan(character, plan, options) };
}

export function memorizeMorphForm(character, formSetId, input = {}, options = {}) {
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    {
      type: "memorize-form",
      knownForm: input,
      originalPresent: options.originalPresent ?? input.originalPresent ?? true,
      concentrationSeconds: options.concentrationSeconds ?? input.concentrationSeconds ?? 0,
      replacementKnownFormId: options.replacementKnownFormId ?? input.replacementKnownFormId ?? null,
    },
    options,
  );
  return { plan, ...executeMorphCatalogPlan(character, plan, options) };
}

export function replaceMorphMemorizedForm(
  character,
  formSetId,
  replacementKnownFormId,
  input = {},
  options = {},
) {
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    {
      type: "replace-memorized-form",
      replacementKnownFormId,
      knownForm: input,
      originalPresent: options.originalPresent ?? input.originalPresent ?? true,
      concentrationSeconds: options.concentrationSeconds ?? input.concentrationSeconds ?? 0,
    },
    options,
  );
  return { plan, ...executeMorphCatalogPlan(character, plan, options) };
}

export function forgetMorphKnownForm(character, formSetId, knownFormId, options = {}) {
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    { type: "forget-form", knownFormId },
    options,
  );
  return executeMorphCatalogPlan(character, plan, options).character;
}

export function restoreMorphKnownForm(character, formSetId, knownFormId, options = {}) {
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    { type: "restore-form", knownFormId },
    options,
  );
  return executeMorphCatalogPlan(character, plan, options).character;
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
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    { type: "set-availability", knownFormId, available },
    options,
  );
  return executeMorphCatalogPlan(character, plan, options).character;
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

  return updateMorphProfile(character, set.id, profile, options.now, false);
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

function analyzeMemorization({
  normalizedInput,
  policy,
  capacityEvaluation,
  block,
  pending,
  replacementProvided = false,
}) {
  if (normalizedInput.originalPresent !== true) {
    block("morph-original-not-present");
  }
  if (policy.mode === "unknown") {
    pending("morph-memorization-policy-unknown");
    return;
  }
  if (policy.mode === "none") {
    block("morph-memorization-forbidden");
    return;
  }
  if (policy.mode === "limited") {
    if (policy.durationSeconds === null) {
      pending("morph-memorization-duration-unknown");
    } else if (normalizedInput.concentrationSeconds < policy.durationSeconds) {
      pending("morph-memorization-concentration-incomplete", {
        requiredSeconds: policy.durationSeconds,
        providedSeconds: normalizedInput.concentrationSeconds,
      });
    }
    if (capacityEvaluation.capacity === null) {
      pending("morph-memorization-capacity-unknown");
    } else if (capacityEvaluation.full && !replacementProvided && !normalizedInput.replacementKnownFormId) {
      pending("morph-memorization-replacement-required", {
        capacity: capacityEvaluation.capacity,
      });
    }
  }
}

function validateCandidate(character, set, knownForm, block, noOp = null) {
  if (!knownForm) {
    block("morph-known-form-input-required");
    return;
  }
  if (
    knownForm.templateId !== null &&
    !character.templates.some(template => template.id === knownForm.templateId)
  ) {
    block("morph-known-form-template-not-found", { templateId: knownForm.templateId });
  }

  const sameId = findMorphKnownForm(set, knownForm.id);
  if (sameId) {
    if (sameId.templateId === knownForm.templateId && noOp) {
      noOp("morph-known-form-already-registered", { knownFormId: sameId.id });
    } else {
      block("morph-known-form-id-already-exists", { knownFormId: knownForm.id });
    }
  }

  if (knownForm.templateId !== null) {
    const sameTemplate = findMorphKnownFormByTemplate(set, knownForm.templateId);
    if (sameTemplate && sameTemplate.id !== knownForm.id) {
      block("morph-template-already-registered", {
        knownFormId: sameTemplate.id,
        templateId: knownForm.templateId,
      });
    }
  }
}

function applyCatalogOperation(character, set, input, context) {
  let knownForms = set.morphProfile.knownForms.map(clone);
  let eventInput;

  if (["acquire-form", "memorize-form", "observe-form", "replace-memorized-form"].includes(input.type)) {
    const shouldPersist = input.type !== "observe-form" || context.policy.mode === "permanent";
    const method = input.type === "memorize-form" || input.type === "replace-memorized-form"
      ? "memorized"
      : input.knownForm.acquisitionMethod;
    const knownForm = createMorphKnownForm({
      ...input.knownForm,
      acquisitionMethod: method,
      acquiredAt: input.knownForm.acquiredAt ?? context.occurredAt,
      memorizedAt: ["memorize-form", "replace-memorized-form"].includes(input.type)
        ? (input.knownForm.memorizedAt ?? context.occurredAt)
        : input.knownForm.memorizedAt,
      lastObservedAt: input.type === "observe-form" || ["memorize-form", "replace-memorized-form"].includes(input.type)
        ? (input.knownForm.lastObservedAt ?? context.occurredAt)
        : input.knownForm.lastObservedAt,
      state: "available",
    });

    if (input.type === "replace-memorized-form") {
      knownForms = knownForms.map(form => (
        form.id === input.replacementKnownFormId
          ? { ...form, state: "forgotten" }
          : form
      ));
      knownForms.push(knownForm);
      eventInput = {
        type: "form-replaced",
        knownFormId: knownForm.id,
        relatedKnownFormId: input.replacementKnownFormId,
        templateId: knownForm.templateId,
        acquisitionMethod: knownForm.acquisitionMethod,
        previousState: "available",
        nextState: "forgotten",
        data: {
          newKnownForm: clone(knownForm),
          capacityEvaluation: clone(context.capacityEvaluation),
        },
      };
    } else if (shouldPersist) {
      knownForms.push(knownForm);
      eventInput = {
        type: input.type === "memorize-form" ? "form-memorized" :
          input.type === "observe-form" ? "form-observed" : "form-acquired",
        knownFormId: knownForm.id,
        templateId: knownForm.templateId,
        acquisitionMethod: knownForm.acquisitionMethod,
        previousState: null,
        nextState: "available",
        data: {
          retained: true,
          knownForm: clone(knownForm),
          policy: clone(context.policy),
        },
      };
    } else {
      eventInput = {
        type: "form-observed",
        knownFormId: knownForm.id,
        templateId: knownForm.templateId,
        acquisitionMethod: "observed",
        previousState: null,
        nextState: null,
        data: {
          retained: false,
          observedForm: clone(knownForm),
          policy: clone(context.policy),
        },
      };
    }
  } else {
    const index = knownForms.findIndex(form => form.id === input.knownFormId);
    const previous = knownForms[index];

    if (input.type === "forget-form") {
      knownForms[index] = { ...previous, state: "forgotten" };
      eventInput = {
        type: "form-forgotten",
        knownFormId: previous.id,
        templateId: previous.templateId,
        acquisitionMethod: previous.acquisitionMethod,
        previousState: previous.state,
        nextState: "forgotten",
      };
    } else if (input.type === "restore-form") {
      knownForms[index] = { ...previous, state: "available" };
      eventInput = {
        type: "form-restored",
        knownFormId: previous.id,
        templateId: previous.templateId,
        acquisitionMethod: previous.acquisitionMethod,
        previousState: previous.state,
        nextState: "available",
      };
    } else if (input.type === "set-availability") {
      const nextState = input.available ? "available" : "unavailable";
      knownForms[index] = { ...previous, state: nextState };
      eventInput = {
        type: "form-availability-changed",
        knownFormId: previous.id,
        templateId: previous.templateId,
        acquisitionMethod: previous.acquisitionMethod,
        previousState: previous.state,
        nextState,
      };
    }
  }

  const receipt = createMorphCatalogHistoryEntry({
    id: context.eventId,
    occurredAt: context.occurredAt,
    characterId: character.identity.id,
    formSetId: set.id,
    data: {},
    ...eventInput,
  });
  const profile = createMorphProfile({
    ...set.morphProfile,
    knownForms,
    catalogHistory: appendMorphCatalogHistory(
      set.morphProfile.catalogHistory,
      receipt,
    ),
  });

  return {
    character: updateMorphProfile(character, set.id, profile, context.occurredAt, true),
    receipt,
  };
}

function normalizeOperationInput(input, now) {
  if (!plain(input)) throw new Error("Morfose catalog operation must be object");
  const type = input.type ?? "acquire-form";
  if (!OPERATION_TYPES.includes(type)) {
    throw new Error("Morfose catalog operation type is invalid");
  }

  const normalized = {
    type,
    knownFormId: nullableString(input.knownFormId),
    replacementKnownFormId: nullableString(input.replacementKnownFormId),
    available: input.available,
    originalPresent: input.originalPresent === true,
    concentrationSeconds: nonNegativeNumber(input.concentrationSeconds ?? 0),
    knownForm: null,
  };

  if (["acquire-form", "observe-form", "memorize-form", "replace-memorized-form"].includes(type)) {
    const source = input.knownForm ?? input.form ?? input;
    const acquisitionMethod = type === "memorize-form" || type === "replace-memorized-form"
      ? "memorized"
      : type === "observe-form"
        ? "observed"
        : source.acquisitionMethod ?? "manual";
    normalized.knownForm = createMorphKnownForm({
      ...source,
      acquisitionMethod,
      acquiredAt: source.acquiredAt ?? normalizeTimestamp(now),
    });
  }

  if (type === "set-availability" && typeof normalized.available !== "boolean") {
    throw new Error("Morfose availability flag must be boolean");
  }

  return normalized;
}

function evaluateCapacity(set, policy) {
  const used = countOccupiedMorphMemorySlots(set);
  const capacity = policy.effectiveCapacity;
  return {
    mode: policy.mode,
    basis: policy.capacityBasis,
    capacity,
    used,
    remaining: capacity === null ? null : Math.max(0, capacity - used),
    full: capacity === null ? false : used >= capacity,
    known: policy.mode !== "unknown" && (policy.mode !== "limited" || capacity !== null),
  };
}

function isRetentionOperation(type) {
  return ["observe-form", "memorize-form", "replace-memorized-form"].includes(type);
}

function isActiveKnownForm(set, knownFormId) {
  const active = set.forms.find(form => form.id === set.activeFormId);
  return active?.morphKnownFormId === knownFormId;
}

function requireMorphSet(character, formSetId) {
  if (!plain(character)) throw new Error("Character must be object");
  const set = character.alternateFormSets?.find(candidate => candidate.id === formSetId);
  if (!set) throw new Error("Alternate form set not found");
  if (set.mechanism !== "morph") {
    throw new Error("Morfose operations require a morph form set");
  }
  if (set.morphProfile === null) {
    throw new Error("Morfose form set must have morphProfile");
  }
  return set;
}

function updateMorphProfile(character, formSetId, morphProfile, now, syncOperational) {
  const updatedAt = normalizeTimestamp(now);
  return createCharacter({
    ...character,
    alternateFormSets: character.alternateFormSets.map(set => {
      if (set.id !== formSetId) return set;
      const resolution = syncOperational && set.morphProfileResolution
        ? {
          ...set.morphProfileResolution,
          baseProfile: createMorphProfile({
            ...set.morphProfileResolution.baseProfile,
            knownForms: morphProfile.knownForms,
            catalogHistory: morphProfile.catalogHistory,
          }),
        }
        : set.morphProfileResolution;
      return {
        ...set,
        morphProfile,
        morphProfileResolution: resolution,
      };
    }),
    metadata: {
      ...character.metadata,
      updatedAt,
    },
  });
}

function fingerprintMorphCatalog(set) {
  const snapshot = {
    activeFormId: set.activeFormId,
    knownForms: set.morphProfile.knownForms,
    memorization: set.morphProfile.memorization,
    recognizedModifiers: (set.morphProfileResolution?.recognizedModifiers ?? [])
      .map(item => ({ ruleId: item.ruleId, enabled: item.enabled !== false })),
  };
  return fnv1a(stableStringify(snapshot));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (plain(value)) {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `morph_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function validatePlanShape(plan) {
  if (!plain(plan)) throw new Error("Morfose catalog plan must be object");
  if (typeof plan.id !== "string" || plan.id === "") {
    throw new Error("Morfose catalog plan id must be non-empty string");
  }
  if (!OPERATION_TYPES.includes(plan.operation)) {
    throw new Error("Morfose catalog plan operation is invalid");
  }
  if (!plain(plan.normalizedInput)) {
    throw new Error("Morfose catalog plan normalizedInput must be object");
  }
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Morfose operation timestamp must be valid");
  }
  return value;
}

function nonNegativeNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Morfose operation duration must be non-negative number");
  }
  return number;
}

function nullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value === "") {
    throw new Error("Morfose operation reference must be non-empty string or null");
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
  return `morph_plan_${Math.random().toString(36).slice(2, 10)}`;
}
