import { evaluateTransitionConditions } from "./FormTransitionPlannerContext.js";
import { getEffectiveTransitionRules } from "./FormTransitionPlannerEvaluation.js";

export function evaluateFormTransitionRuntime(character, setId, context = {}) {
  const set = character.alternateFormSets.find(item => item.id === setId);
  if (!set) throw new Error("Alternate form set not found");
  const runtime = set.transitionRuntime;
  if (runtime == null) return emptyEvaluation(set);

  const form = set.forms.find(item => item.id === set.activeFormId);
  if (!form) throw new Error("Alternate form set active form not found");
  if (runtime.formId !== form.id) throw new Error("Form transition runtime is stale");

  const observedAt = validTime(context.now);
  if (Date.parse(observedAt) < Date.parse(runtime.observedAt)) {
    throw new Error("Form transition runtime clock cannot move backwards");
  }
  const elapsedSeconds = (Date.parse(observedAt) - Date.parse(runtime.startedAt)) / 1000;

  const dueMaintenance = [];
  const unscheduledMaintenance = [];
  for (const entry of runtime.maintenance) {
    if (entry.intervalSeconds == null || entry.amount == null || entry.resourceKey == null) {
      unscheduledMaintenance.push({ ...entry, reason: missingReason(entry) });
      continue;
    }
    const totalIntervals = Math.floor(elapsedSeconds / entry.intervalSeconds);
    const dueIntervals = Math.max(0, totalIntervals - entry.chargedIntervals);
    if (dueIntervals > 0) dueMaintenance.push({
      ...entry,
      dueIntervals,
      dueAmount: entry.amount * dueIntervals,
      totalIntervals,
    });
  }

  const rules = getEffectiveTransitionRules(set, form);
  const duration = {
    minimumSeconds: rules.duration.minimumSeconds,
    maximumSeconds: rules.duration.maximumSeconds,
    minimumReached: rules.duration.minimumSeconds != null && elapsedSeconds >= rules.duration.minimumSeconds,
    maximumReached: rules.duration.maximumSeconds != null && elapsedSeconds >= rules.duration.maximumSeconds,
  };
  const returnTriggers = evaluateTransitionConditions(rules.return.triggers, "trigger", context);
  const activeTriggerIds = returnTriggers.filter(item => item.status === "active").map(item => item.id);
  const returnReasons = [];
  if (duration.maximumReached) returnReasons.push("maximum-duration-reached");
  if (activeTriggerIds.length > 0 && ["automatic", "involuntary"].includes(rules.return.mode)) returnReasons.push("return-trigger-active");

  return {
    status: dueMaintenance.length > 0 ? "maintenance-due" : "active",
    observedAt,
    elapsedSeconds,
    dueMaintenance,
    unscheduledMaintenance,
    duration,
    returnMode: rules.return.mode,
    returnTargetFormId: rules.return.targetFormId ?? set.baseFormId,
    returnTriggers,
    activeTriggerIds,
    returnReasons,
  };
}

function emptyEvaluation(set) {
  return {
    status: set.activeFormId === set.baseFormId ? "base-form" : "uninitialized",
    elapsedSeconds: 0,
    dueMaintenance: [],
    unscheduledMaintenance: [],
    duration: null,
    returnTriggers: [],
    activeTriggerIds: [],
    returnReasons: [],
  };
}

function missingReason(entry) {
  if (entry.intervalSeconds == null) return "unknown-interval";
  if (entry.amount == null) return "unknown-amount";
  if (entry.resourceKey == null) return "unknown-resource";
  return "unknown";
}

function validTime(value) {
  if (value == null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error("Form transition runtime now must be valid timestamp");
  return value;
}
