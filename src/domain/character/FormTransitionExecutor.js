import { activateAlternateForm } from "./AlternateFormOperations.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import {
  validateExecutableFormTransitionPlan,
  createFormTransitionPlanFingerprint,
  createExecutionContextFromPlan,
} from "./FormTransitionPlan.js";
import {
  consumeFormTransitionCosts,
} from "./FormTransitionExecutorResources.js";

export class FormTransitionExecutionError extends Error {
  constructor(code, message, details = null, options = {}) {
    super(message, options);
    this.name = "FormTransitionExecutionError";
    this.code = code;
    this.details = details;
  }
}

export function executeFormTransition(character, plan, options = {}) {
  validateCharacter(character);

  try {
    validateExecutableFormTransitionPlan(plan);
  } catch (error) {
    throw new FormTransitionExecutionError(
      "PLAN_NOT_READY",
      error.message,
      { planStatus: plan?.status ?? null },
      { cause: error },
    );
  }

  const set = character.alternateFormSets.find(
    candidate => candidate.id === plan.formSetId,
  );

  if (!set) {
    throw new FormTransitionExecutionError(
      "FORM_SET_NOT_FOUND",
      "Alternate form set not found during execution",
      { formSetId: plan.formSetId },
    );
  }

  if (set.activeFormId !== plan.fromFormId) {
    throw new FormTransitionExecutionError(
      "PLAN_STALE",
      "Form transition plan source form is no longer active",
      {
        plannedFromFormId: plan.fromFormId,
        activeFormId: set.activeFormId,
      },
    );
  }

  const executedAt = normalizeTimestamp(options.now);
  const revalidationContext = mergeExecutionContext(
    createExecutionContextFromPlan(plan),
    options.context,
  );
  const currentPlan = planFormTransition(
    character,
    plan.formSetId,
    plan.targetFormId,
    revalidationContext,
  );

  if (!currentPlan.allowed || currentPlan.status !== "ready") {
    throw new FormTransitionExecutionError(
      "REVALIDATION_FAILED",
      "Form transition plan is no longer executable",
      {
        status: currentPlan.status,
        reasons: [...currentPlan.reasons],
        currentPlan,
      },
    );
  }

  const expectedFingerprint = createFormTransitionPlanFingerprint(plan);
  const currentFingerprint = createFormTransitionPlanFingerprint(currentPlan);

  if (expectedFingerprint !== currentFingerprint) {
    throw new FormTransitionExecutionError(
      "PLAN_STALE",
      "Form transition rules changed after planning",
      {
        expectedFingerprint,
        currentFingerprint,
        currentPlan,
      },
    );
  }

  let consumed;

  try {
    consumed = consumeFormTransitionCosts(character, currentPlan.costs);
  } catch (error) {
    throw new FormTransitionExecutionError(
      "RESOURCE_CONSUMPTION_FAILED",
      error.message,
      { costs: currentPlan.costs },
      { cause: error },
    );
  }

  const preparedCharacter = {
    ...character,
    pools: consumed.pools,
  };
  let transitionedCharacter;

  try {
    transitionedCharacter = activateAlternateForm(
      preparedCharacter,
      currentPlan.formSetId,
      currentPlan.targetFormId,
      {
        now: executedAt,
        activationId: options.activationId,
      },
    );
  } catch (error) {
    throw new FormTransitionExecutionError(
      "TRANSITION_FAILED",
      error.message,
      {
        formSetId: currentPlan.formSetId,
        targetFormId: currentPlan.targetFormId,
      },
      { cause: error },
    );
  }

  const transitionedSet = transitionedCharacter.alternateFormSets.find(
    candidate => candidate.id === currentPlan.formSetId,
  );
  const executionId = options.executionId ?? generateExecutionId();
  const receipt = {
    id: executionId,
    executedAt,
    characterId: transitionedCharacter.identity.id,

    formSetId: currentPlan.formSetId,
    fromFormId: currentPlan.fromFormId,
    targetFormId: currentPlan.targetFormId,
    transitionKind: currentPlan.transitionKind,
    intent: currentPlan.intent,

    planFingerprint: currentFingerprint,
    activationId: transitionedSet?.activeActivationId ?? null,

    maneuvers: [...currentPlan.maneuvers],
    timeSeconds: currentPlan.timeSeconds,
    timeKnown: currentPlan.timeKnown,

    consumedResources: consumed.consumedResources,
    consumedCostIds: currentPlan.costs.map(cost => cost.id ?? null),
  };

  return {
    character: transitionedCharacter,
    receipt,
    plan: currentPlan,
  };
}

function mergeExecutionContext(base, override) {
  if (override === undefined || override === null) {
    return base;
  }

  if (!isPlainObject(override)) {
    throw new FormTransitionExecutionError(
      "INVALID_CONTEXT",
      "Form transition execution context must be object",
    );
  }

  const result = {
    ...base,
    ...override,
  };

  for (const key of [
    "testResults",
    "requirementResults",
    "triggerResults",
    "impedimentResults",
    "resources",
  ]) {
    if (base[key] !== undefined || override[key] !== undefined) {
      result[key] = {
        ...(base[key] ?? {}),
        ...(override[key] ?? {}),
      };
    }
  }

  return result;
}

function validateCharacter(character) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new FormTransitionExecutionError(
      "INVALID_CHARACTER",
      "Character must be object",
    );
  }

  if (!Array.isArray(character.alternateFormSets)) {
    throw new FormTransitionExecutionError(
      "INVALID_CHARACTER",
      "Character alternateFormSets must be array",
    );
  }
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "string" || value === "") {
    throw new FormTransitionExecutionError(
      "INVALID_TIMESTAMP",
      "Form transition execution timestamp must be string, Date or null",
    );
  }

  return value;
}

function generateExecutionId() {
  return `form_transition_${Math.random().toString(36).slice(2, 10)}`;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
