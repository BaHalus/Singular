import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  planFormTransition,
  planFormReturn,
} from "./FormTransitionPlanner.js";
import { executeFormTransition } from "./FormTransitionExecutor.js";

test("executor starts runtime for target alternate form and clears it on return", () => {
  const character = createCharacter({
    identity: {
      id: "char-runtime-executor",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 5, maximum: 10 },
    },
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        forms: [
          { id: "form-base", name: "Humanoide" },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              activation: {
                baseTimeSeconds: 1,
                costs: [
                  {
                    id: "maintenance-fp",
                    resource: "FP",
                    amount: 1,
                    timing: "maintenance",
                    intervalSeconds: 60,
                  },
                ],
              },
              return: {
                mode: "manual",
                targetFormId: "form-base",
              },
            },
          },
        ],
      },
    ],
  });

  const activationPlan = planFormTransition(
    character,
    "set-body",
    "form-wolf",
  );
  const activated = executeFormTransition(character, activationPlan, {
    now: "2026-06-19T12:00:00.000Z",
    executionId: "execution-activate",
  });
  const activeSet = activated.character.alternateFormSets[0];

  assert.equal(activeSet.activeFormId, "form-wolf");
  assert.equal(activeSet.transitionRuntime.formId, "form-wolf");
  assert.equal(activeSet.transitionRuntime.startedAt, "2026-06-19T12:00:00.000Z");
  assert.equal(activeSet.transitionRuntime.maintenance[0].costId, "maintenance-fp");
  assert.equal(activated.receipt.runtimeId, activeSet.transitionRuntime.activationId);

  const returnPlan = planFormReturn(activated.character, "set-body");
  const returned = executeFormTransition(activated.character, returnPlan, {
    now: "2026-06-19T12:00:30.000Z",
    executionId: "execution-return",
  });

  assert.equal(returned.character.alternateFormSets[0].activeFormId, "form-base");
  assert.equal(returned.character.alternateFormSets[0].transitionRuntime, null);
  assert.equal(returned.receipt.runtimeId, null);
});
