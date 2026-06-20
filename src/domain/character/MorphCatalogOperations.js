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
import {
  mergeMorphKnownFormEvidence,
  morphKnownFormOccupancyDelta,
  resolveMorphKnownFormIdentity,
} from "./MorphKnownFormIdentity.js";

const OPERATION_TYPES = [
  "acquire-form",
  "observe-form",
  "memorize-form",
  "forget-form",
  "restore-form",
  "set-availability",
  "replace-memorized-form",
];
const CANDIDATE_OPERATION_TYPES = [
  "acquire-form",
  "observe-form",
  "memorize-form",
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
  const identityResolution = CANDIDATE_OPERATION_TYPES.includes(normalizedInput.type)
    ? resolveMorphKnownFormIdentity(
      set,
      normalizedInput.knownForm,
      normalizedInput.identityHints,
    )
    : null;
  const capacityEvaluation = evaluateCapacity(
    set,
    policy,
    normalizedInput,
    identityResolution,
  );
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
      validateCandidate(character, normalizedInput.knownForm, identityResolution, block);
      analyzeAcquisition({
        set,
        normalizedInput,
        identityResolution,
        policy,
        capacityEvaluation,
        block,
        pending,
      });
      break;

    case "observe-form":
      validateCandidate(character, normalizedInput.knownForm, identityResolution, block);
      if (normalizedInput.originalPresent !== true) {
        block("morph-original-not-present");
      }
      if (policy.mode === "unknown") {
        pending("morph-memorization-policy-unknown");
      }
      break;

    case "memorize-form":
      validateCandidate(character, normalizedInput.knownForm, identityResolution, block);
      analyzeMemorization({
        normalizedInput,
        policy,
        capacityEvaluation,
        block,
        pending,
      });
      break;

    case "replace-memorized-form":
      validateCandidate(character, normalizedInput.knownForm, identityResolution, block);
      analyzeReplacement(
        set,
        normalizedInput,
        identityResolution,
        capacityEvaluation,
        block,
      );
      analyzeMemorization({
        normalizedInput,
        policy,
        capacityEvaluation,
        block,
        pending,
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
    identityResolution: clone(identityResolution),
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
  if (
    refreshed.status !== plan.status ||
    refreshed.status === "blocked" ||
    refreshed.status === "pending"
  ) {
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
        knownFormId: refreshed.identityResolution?.matchedKnownFormId ??
          plan.normalizedInput.knownFormId ??
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
    identityResolution: refreshed.identityResolution,
    policy: refreshed.policySnapshot,
    capacityEvaluation: refreshed.capacityEvaluation,
  });
}

export function registerMorphKnownForm(character, formSetId, input = {}, options = {}) {
  const plan = planMorphCatalogOperation(
    character,
    formSetId,
    {
      type: "acquire-form",
      knownFormId: options.knownFormId ?? input.knownFormId ?? null,
      replacementKnownFormId: options.replacementKnownFormId ??
        input.replacementKnownFormId ?? null,
      knownForm: input,
    },
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
      knownFormId: options.knownFormId ?? input.knownFormId ?? null,
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
      knownFormId: options.knownFormId ?? input.knownFormId ?? null,
      knownForm: input,
      originalPresent: options.originalPresent ?? input.originalPresent ?? true,
      concentrationSeconds: options.concentrationSeconds ?? input.concentrationSeconds ?? 0,
      replacementKnownFormId: options.replacementKnownFormId ??
        input.replacementKnownFormId ?? null,
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
      knownFormId: options.knownFormId ?? input.knownFormId ?? null,
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
    } else if (capacityEvaluation.wouldExceed) {
      if (normalizedInput.type === "replace-memorized-form") {
        block("morph-memorization-capacity-exceeded", {
          capacity: capacityEvaluation.capacity,
          projectedUsed: capacityEvaluation.projectedUsed,
        });
      } else {
        pending("morph-memorization-replacement-required", {
          capacity: capacityEvaluation.capacity,
        });
      }
    }
  }
}

function analyzeAcquisition({
  set,
  normalizedInput,
  identityResolution,
  policy,
  capacityEvaluation,
  block,
  pending,
}) {
  const replacementProvided = normalizedInput.replacementKnownFormId !== null;

  if (policy.mode !== "limited" || capacityEvaluation.requiredSlots === 0) {
    if (replacementProvided) {
      block("morph-acquisition-replacement-not-required");
    }
    return;
  }
  if (capacityEvaluation.capacity === null) {
    pending("morph-acquisition-capacity-unknown");
    return;
  }

  const projectedWithoutReplacement = capacityEvaluation.used +
    capacityEvaluation.requiredSlots;
  const replacementRequired = projectedWithoutReplacement >
    capacityEvaluation.capacity;

  if (!replacementRequired) {
    if (replacementProvided) {
      block("morph-acquisition-replacement-not-required", {
        capacity: capacityEvaluation.capacity,
        projectedWithoutReplacement,
      });
    }
    return;
  }

  if (!replacementProvided) {
    pending("morph-acquisition-replacement-required", {
      capacity: capacityEvaluation.capacity,
      projectedWithoutReplacement,
    });
    return;
  }

  analyzeReplacement(
    set,
    normalizedInput,
    identityResolution,
    capacityEvaluation,
    block,
  );
  if (capacityEvaluation.wouldExceed) {
    block("morph-acquisition-capacity-exceeded", {
      capacity: capacityEvaluation.capacity,
      projectedUsed: capacityEvaluation.projectedUsed,
    });
  }
}

function analyzeReplacement(
  set,
  normalizedInput,
  identityResolution,
  capacityEvaluation,
  block,
) {
  if (!normalizedInput.replacementKnownFormId) {
    block("morph-replacement-form-required");
    return;
  }

  const replaced = findMorphKnownForm(set, normalizedInput.replacementKnownFormId);
  if (!replaced) {
    block("morph-replacement-form-not-found");
    return;
  }
  if (replaced.state === "forgotten") {
    block("morph-replacement-form-already-forgotten");
  }
  if (isActiveKnownForm(set, replaced.id)) {
    block("morph-active-form-cannot-be-replaced");
  }

  if (identityResolution?.status === "matched") {
    const candidate = findMorphKnownForm(set, identityResolution.matchedKnownFormId);
    if (candidate.id === replaced.id) {
      block("morph-replacement-candidate-same-form");
    } else if (candidate.state !== "forgotten") {
      block("morph-replacement-candidate-already-retained", {
        knownFormId: candidate.id,
      });
    }
  }
}

function validateCandidate(character, knownForm, identityResolution, block) {
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
  if (["ambiguous", "conflict"].includes(identityResolution?.status)) {
    for (const reason of identityResolution.reasons) {
      block(reason.code, clone(reason));
    }
  }
}

function applyCatalogOperation(character, set, input, context) {
  if (CANDIDATE_OPERATION_TYPES.includes(input.type)) {
    return applyCandidateOperation(character, set, input, context);
  }
  return applyStateOperation(character, set, input, context);
}

function applyCandidateOperation(character, set, input, context) {
  let knownForms = set.morphProfile.knownForms.map(clone);
  const identity = context.identityResolution;
  const existing = identity?.status === "matched"
    ? findMorphKnownForm(set, identity.matchedKnownFormId)
    : null;
  const incoming = createIncomingKnownForm(input, context);
  const isObservation = input.type === "observe-form" ||
    input.type === "memorize-form" ||
    input.type === "replace-memorized-form";
  const isMemorization = input.type === "memorize-form" ||
    input.type === "replace-memorized-form";
  const retain = input.type !== "observe-form" || context.policy.mode === "permanent";
  let stored = null;
  let previousState = null;

  if (input.replacementKnownFormId !== null) {
    knownForms = knownForms.map(form => (
      form.id === input.replacementKnownFormId
        ? { ...form, state: "forgotten" }
        : form
    ));
  }

  if (existing) {
    previousState = existing.state;
    stored = mergeMorphKnownFormEvidence(existing, incoming, {
      occurredAt: context.occurredAt,
      observed: isObservation,
      memorized: isMemorization,
      retain,
    });
    knownForms = knownForms.map(form => form.id === existing.id ? stored : form);
  } else if (retain) {
    stored = createMorphKnownForm({
      ...incoming,
      state: "available",
    });
    knownForms.push(stored);
  }

  const eventType = input.replacementKnownFormId !== null
    ? "form-replaced"
    : input.type === "memorize-form" ? "form-memorized" :
      input.type === "observe-form" ? "form-observed" :
        "form-acquired";
  const canonicalKnownFormId = stored?.id ?? incoming.id;
  const eventInput = {
    type: eventType,
    knownFormId: canonicalKnownFormId,
    relatedKnownFormId: input.replacementKnownFormId,
    templateId: stored?.templateId ?? incoming.templateId,
    acquisitionMethod: incoming.acquisitionMethod,
    previousState: input.replacementKnownFormId !== null
      ? findMorphKnownForm(set, input.replacementKnownFormId)?.state ?? null
      : previousState,
    nextState: input.replacementKnownFormId !== null
      ? "forgotten"
      : stored?.state ?? null,
    data: {
      retained: retain,
      reused: existing !== null,
      identityResolution: clone(identity),
      previousKnownForm: clone(existing),
      incomingKnownForm: clone(incoming),
      knownForm: clone(stored),
      policy: clone(context.policy),
      capacityEvaluation: clone(context.capacityEvaluation),
    },
  };

  return persistCatalogChange(character, set, knownForms, eventInput, context);
}

function applyStateOperation(character, set, input, context) {
  const knownForms = set.morphProfile.knownForms.map(clone);
  const index = knownForms.findIndex(form => form.id === input.knownFormId);
  const previous = knownForms[index];
  let nextState;
  let type;

  if (input.type === "forget-form") {
    nextState = "forgotten";
    type = "form-forgotten";
  } else if (input.type === "restore-form") {
    nextState = "available";
    type = "form-restored";
  } else {
    nextState = input.available ? "available" : "unavailable";
    type = "form-availability-changed";
  }

  knownForms[index] = { ...previous, state: nextState };
  return persistCatalogChange(character, set, knownForms, {
    type,
    knownFormId: previous.id,
    templateId: previous.templateId,
    acquisitionMethod: previous.acquisitionMethod,
    previousState: previous.state,
    nextState,
  }, context);
}

function persistCatalogChange(character, set, knownForms, eventInput, context) {
  const receipt = createMorphCatalogHistoryEntry({
    id: context.eventId,
    occurredAt: context.occurredAt,
    characterId: character.identity.id,
    formSetId: set.id,
    relatedKnownFormId: null,
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

function createIncomingKnownForm(input, context) {
  const method = input.type === "memorize-form" ||
    input.type === "replace-memorized-form"
    ? "memorized"
    : input.knownForm.acquisitionMethod;
  const observed = input.type === "observe-form" ||
    input.type === "memorize-form" ||
    input.type === "replace-memorized-form";
  const memorized = input.type === "memorize-form" ||
    input.type === "replace-memorized-form";

  return createMorphKnownForm({
    ...input.knownForm,
    acquisitionMethod: method,
    acquiredAt: input.knownForm.acquiredAt ?? context.occurredAt,
    memorizedAt: memorized
      ? (input.knownForm.memorizedAt ?? context.occurredAt)
      : input.knownForm.memorizedAt,
    lastObservedAt: observed
      ? (input.knownForm.lastObservedAt ?? context.occurredAt)
      : input.knownForm.lastObservedAt,
    state: "available",
  });
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
    identityHints: null,
  };

  if (CANDIDATE_OPERATION_TYPES.includes(type)) {
    const source = input.knownForm ?? input.form ?? input;
    const existingHints = plain(input.identityHints) ? clone(input.identityHints) : null;
    const sourceId = nullableString(source.id);
    const topLevelId = nullableString(input.knownFormId);
    const explicitKnownFormId = existingHints
      ? nullableString(existingHints.explicitKnownFormId)
      : topLevelId ?? sourceId;
    const conflictingKnownFormIds = existingHints?.conflictingKnownFormIds ??
      [topLevelId, sourceId].filter(value => value !== null);
    const acquisitionMethod = type === "memorize-form" || type === "replace-memorized-form"
      ? "memorized"
      : type === "observe-form"
        ? "observed"
        : source.acquisitionMethod ?? "manual";

    normalized.knownForm = createMorphKnownForm({
      ...source,
      id: topLevelId ?? source.id,
      acquisitionMethod,
      acquiredAt: source.acquiredAt ?? normalizeTimestamp(now),
    });
    normalized.identityHints = {
      explicitKnownFormId,
      conflictingKnownFormIds: [...new Set(conflictingKnownFormIds)],
    };
  }

  if (type === "set-availability" && typeof normalized.available !== "boolean") {
    throw new Error("Morfose availability flag must be boolean");
  }

  return normalized;
}

function evaluateCapacity(set, policy, input, identityResolution) {
  const used = countOccupiedMorphMemorySlots(set);
  const capacity = policy.effectiveCapacity;
  const retainsCandidate = input.type === "memorize-form" ||
    input.type === "replace-memorized-form" ||
    input.type === "acquire-form" ||
    (input.type === "observe-form" && policy.mode === "permanent");
  const requiredSlots = retainsCandidate
    ? morphKnownFormOccupancyDelta(set, identityResolution)
    : 0;
  const replacement = input.replacementKnownFormId !== null
    ? findMorphKnownForm(set, input.replacementKnownFormId)
    : null;
  const releasedSlots = replacement && replacement.state !== "forgotten" ? 1 : 0;
  const projectedUsed = Math.max(0, used - releasedSlots + requiredSlots);

  return {
    mode: policy.mode,
    basis: policy.capacityBasis,
    capacity,
    used,
    requiredSlots,
    releasedSlots,
    projectedUsed,
    remaining: capacity === null ? null : Math.max(0, capacity - projectedUsed),
    full: capacity === null ? false : used >= capacity,
    wouldExceed: capacity === null ? false : projectedUsed > capacity,
    known: policy.mode !== "unknown" && (policy.mode !== "limited" || capacity !== null),
  };
}

function isRetentionOperation(type) {
  return [
    "acquire-form",
    "observe-form",
    "memorize-form",
    "replace-memorized-form",
  ].includes(type);
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
