import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import { executeFormTransition } from "./FormTransitionExecutor.js";

function createHistoryCharacter() {
  return createCharacter({
    identity: {
      id: "char-history",
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
                    id: "cost-fp",
                    resource: "FP",
                    amount: 2,
                    timing: "activation",
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
}

test("successful execution appends immutable receipt history", () => {
  const character = createHistoryCharacter();
  const plan = planFormTransition(
    character,
    "set-body",
    "form-wolf",
  );
  const result = executeFormTransition(character, plan, {
    now: "2026-06-19T12:00:00.000Z",
    executionId: "execution-history-001",
  });
  const entry = result.character.formTransitionHistory[0];

  assert.deepEqual(character.formTransitionHistory, []);
  assert.equal(entry.type, "transition-executed");
  assert.equal(entry.executionId, "execution-history-001");
  assert.equal(entry.characterId, "char-history");
  assert.equal(entry.fromFormId, "form-base");
  assert.equal(entry.targetFormId, "form-wolf");
  assert.equal(entry.data.id, "execution-history-001");
  assert.equal(entry.data.consumedResources[0].amount, 2);

  const serialized = serializeCharacter(result.character);
  assert.equal(
    serialized.formTransitionHistory[0].executionId,
    "execution-history-001",
  );
});

test("activation and return produce ordered persistent receipts", () => {
  const original = createHistoryCharacter();
  const activation = executeFormTransition(
    original,
    planFormTransition(original, "set-body", "form-wolf"),
    {
      now: "2026-06-19T12:00:00.000Z",
      executionId: "execution-activation",
    },
  );
  const returnPlan = planFormTransition(
    activation.character,
    "set-body",
    "form-base",
  );
  const returned = executeFormTransition(
    activation.character,
    returnPlan,
    {
      now: "2026-06-19T12:01:00.000Z",
      executionId: "execution-return",
    },
  );

  assert.deepEqual(
    returned.character.formTransitionHistory.map(entry => entry.executionId),
    ["execution-activation", "execution-return"],
  );
  assert.deepEqual(
    returned.character.formTransitionHistory.map(entry => entry.targetFormId),
    ["form-wolf", "form-base"],
  );
});
