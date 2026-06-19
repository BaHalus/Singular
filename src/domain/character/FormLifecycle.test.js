import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  advanceFormLifecycle,
  advanceAllFormLifecycles,
} from "./FormLifecycle.js";

function createLifecycleCharacter({ pendingTest = false } = {}) {
  return createCharacter({
    identity: {
      id: "char-lifecycle-closure",
      name: "Eldrin",
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
        activeFormId: "form-wolf",
        activeSince: "2026-06-19T12:00:00.000Z",
        forms: [
          { id: "form-base", name: "Humanoide" },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              deactivation: {
                baseTimeSeconds: 1,
                tests: pendingTest
                  ? [
                    {
                      id: "test-return",
                      kind: "attribute",
                      target: "Will",
                      modifier: 0,
                    },
                  ]
                  : [],
              },
              duration: {
                maximumSeconds: 60,
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
  });
}

test("default lifecycle only prepares return and never changes form silently", () => {
  const result = advanceFormLifecycle(
    createLifecycleCharacter(),
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(result.executionStatus, "prepared");
  assert.equal(result.execution, null);
  assert.equal(result.returnPlan.allowed, true);
  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-wolf");
  assert.deepEqual(
    result.character.formTransitionHistory.map(entry => entry.type),
    ["return-requested"],
  );
});

test("explicit lifecycle execution completes ready automatic return", () => {
  const result = advanceFormLifecycle(
    createLifecycleCharacter(),
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
    {
      executeReadyReturn: true,
      executionOptions: {
        executionId: "execution-runtime-return",
      },
    },
  );

  assert.equal(result.executionStatus, "executed");
  assert.equal(result.execution.receipt.id, "execution-runtime-return");
  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-base");
  assert.equal(result.character.alternateFormSets[0].transitionRuntime, null);
  assert.deepEqual(
    result.character.formTransitionHistory.map(entry => entry.type),
    ["return-requested", "transition-executed"],
  );
  assert.equal(
    result.character.formTransitionHistory[1].executionId,
    "execution-runtime-return",
  );
});

test("explicit execution does not force a pending return plan", () => {
  const result = advanceFormLifecycle(
    createLifecycleCharacter({ pendingTest: true }),
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
    { executeReadyReturn: true },
  );

  assert.equal(result.executionStatus, "not-ready");
  assert.equal(result.execution, null);
  assert.equal(result.returnPlan.status, "pending");
  assert.equal(result.returnPlan.reasons.includes("pending-test"), true);
  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-wolf");
});

test("all-set lifecycle reports executions and pending plans separately", () => {
  const body = createLifecycleCharacter().alternateFormSets[0];
  const character = createCharacter({
    ...createLifecycleCharacter(),
    alternateFormSets: [
      body,
      {
        id: "set-armor",
        name: "Revestimento",
        baseFormId: "armor-base",
        activeFormId: "armor-active",
        activeSince: "2026-06-19T12:00:00.000Z",
        forms: [
          { id: "armor-base", name: "Sem revestimento" },
          {
            id: "armor-active",
            name: "Blindado",
            transitionRules: {
              deactivation: {
                tests: [
                  {
                    id: "test-armor-return",
                    kind: "attribute",
                    target: "HT",
                    modifier: 0,
                  },
                ],
              },
              duration: { maximumSeconds: 60 },
              return: {
                mode: "automatic",
                targetFormId: "armor-base",
              },
            },
          },
        ],
      },
    ],
  });
  const result = advanceAllFormLifecycles(
    character,
    { now: "2026-06-19T12:01:00.000Z" },
    {
      executeReadyReturns: true,
      executionOptionsBySet: {
        "set-body": { executionId: "execution-body-return" },
      },
    },
  );

  assert.equal(result.executions.length, 1);
  assert.equal(result.executions[0].receipt.id, "execution-body-return");
  assert.equal(result.pendingReturnPlans.length, 1);
  assert.equal(result.pendingReturnPlans[0].formSetId, "set-armor");
  assert.equal(
    result.character.alternateFormSets.find(set => set.id === "set-body").activeFormId,
    "form-base",
  );
  assert.equal(
    result.character.alternateFormSets.find(set => set.id === "set-armor").activeFormId,
    "armor-active",
  );
});
