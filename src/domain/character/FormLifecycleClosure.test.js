import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import { executeFormTransition } from "./FormTransitionExecutor.js";
import { advanceFormLifecycle } from "./FormLifecycle.js";

function createClosureCharacter() {
  return createCharacter({
    identity: {
      id: "char-closure",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 10, maximum: 10 },
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
                    id: "activation-fp",
                    resource: "FP",
                    amount: 2,
                    timing: "activation",
                  },
                  {
                    id: "maintenance-fp",
                    resource: "FP",
                    amount: 1,
                    timing: "maintenance",
                    intervalSeconds: 60,
                  },
                ],
              },
              deactivation: {
                baseTimeSeconds: 1,
                costs: [
                  {
                    id: "return-fp",
                    resource: "FP",
                    amount: 1,
                    timing: "deactivation",
                  },
                ],
              },
              duration: {
                maximumSeconds: 120,
              },
              return: {
                mode: "automatic",
                targetFormId: "form-base",
              },
            },
          },
        ],
      },
    ],
    metadata: {
      createdAt: "2026-06-19T11:00:00.000Z",
      updatedAt: "2026-06-19T11:00:00.000Z",
      source: "singular",
    },
  });
}

test("closes activation runtime maintenance automatic return and history", () => {
  const original = createClosureCharacter();
  const activationPlan = planFormTransition(
    original,
    "set-body",
    "form-wolf",
  );
  const activated = executeFormTransition(
    original,
    activationPlan,
    {
      now: "2026-06-19T12:00:00.000Z",
      executionId: "execution-activate-wolf",
    },
  );

  assert.equal(activated.character.pools.FP.current, 8);
  assert.equal(
    activated.character.alternateFormSets[0].activeFormId,
    "form-wolf",
  );
  assert.equal(
    activated.character.alternateFormSets[0].transitionRuntime.startedAt,
    "2026-06-19T12:00:00.000Z",
  );

  const closed = advanceFormLifecycle(
    activated.character,
    "set-body",
    { now: "2026-06-19T12:02:00.000Z" },
    {
      executeReadyReturn: true,
      executionOptions: {
        executionId: "execution-return-base",
      },
    },
  );

  assert.equal(closed.executionStatus, "executed");
  assert.equal(closed.character.pools.FP.current, 5);
  assert.equal(
    closed.character.alternateFormSets[0].activeFormId,
    "form-base",
  );
  assert.equal(
    closed.character.alternateFormSets[0].transitionRuntime,
    null,
  );
  assert.deepEqual(
    closed.character.formTransitionHistory.map(entry => entry.type),
    [
      "transition-executed",
      "maintenance-charged",
      "return-requested",
      "transition-executed",
    ],
  );
  assert.deepEqual(
    closed.character.formTransitionHistory
      .filter(entry => entry.type === "transition-executed")
      .map(entry => entry.executionId),
    ["execution-activate-wolf", "execution-return-base"],
  );
  assert.equal(
    closed.character.formTransitionHistory[1].data.consumedResources[0].amount,
    2,
  );

  const serialized = serializeCharacter(closed.character);
  const restored = createCharacter(serialized);

  assert.deepEqual(restored, closed.character);
});
