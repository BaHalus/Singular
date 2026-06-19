import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  applyResolvedFormTransitionRules,
} from "./FormTransitionRulesResolver.js";

function createCharacterWithForm(modifiers = []) {
  return createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    advantages: [
      {
        id: "adv-wolf",
        name: "Forma Alternativa",
        modifiers,
      },
    ],
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        transitionRules: {
          activation: {
            baseTimeSeconds: 10,
          },
        },
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: "template-wolf",
            sourceTraitId: "adv-wolf",
          },
        ],
      },
    ],
  });
}

test("recomputes from preserved base rules after modifier removal", () => {
  const original = createCharacterWithForm([
    {
      id: "mod-time",
      name: "Gasto Adicional de Tempo",
      levels: 2,
      disabled: false,
    },
  ]);
  const first = applyResolvedFormTransitionRules(
    original,
    "set-body",
    "form-wolf",
    { now: "2026-06-19T12:00:00.000Z" },
  ).character;
  const firstWolf = first.alternateFormSets[0].forms[1];

  assert.equal(firstWolf.transitionRules.activation.baseTimeSeconds, 10);
  assert.equal(firstWolf.transitionRules.activation.timeStepsDelta, 2);
  assert.equal(
    firstWolf.transitionRulesResolution.baseRules.activation.timeStepsDelta,
    0,
  );

  const changed = createCharacter({
    ...first,
    advantages: [
      {
        id: "adv-wolf",
        name: "Forma Alternativa",
        modifiers: [],
      },
    ],
  });
  const second = applyResolvedFormTransitionRules(
    changed,
    "set-body",
    "form-wolf",
    { now: "2026-06-19T13:00:00.000Z" },
  ).character;
  const secondWolf = second.alternateFormSets[0].forms[1];

  assert.equal(secondWolf.transitionRules.activation.baseTimeSeconds, 10);
  assert.equal(secondWolf.transitionRules.activation.timeStepsDelta, 0);
  assert.equal(
    secondWolf.transitionRulesResolution.decisions.scalars.activation.timeStepsDelta.source,
    "existing",
  );
});

test("persists and explicitly clears form transition override", () => {
  const original = createCharacterWithForm();
  const overridden = applyResolvedFormTransitionRules(
    original,
    "set-body",
    "form-wolf",
    {
      now: "2026-06-19T12:00:00.000Z",
      manualOverride: {
        activation: {
          maneuver: "Concentrate",
          costs: [
            {
              id: "cost-fp",
              resource: "FP",
              amount: 2,
              timing: "activation",
            },
          ],
        },
      },
      overrideId: "master-ruling-001",
    },
  ).character;
  const overriddenWolf = overridden.alternateFormSets[0].forms[1];

  assert.equal(overriddenWolf.transitionRules.activation.maneuver, "Concentrate");
  assert.equal(overriddenWolf.transitionRules.activation.costs[0].amount, 2);
  assert.equal(overriddenWolf.transitionRulesOverride.activation.maneuver, "Concentrate");

  const repeated = applyResolvedFormTransitionRules(
    overridden,
    "set-body",
    "form-wolf",
    { now: "2026-06-19T13:00:00.000Z" },
  ).character;
  const repeatedWolf = repeated.alternateFormSets[0].forms[1];

  assert.equal(repeatedWolf.transitionRules.activation.maneuver, "Concentrate");
  assert.equal(
    repeatedWolf.transitionRulesResolution.decisions.scalars.activation.maneuver.source,
    "manual",
  );

  const cleared = applyResolvedFormTransitionRules(
    repeated,
    "set-body",
    "form-wolf",
    {
      now: "2026-06-19T14:00:00.000Z",
      manualOverride: null,
    },
  ).character;
  const clearedWolf = cleared.alternateFormSets[0].forms[1];

  assert.equal(clearedWolf.transitionRulesOverride, null);
  assert.equal(clearedWolf.transitionRules.activation.maneuver, null);
  assert.deepEqual(clearedWolf.transitionRules.activation.costs, []);
  assert.equal(
    clearedWolf.transitionRulesResolution.decisions.scalars.activation.maneuver.source,
    "existing",
  );
});
