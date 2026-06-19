import {
  evaluateTransitionConditions,
} from "./FormTransitionPlannerContext.js";
import {
  getEffectiveTransitionRules,
} from "./FormTransitionPlannerEvaluation.js";

export function evaluatePlannedReturnTransition(
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
      !applicable ||
      rules.return.targetFormId === null ||
      targetForm.id === rules.return.targetFormId
    ),
    locked: applicable && rules.return.mode === "locked",
    triggers: applicable && context.bypassReturnTriggers !== true
      ? evaluateTransitionConditions(
        rules.return.triggers,
        "trigger",
        context,
      )
      : [],
  };
}
