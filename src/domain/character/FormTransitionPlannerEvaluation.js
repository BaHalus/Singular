import { createFormTransitionRules } from "./FormTransitionRules.js";
import {
  evaluateTransitionConditions,
  evaluateTransitionTests,
} from "./FormTransitionPlannerContext.js";

export function buildTransitionPhases(set, fromForm, targetForm) {
  const phases = [];

  if (fromForm.id !== set.baseFormId) {
    const rules = getEffectiveTransitionRules(set, fromForm);
    phases.push({
      kind: "deactivation",
      form: fromForm,
      phaseRules: rules.deactivation,
      impediments: rules.impediments,
    });
  }

  if (targetForm.id !== set.baseFormId) {
    const rules = getEffectiveTransitionRules(set, targetForm);
    phases.push({
      kind: "activation",
      form: targetForm,
      phaseRules: rules.activation,
      impediments: rules.impediments,
    });
  }

  return phases;
}

export function evaluateTransitionPhase(phase, context) {
  const time = calculatePhaseTime(phase.phaseRules);

  return {
    kind: phase.kind,
    formId: phase.form.id,
    maneuver: phase.phaseRules.maneuver,
    involuntary: phase.phaseRules.involuntary,
    interruptible: phase.phaseRules.interruptible,
    baseTimeSeconds: phase.phaseRules.baseTimeSeconds,
    timeStepsDelta: phase.phaseRules.timeStepsDelta,
    timeSeconds: time.seconds,
    timeKnown: time.known,
    costs: phase.phaseRules.costs
      .filter(cost => (
        cost.timing === phase.kind || cost.timing === "unspecified"
      ))
      .map(cost => ({
        ...cloneValue(cost),
        phase: phase.kind,
        formId: phase.form.id,
      })),
    tests: evaluateTransitionTests(phase.phaseRules.tests, context),
    requirements: evaluateTransitionConditions(
      phase.phaseRules.requirements,
      "requirement",
      context,
    ),
    triggers: evaluateTransitionConditions(
      phase.phaseRules.triggers,
      "trigger",
      context,
    ),
    impediments: evaluateTransitionConditions(
      phase.impediments,
      "impediment",
      context,
    ),
  };
}

export function evaluateReturnTransition(
  set,
  fromForm,
  targetForm,
  context,
) {
  if (fromForm.id === set.baseFormId) {
    return {
      applicable: false,
      mode: "manual",
      targetFormId: null,
      targetMatches: true,
      locked: false,
      triggers: [],
    };
  }

  const rules = getEffectiveTransitionRules(set, fromForm);
  const configuredTarget = rules.return.targetFormId ?? set.baseFormId;
  const applicable = (
    targetForm.id === configuredTarget ||
    targetForm.id === set.baseFormId
  );

  return {
    applicable,
    mode: rules.return.mode,
    targetFormId: configuredTarget,
    targetMatches: (
      rules.return.targetFormId === null ||
      targetForm.id === rules.return.targetFormId
    ),
    locked: applicable && rules.return.mode === "locked",
    triggers: applicable
      ? evaluateTransitionConditions(
        rules.return.triggers,
        "trigger",
        context,
      )
      : [],
  };
}

export function summarizeTransitionTime(phases) {
  if (phases.length === 0) {
    return { known: true, seconds: 0 };
  }

  if (phases.some(phase => !phase.timeKnown)) {
    return { known: false, seconds: null };
  }

  return {
    known: true,
    seconds: phases.reduce((sum, phase) => sum + phase.timeSeconds, 0),
  };
}

export function getEffectiveTransitionRules(set, form) {
  return createFormTransitionRules(form.transitionRules ?? set.transitionRules);
}

function calculatePhaseTime(phaseRules) {
  if (phaseRules.baseTimeSeconds === null) {
    return { known: false, seconds: null };
  }

  return {
    known: true,
    seconds: phaseRules.baseTimeSeconds * (2 ** phaseRules.timeStepsDelta),
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
