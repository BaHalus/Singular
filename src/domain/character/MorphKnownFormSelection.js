import {
  materializeMorphKnownForm,
  analyzeMorphKnownFormMaterialization,
} from "./MorphKnownFormMaterialization.js";
import { planFormTransition } from "./FormTransitionPlanner.js";

export function analyzeMorphKnownFormSelection(
  character,
  formSetId,
  knownFormId,
) {
  return analyzeMorphKnownFormMaterialization(
    character,
    formSetId,
    knownFormId,
  );
}

export function prepareMorphKnownFormTransition(
  character,
  formSetId,
  knownFormId,
  context = {},
  options = {},
) {
  const materialization = materializeMorphKnownForm(
    character,
    formSetId,
    knownFormId,
    options,
  );
  const plan = planFormTransition(
    materialization.character,
    formSetId,
    materialization.formId,
    context,
  );

  return {
    character: materialization.character,
    formSetId,
    knownFormId,
    formId: materialization.formId,
    materialization,
    plan,
  };
}
