import { evaluateTransitionCosts } from "./FormTransitionPlannerResources.js";
import { validateTransitionContext } from "./FormTransitionPlannerContext.js";
import {
  buildTransitionPhases,
  evaluateTransitionPhase,
  summarizeTransitionTime,
  getEffectiveTransitionRules,
} from "./FormTransitionPlannerEvaluation.js";
import {
  evaluatePlannedReturnTransition,
} from "./FormTransitionPlannerReturnEvaluation.js";
import {
  evaluateMaterializedMorphTarget,
} from "./MorphKnownFormMaterialization.js";
import { evaluateMorphImprovisedTarget } from "./MorphImprovisation.js";
import {
  applyMorphPointLimitToSelection,
  evaluateMorphTargetPointLimit,
} from "./MorphPointLimit.js";

const HARD_REASONS = new Set([
  "insufficient-resource",
  "failed-test",
  "unmet-requirement",
  "active-impediment",
  "inactive-trigger",
  "return-locked",
  "invalid-return-target",
  "morph-known-form-not-found",
  "morph-known-form-unavailable",
  "morph-known-form-forgotten",
  "morph-known-form-template-missing",
  "morph-materialization-stale",
  "morph-materialization-invalid",
  "morph-improvisation-forbidden",
  "morph-improvisation-conditions-unsatisfied",
  "morph-improvisation-nonphysical-characteristic",
  "morph-improvisation-characteristic-not-in-setting",
  "morph-improvisation-composition-change-forbidden",
  "morph-improvisation-policy-stale",
  "morph-improvisation-projection-invalid",
  "morph-point-limit-exceeded",
  "morph-improvisation-point-limit-exceeded",
]);

export function planFormTransition(
  character,
  formSetId,
  targetFormId,
  context = {},
) {
  validateCharacter(character);
  validateTransitionContext(context);

  const set = findFormSet(character, formSetId);
  if (!set) throw new Error("Alternate form set not found");

  const fromForm = findForm(set, set.activeFormId);
  if (!fromForm) throw new Error("Alternate form set active form not found");

  const targetForm = findForm(set, targetFormId);
  if (!targetForm) throw new Error("Alternate form target not found");

  const intent = context.intent ?? "voluntary";
  const bypassReturnTriggers = context.bypassReturnTriggers === true;
  const rawMorphSelection = evaluateMorphImprovisedTarget(set, targetForm) ??
    evaluateMaterializedMorphTarget(
      character,
      set,
      targetForm,
    );
  const morphSelection = applyMorphPointLimitToSelection(
    rawMorphSelection,
    evaluateMorphTargetPointLimit(character, set, targetForm),
  );

  if (fromForm.id === targetForm.id) {
    return createAlreadyActivePlan(
      character,
      set,
      fromForm,
      intent,
      bypassReturnTriggers,
      morphSelection,
    );
  }

  const phases = buildTransitionPhases(set, fromForm, targetForm)
    .map(phase => evaluateTransitionPhase(phase, context));
  const returnEvaluation = evaluatePlannedReturnTransition(
    set,
    fromForm,
    targetForm,
    context,
  );
  const costs = evaluateTransitionCosts(
    character,
    phases.flatMap(phase => phase.costs),
    context,
  );
  const requiredTests = phases.flatMap(phase => phase.tests);
  const requirements = phases.flatMap(phase => phase.requirements);
  const impediments = phases.flatMap(phase => phase.impediments);
  const triggers = [
    ...phases.flatMap(phase => phase.triggers),
    ...returnEvaluation.triggers,
  ];
  const time = summarizeTransitionTime(phases);
  const reasons = collectReasons({
    costs,
    tests: requiredTests,
    requirements,
    impediments,
    triggers,
    returnEvaluation,
    morphSelection,
    timeKnown: time.known,
    requireKnownTime: context.requireKnownTime === true,
  });
  const status = determineStatus(reasons);
  const maneuvers = uniqueStrings(
    phases.map(phase => phase.maneuver).filter(Boolean),
  );
  const targetRules = getEffectiveTransitionRules(set, targetForm);

  return {
    characterId: character.identity.id,
    allowed: status === "ready",
    status,
    intent,
    bypassReturnTriggers,
    transitionKind: determineTransitionKind(set, fromForm, targetForm),

    formSetId: set.id,
    fromFormId: fromForm.id,
    targetFormId: targetForm.id,
    targetTemplateId: targetForm.templateId,
    morphSelection: cloneValue(morphSelection),

    maneuver: maneuvers.length === 1 ? maneuvers[0] : null,
    maneuvers,
    timeSeconds: time.seconds,
    timeKnown: time.known,

    phases,
    costs,
    maintenanceCosts: collectMaintenanceCosts(targetRules),
    requiredTests,

    unmetRequirements: requirements.filter(item => item.status === "unsatisfied"),
    unknownRequirements: requirements.filter(item => item.status === "unknown"),
    activeImpediments: impediments.filter(item => item.status === "active"),
    unknownImpediments: impediments.filter(item => item.status === "unknown"),
    applicableTriggers: triggers.filter(item => item.status === "active"),
    inactiveTriggers: triggers.filter(item => item.status === "inactive"),
    unknownTriggers: triggers.filter(item => item.status === "unknown"),

    duration: cloneValue(targetRules.duration),
    return: {
      ...cloneValue(targetRules.return),
      evaluation: returnEvaluation,
    },

    reasons,
  };
}

export function planFormReturn(character, formSetId, context = {}) {
  validateCharacter(character);
  validateTransitionContext(context);

  const set = findFormSet(character, formSetId);
  if (!set) throw new Error("Alternate form set not found");

  const activeForm = findForm(set, set.activeFormId);
  if (!activeForm) throw new Error("Alternate form set active form not found");

  const rules = getEffectiveTransitionRules(set, activeForm);

  return planFormTransition(
    character,
    formSetId,
    rules.return.targetFormId ?? set.baseFormId,
    context,
  );
}

function collectReasons(input) {
  const reasons = [];

  if (input.costs.some(cost => cost.payable === false)) reasons.push("insufficient-resource");
  if (input.costs.some(cost => cost.amount === null)) reasons.push("unknown-cost");
  if (input.costs.some(cost => cost.resourceKey === null || cost.available === null)) {
    reasons.push("unknown-resource");
  }
  if (input.tests.some(test => test.status === "failed")) reasons.push("failed-test");
  if (input.tests.some(test => test.status === "pending")) reasons.push("pending-test");
  if (input.requirements.some(item => item.status === "unsatisfied")) {
    reasons.push("unmet-requirement");
  }
  if (input.requirements.some(item => item.status === "unknown")) {
    reasons.push("unknown-requirement");
  }
  if (input.impediments.some(item => item.status === "active")) {
    reasons.push("active-impediment");
  }
  if (input.impediments.some(item => item.status === "unknown")) {
    reasons.push("unknown-impediment");
  }
  if (input.triggers.some(item => item.status === "inactive")) {
    reasons.push("inactive-trigger");
  }
  if (input.triggers.some(item => item.status === "unknown")) {
    reasons.push("unknown-trigger");
  }
  if (input.returnEvaluation.locked) reasons.push("return-locked");
  if (!input.returnEvaluation.targetMatches) reasons.push("invalid-return-target");
  if (input.requireKnownTime && !input.timeKnown) reasons.push("unknown-time");
  if (input.morphSelection !== null) {
    reasons.push(...input.morphSelection.reasons);
  }

  return [...new Set(reasons)];
}

function determineStatus(reasons) {
  if (reasons.some(reason => HARD_REASONS.has(reason))) return "blocked";
  return reasons.length > 0 ? "pending" : "ready";
}

function determineTransitionKind(set, fromForm, targetForm) {
  if (targetForm.id === set.baseFormId) return "deactivation";
  if (fromForm.id === set.baseFormId) return "activation";
  return "switch";
}

function createAlreadyActivePlan(
  character,
  set,
  form,
  intent,
  bypassReturnTriggers,
  morphSelection,
) {
  const rules = getEffectiveTransitionRules(set, form);

  return {
    characterId: character.identity.id,
    allowed: false,
    status: "already-active",
    intent,
    bypassReturnTriggers,
    transitionKind: "none",
    formSetId: set.id,
    fromFormId: form.id,
    targetFormId: form.id,
    targetTemplateId: form.templateId,
    morphSelection: cloneValue(morphSelection),
    maneuver: null,
    maneuvers: [],
    timeSeconds: 0,
    timeKnown: true,
    phases: [],
    costs: [],
    maintenanceCosts: collectMaintenanceCosts(rules),
    requiredTests: [],
    unmetRequirements: [],
    unknownRequirements: [],
    activeImpediments: [],
    unknownImpediments: [],
    applicableTriggers: [],
    inactiveTriggers: [],
    unknownTriggers: [],
    duration: cloneValue(rules.duration),
    return: {
      ...cloneValue(rules.return),
      evaluation: null,
    },
    reasons: ["already-active"],
  };
}

function collectMaintenanceCosts(rules) {
  return [
    ...rules.activation.costs,
    ...rules.deactivation.costs,
  ].filter(cost => cost.timing === "maintenance").map(cloneValue);
}

function findFormSet(character, formSetId) {
  return character.alternateFormSets.find(set => set.id === formSetId) ?? null;
}

function findForm(set, formId) {
  return set.forms.find(form => form.id === formId) ?? null;
}

function validateCharacter(character) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new Error("Character must be object");
  }
  if (!character.identity || typeof character.identity.id !== "string" || character.identity.id === "") {
    throw new Error("Character identity.id must be non-empty string");
  }
  if (!Array.isArray(character.alternateFormSets)) {
    throw new Error("Character alternateFormSets must be array");
  }
  if (!Array.isArray(character.templates)) {
    throw new Error("Character templates must be array");
  }
  if (!character.pools || typeof character.pools !== "object") {
    throw new Error("Character pools must be object");
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
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
