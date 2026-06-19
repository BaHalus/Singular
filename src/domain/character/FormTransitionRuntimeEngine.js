import { createCharacter } from "./Character.js";
import { createFormTransitionRuntime } from "./FormTransitionRuntime.js";
import { planFormReturn } from "./FormTransitionPlanner.js";
import {
  initializeFormTransitionRuntime,
  clearFormTransitionRuntime,
} from "./FormTransitionRuntimeOperations.js";
import {
  evaluateFormTransitionRuntime,
} from "./FormTransitionRuntimeEvaluation.js";
import {
  processFormTransitionMaintenance,
} from "./FormTransitionRuntimeMaintenance.js";
import {
  recordFormRuntimeAdvance,
} from "./FormTransitionHistoryOperations.js";

export function advanceFormTransitionRuntime(character, formSetId, context = {}) {
  let current = character;
  let set = findSet(current, formSetId);
  if (!set) throw new Error("Alternate form set not found");

  if (set.activeFormId === set.baseFormId) {
    if (set.transitionRuntime !== null) {
      current = clearFormTransitionRuntime(current, formSetId, { now: context.now });
    }
    return {
      character: current,
      report: {
        status: "base-form",
        elapsedSeconds: 0,
        consumedResources: [],
        returnRequest: null,
      },
      returnPlan: null,
    };
  }

  if (set.transitionRuntime === null) {
    current = initializeFormTransitionRuntime(current, formSetId, {
      now: context.now ?? set.activeSince,
    });
    set = findSet(current, formSetId);
  }

  const evaluation = evaluateFormTransitionRuntime(current, formSetId, context);
  const runtime = set.transitionRuntime;
  const maintenance = processFormTransitionMaintenance(current, runtime, evaluation);
  const existingRequest = runtime.returnRequest;
  const reasons = unique([
    ...(existingRequest?.reasons ?? []),
    ...evaluation.returnReasons,
    ...(maintenance.success ? [] : ["maintenance-unpaid"]),
  ]);
  const triggerIds = unique([
    ...(existingRequest?.triggerIds ?? []),
    ...evaluation.activeTriggerIds,
  ]);
  const returnRequest = reasons.length === 0
    ? null
    : {
      requestedAt: existingRequest?.requestedAt ?? evaluation.observedAt,
      intent: evaluation.returnMode === "involuntary"
        ? "involuntary"
        : "automatic",
      reasons,
      triggerIds,
      targetFormId: evaluation.returnTargetFormId,
    };
  const status = determineStatus(evaluation, maintenance, returnRequest);
  const nextRuntime = createFormTransitionRuntime({
    ...runtime,
    observedAt: evaluation.observedAt,
    elapsedSeconds: evaluation.elapsedSeconds,
    status,
    maintenance: maintenance.maintenance,
    duration: evaluation.duration,
    returnRequest,
  });
  const updated = createCharacter({
    ...current,
    pools: maintenance.pools,
    alternateFormSets: current.alternateFormSets.map(candidate => (
      candidate.id === formSetId
        ? { ...candidate, transitionRuntime: nextRuntime }
        : candidate
    )),
    metadata: {
      ...current.metadata,
      updatedAt: evaluation.observedAt,
    },
  });
  const recorded = recordFormRuntimeAdvance(updated, {
    formSetId,
    formId: set.activeFormId,
    runtimeId: runtime.activationId,
    activationId: set.activeActivationId,
    observedAt: evaluation.observedAt,
    consumedResources: maintenance.consumedResources,
    dueMaintenance: evaluation.dueMaintenance,
    maintenanceError: maintenance.error,
    previousReturnRequest: existingRequest,
    returnRequest,
  });
  const forcedReturn = returnRequest !== null && returnRequest.reasons.some(
    reason => ["maximum-duration-reached", "maintenance-unpaid"].includes(reason),
  );
  const returnPlan = returnRequest === null
    ? null
    : planFormReturn(recorded, formSetId, {
      ...context,
      intent: returnRequest.intent,
      bypassReturnTriggers: forcedReturn,
      activeTriggers: unique([
        ...(context.activeTriggers ?? []),
        ...returnRequest.triggerIds,
      ]),
    });

  return {
    character: recorded,
    report: {
      ...evaluation,
      status,
      maintenancePaid: maintenance.success,
      consumedResources: maintenance.consumedResources,
      maintenanceError: maintenance.error,
      returnRequest,
    },
    returnPlan,
  };
}

export function advanceAllFormTransitionRuntimes(character, context = {}) {
  let current = character;
  const reports = [];
  const returnPlans = [];

  for (const set of character.alternateFormSets) {
    const result = advanceFormTransitionRuntime(current, set.id, context);
    current = result.character;
    reports.push({ formSetId: set.id, ...result.report });
    if (result.returnPlan !== null) returnPlans.push(result.returnPlan);
  }

  return { character: current, reports, returnPlans };
}

function determineStatus(evaluation, maintenance, request) {
  if (!maintenance.success) return "maintenance-unpaid";
  if (evaluation.duration.maximumReached) return "expired";
  if (request !== null) return "return-pending";
  if (evaluation.dueMaintenance.length > 0) return "active";
  return evaluation.status;
}

function findSet(character, setId) {
  return character.alternateFormSets.find(set => set.id === setId) ?? null;
}

function unique(values) {
  return [...new Set(values)];
}
