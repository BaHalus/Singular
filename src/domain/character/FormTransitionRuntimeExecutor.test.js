import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  advanceFormTransitionRuntime,
} from "./FormTransitionRuntimeEngine.js";
import {
  executeFormTransition,
} from "./FormTransitionExecutor.js";

test("runtime-forced return remains executable through executor revalidation", () => {
  const character = createCharacter({
    identity: {
      id: "char-forced-execution",
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
        activeFormId: "form-wolf",
        activeSince: "2026-06-19T12:00:00.000Z",
        forms: [
          { id: "form-base", name: "Humanoide" },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              duration: {
                maximumSeconds: 60,
              },
              return: {
                mode: "automatic",
                targetFormId: "form-base",
                triggers: [
                  {
                    id: "trigger-sunrise",
                    description: "Nascer do sol",
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  });

  const advanced = advanceFormTransitionRuntime(
    character,
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(advanced.returnPlan.allowed, true);
  assert.equal(advanced.returnPlan.bypassReturnTriggers, true);

  const executed = executeFormTransition(
    advanced.character,
    advanced.returnPlan,
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(executed.character.alternateFormSets[0].activeFormId, "form-base");
  assert.equal(executed.character.alternateFormSets[0].transitionRuntime, null);
  assert.equal(executed.receipt.intent, "automatic");
});
