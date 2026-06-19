import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  prepareMorphKnownFormTransition,
} from "./MorphKnownFormSelection.js";
import {
  materializeMorphKnownForm,
} from "./MorphKnownFormMaterialization.js";
import {
  setMorphKnownFormAvailability,
  forgetMorphKnownForm,
} from "./MorphCatalogOperations.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import {
  executeFormTransition,
  FormTransitionExecutionError,
} from "./FormTransitionExecutor.js";

function createMorphCharacter() {
  return createCharacter({
    identity: {
      id: "char-morph-selection",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 10, maximum: 10 },
    },
    advantages: [
      {
        id: "adv-morph",
        name: "Morfose",
      },
    ],
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Lobo",
        importedPoints: 45,
        traits: {
          advantages: [
            {
              id: "adv-night-vision",
              name: "Visão Noturna",
            },
          ],
        },
        skills: [
          {
            id: "skill-tracking",
            name: "Rastreamento",
          },
        ],
      },
    ],
    alternateFormSets: [
      {
        id: "set-morph",
        name: "Morfose",
        mechanism: "morph",
        sourceTraitId: "adv-morph",
        baseFormId: "form-base",
        activeFormId: "form-base",
        forms: [
          {
            id: "form-base",
            name: "Forma natural",
          },
        ],
        transitionRules: {
          activation: {
            baseTimeSeconds: 1,
          },
        },
        morphProfile: {
          pointLimit: 50,
          pointLimitSource: "manual",
          knownForms: [
            {
              id: "known-wolf",
              templateId: "template-wolf",
              name: "Lobo",
              acquisitionMethod: "observed",
              state: "available",
            },
          ],
        },
      },
    ],
  });
}

test("prepares a ready transition after materializing the selected known form", () => {
  const prepared = prepareMorphKnownFormTransition(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
    {},
    { now: "2026-06-19T18:00:00.000Z" },
  );

  assert.equal(prepared.materialization.status, "materialized");
  assert.equal(prepared.plan.allowed, true);
  assert.equal(prepared.plan.status, "ready");
  assert.equal(prepared.plan.targetFormId, prepared.formId);
  assert.equal(prepared.plan.targetTemplateId, "template-wolf");
  assert.equal(prepared.plan.morphSelection.knownFormId, "known-wolf");
  assert.equal(prepared.plan.morphSelection.status, "ready");
  assert.deepEqual(prepared.plan.morphSelection.reasons, []);
  assert.equal(
    prepared.plan.morphSelection.pointLimitEvaluation.enforced,
    false,
  );
});

test("executes a prepared known-form transition through the existing executor", () => {
  const prepared = prepareMorphKnownFormTransition(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
    {},
    { now: "2026-06-19T18:00:00.000Z" },
  );
  const executed = executeFormTransition(
    prepared.character,
    prepared.plan,
    {
      now: "2026-06-19T18:00:01.000Z",
      executionId: "execution-morph-wolf",
      activationId: "activation-morph-wolf",
    },
  );
  const set = executed.character.alternateFormSets[0];

  assert.equal(set.activeFormId, prepared.formId);
  assert.equal(set.activeActivationId, "activation-morph-wolf");
  assert.equal(
    executed.character.advantages.some(advantage => (
      advantage.name === "Visão Noturna" &&
      advantage.importMeta?.alternateFormSetId === "set-morph"
    )),
    true,
  );
  assert.equal(
    executed.character.skills.some(skill => (
      skill.name === "Rastreamento" &&
      skill.importMeta?.alternateFormId === prepared.formId
    )),
    true,
  );
  assert.equal(executed.receipt.targetFormId, prepared.formId);
  assert.equal(
    executed.character.formTransitionHistory.some(event => (
      event.executionId === "execution-morph-wolf"
    )),
    true,
  );
});

test("generic planner blocks a materialized form that becomes unavailable", () => {
  const materialized = materializeMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
    { now: "2026-06-19T18:00:00.000Z" },
  );
  const unavailable = setMorphKnownFormAvailability(
    materialized.character,
    "set-morph",
    "known-wolf",
    false,
    { now: "2026-06-19T18:05:00.000Z" },
  );
  const plan = planFormTransition(
    unavailable,
    "set-morph",
    materialized.formId,
  );

  assert.equal(plan.allowed, false);
  assert.equal(plan.status, "blocked");
  assert.equal(plan.reasons.includes("morph-known-form-unavailable"), true);
  assert.equal(plan.morphSelection.knownFormState, "unavailable");
});

test("generic planner blocks a forgotten materialized form", () => {
  const materialized = materializeMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
  );
  const forgotten = forgetMorphKnownForm(
    materialized.character,
    "set-morph",
    "known-wolf",
  );
  const plan = planFormTransition(
    forgotten,
    "set-morph",
    materialized.formId,
  );

  assert.equal(plan.status, "blocked");
  assert.equal(plan.reasons.includes("morph-known-form-forgotten"), true);
});

test("executor revalidation rejects a known form disabled after planning", () => {
  const prepared = prepareMorphKnownFormTransition(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
  );
  const unavailable = setMorphKnownFormAvailability(
    prepared.character,
    "set-morph",
    "known-wolf",
    false,
  );

  assert.throws(
    () => executeFormTransition(unavailable, prepared.plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "REVALIDATION_FAILED" &&
      error.details.reasons.includes("morph-known-form-unavailable")
    ),
  );
});

test("template changes invalidate a planned materialized form", () => {
  const prepared = prepareMorphKnownFormTransition(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
  );
  const changed = createCharacter({
    ...prepared.character,
    templates: prepared.character.templates.map(template => (
      template.id === "template-wolf"
        ? { ...template, notes: "Template revisado depois do plano." }
        : template
    )),
  });
  const currentPlan = planFormTransition(
    changed,
    "set-morph",
    prepared.formId,
  );

  assert.equal(currentPlan.status, "blocked");
  assert.equal(currentPlan.reasons.includes("morph-materialization-stale"), true);
  assert.throws(
    () => executeFormTransition(changed, prepared.plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "REVALIDATION_FAILED"
    ),
  );
});
