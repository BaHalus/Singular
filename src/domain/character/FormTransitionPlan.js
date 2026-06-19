export function validateExecutableFormTransitionPlan(plan) {
  if (!isPlainObject(plan)) {
    throw new Error("Form transition plan must be object");
  }

  for (const key of [
    "characterId",
    "formSetId",
    "fromFormId",
    "targetFormId",
  ]) {
    if (typeof plan[key] !== "string" || plan[key] === "") {
      throw new Error(`Form transition plan ${key} must be non-empty string`);
    }
  }

  if (
    plan.targetTemplateId !== null &&
    plan.targetTemplateId !== undefined &&
    (typeof plan.targetTemplateId !== "string" || plan.targetTemplateId === "")
  ) {
    throw new Error("Form transition plan targetTemplateId must be non-empty string or null");
  }

  if (
    plan.morphSelection !== null &&
    plan.morphSelection !== undefined &&
    !isPlainObject(plan.morphSelection)
  ) {
    throw new Error("Form transition plan morphSelection must be object or null");
  }

  if (typeof plan.bypassReturnTriggers !== "boolean") {
    throw new Error("Form transition plan bypassReturnTriggers must be boolean");
  }

  if (plan.allowed !== true || plan.status !== "ready") {
    throw new Error("Form transition plan is not ready for execution");
  }

  if (!Array.isArray(plan.phases) || plan.phases.length === 0) {
    throw new Error("Executable form transition plan must have phases");
  }

  if (!Array.isArray(plan.costs) || !Array.isArray(plan.requiredTests)) {
    throw new Error("Form transition plan collections are invalid");
  }

  if (!Array.isArray(plan.reasons) || plan.reasons.length !== 0) {
    throw new Error("Executable form transition plan cannot have reasons");
  }

  return true;
}

export function createFormTransitionPlanFingerprint(plan) {
  if (!isPlainObject(plan)) {
    throw new Error("Form transition plan must be object");
  }

  return JSON.stringify(projectExecutionPlan(plan));
}

export function createExecutionContextFromPlan(plan) {
  if (!isPlainObject(plan)) {
    throw new Error("Form transition plan must be object");
  }

  const context = {
    intent: plan.intent ?? "voluntary",
    bypassReturnTriggers: plan.bypassReturnTriggers === true,
    testResults: {},
    requirementResults: {},
    triggerResults: {},
    impedimentResults: {},
    requireKnownTime: false,
  };

  for (const phase of plan.phases ?? []) {
    for (const test of phase.tests ?? []) {
      context.testResults[test.id] = test.status;
    }

    for (const entry of phase.requirements ?? []) {
      context.requirementResults[entry.id] = entry.status;
    }

    for (const entry of phase.triggers ?? []) {
      context.triggerResults[entry.id] = entry.status;
    }

    for (const entry of phase.impediments ?? []) {
      context.impedimentResults[entry.id] = entry.status;
    }
  }

  for (const entry of plan.return?.evaluation?.triggers ?? []) {
    context.triggerResults[entry.id] = entry.status;
  }

  return context;
}

function projectExecutionPlan(plan) {
  return {
    characterId: plan.characterId,
    intent: plan.intent,
    bypassReturnTriggers: plan.bypassReturnTriggers === true,
    transitionKind: plan.transitionKind,
    formSetId: plan.formSetId,
    fromFormId: plan.fromFormId,
    targetFormId: plan.targetFormId,
    targetTemplateId: plan.targetTemplateId ?? null,
    morphSelection: projectMorphSelection(plan.morphSelection),
    maneuver: plan.maneuver,
    maneuvers: cloneValue(plan.maneuvers ?? []),
    timeSeconds: plan.timeSeconds,
    timeKnown: plan.timeKnown,
    phases: (plan.phases ?? []).map(projectPhase),
    costs: (plan.costs ?? []).map(projectCost),
    maintenanceCosts: (plan.maintenanceCosts ?? []).map(projectCost),
    requiredTests: (plan.requiredTests ?? []).map(projectTest),
    duration: cloneValue(plan.duration),
    return: projectReturn(plan.return),
  };
}

function projectMorphSelection(value) {
  if (!isPlainObject(value)) return null;
  return {
    knownFormId: value.knownFormId ?? null,
    knownFormState: value.knownFormState ?? null,
    templateId: value.templateId ?? null,
    templateImportedPoints: value.templateImportedPoints ?? null,
    materialization: cloneValue(value.materialization ?? null),
    status: value.status ?? null,
    reasons: cloneValue(value.reasons ?? []),
    pointLimitEvaluation: cloneValue(value.pointLimitEvaluation ?? null),
  };
}

function projectPhase(phase) {
  return {
    kind: phase.kind,
    formId: phase.formId,
    maneuver: phase.maneuver,
    involuntary: phase.involuntary,
    interruptible: phase.interruptible,
    baseTimeSeconds: phase.baseTimeSeconds,
    timeStepsDelta: phase.timeStepsDelta,
    timeSeconds: phase.timeSeconds,
    timeKnown: phase.timeKnown,
    costs: (phase.costs ?? []).map(projectCost),
    tests: (phase.tests ?? []).map(projectTest),
    requirements: (phase.requirements ?? []).map(projectCondition),
    triggers: (phase.triggers ?? []).map(projectCondition),
    impediments: (phase.impediments ?? []).map(projectCondition),
  };
}

function projectCost(cost) {
  return {
    id: cost.id,
    resource: cost.resource,
    resourceKey: cost.resourceKey ?? null,
    amount: cost.amount,
    timing: cost.timing,
    intervalSeconds: cost.intervalSeconds ?? null,
    phase: cost.phase ?? null,
    formId: cost.formId ?? null,
  };
}

function projectTest(test) {
  return {
    id: test.id,
    kind: test.kind,
    target: test.target,
    modifier: test.modifier,
    notes: test.notes ?? "",
    status: test.status ?? null,
  };
}

function projectCondition(entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    description: entry.description,
    notes: entry.notes ?? "",
    status: entry.status ?? null,
  };
}

function projectReturn(value) {
  if (!isPlainObject(value)) return null;

  return {
    mode: value.mode,
    targetFormId: value.targetFormId,
    triggers: (value.triggers ?? []).map(projectCondition),
    evaluation: value.evaluation === null
      ? null
      : {
        applicable: value.evaluation?.applicable,
        mode: value.evaluation?.mode,
        targetFormId: value.evaluation?.targetFormId,
        targetMatches: value.evaluation?.targetMatches,
        locked: value.evaluation?.locked,
        triggers: (value.evaluation?.triggers ?? []).map(projectCondition),
      },
  };
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
