import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import {
  executeFormTransition,
  FormTransitionExecutionError,
} from "./FormTransitionExecutor.js";

function createSimpleCharacter(id) {
  return createCharacter({
    identity: {
      id,
      name: id,
      concept: "Metamorfo",
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
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              activation: {
                baseTimeSeconds: 1,
              },
            },
          },
        ],
      },
    ],
  });
}

test("rejects plan created for another character", () => {
  const first = createSimpleCharacter("char-first");
  const second = createSimpleCharacter("char-second");
  const plan = planFormTransition(
    first,
    "set-body",
    "form-wolf",
  );

  assert.equal(plan.characterId, "char-first");

  assert.throws(
    () => executeFormTransition(second, plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "PLAN_CHARACTER_MISMATCH" &&
      error.details.planCharacterId === "char-first" &&
      error.details.characterId === "char-second"
    ),
  );

  assert.equal(second.alternateFormSets[0].activeFormId, "form-base");
});
