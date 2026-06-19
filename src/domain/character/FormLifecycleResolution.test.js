import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { advanceFormLifecycle } from "./FormLifecycle.js";

function createPendingReturnCharacter() {
  return createCharacter({
    identity: {
      id: "char-lifecycle-resolution",
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
              deactivation: {
                tests: [
                  {
                    id: "test-return",
                    kind: "attribute",
                    target: "Will",
                    modifier: -2,
                  },
                ],
              },
              duration: { maximumSeconds: 60 },
              return: {
                mode: "automatic",
                targetFormId: "form-base",
              },
            },
          },
        ],
      },
    ],
  });
}

test("execution context can resolve a pending runtime return", () => {
  const result = advanceFormLifecycle(
    createPendingReturnCharacter(),
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
    {
      executeReadyReturn: true,
      executionOptions: {
        executionId: "execution-resolved-return",
        context: {
          testResults: {
            "test-return": "passed",
          },
        },
      },
    },
  );

  assert.equal(result.executionStatus, "executed");
  assert.equal(result.returnPlan.status, "ready");
  assert.equal(result.returnPlan.requiredTests[0].status, "passed");
  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-base");
  assert.equal(result.execution.receipt.id, "execution-resolved-return");
});
