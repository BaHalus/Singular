import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  planFormTransition,
  planFormReturn,
} from "./FormTransitionPlanner.js";
import {
  executeFormTransition,
  FormTransitionExecutionError,
} from "./FormTransitionExecutor.js";

function createExecutorCharacter({
  fp = 5,
  activeFormId = "form-base",
  targetTemplateId = null,
  wolfBaseTime = 5,
} = {}) {
  return createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: fp, maximum: 10 },
    },
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId,
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: targetTemplateId,
            transitionRules: {
              activation: {
                baseTimeSeconds: wolfBaseTime,
                maneuver: "Concentrate",
                costs: [
                  {
                    id: "cost-wolf-fp",
                    resource: "FP",
                    amount: 2,
                    timing: "activation",
                  },
                ],
                tests: [
                  {
                    id: "test-will",
                    kind: "attribute",
                    target: "Will",
                    modifier: -2,
                  },
                ],
              },
              deactivation: {
                baseTimeSeconds: 1,
                costs: [
                  {
                    id: "cost-return-fp",
                    resource: "FP",
                    amount: 1,
                    timing: "deactivation",
                  },
                ],
              },
              return: {
                mode: "manual",
                targetFormId: "form-base",
              },
            },
          },
          {
            id: "form-bat",
            name: "Morcego",
            transitionRules: {
              activation: {
                baseTimeSeconds: 2,
                costs: [
                  {
                    id: "cost-bat-fp",
                    resource: "FP",
                    amount: 2,
                    timing: "activation",
                  },
                ],
              },
            },
          },
        ],
      },
    ],
    metadata: {
      createdAt: "2026-06-19T08:00:00.000Z",
      updatedAt: "2026-06-19T08:00:00.000Z",
      source: "singular",
    },
  });
}

function readyContext() {
  return {
    testResults: {
      "test-will": "passed",
    },
  };
}

test("executes ready plan atomically and returns receipt", () => {
  const character = createExecutorCharacter();
  const plan = planFormTransition(
    character,
    "set-body",
    "form-wolf",
    readyContext(),
  );
  const result = executeFormTransition(character, plan, {
    now: "2026-06-19T12:00:00.000Z",
    executionId: "execution-001",
  });

  assert.equal(plan.allowed, true);
  assert.equal(character.pools.FP.current, 5);
  assert.equal(character.alternateFormSets[0].activeFormId, "form-base");

  assert.equal(result.character.pools.FP.current, 3);
  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-wolf");
  assert.equal(
    result.character.metadata.updatedAt,
    "2026-06-19T12:00:00.000Z",
  );

  assert.equal(result.receipt.id, "execution-001");
  assert.equal(result.receipt.characterId, "char-001");
  assert.equal(result.receipt.fromFormId, "form-base");
  assert.equal(result.receipt.targetFormId, "form-wolf");
  assert.equal(result.receipt.transitionKind, "activation");
  assert.equal(result.receipt.consumedResources[0].resourceKey, "FP");
  assert.equal(result.receipt.consumedResources[0].amount, 2);
  assert.equal(result.receipt.consumedResources[0].before, 5);
  assert.equal(result.receipt.consumedResources[0].after, 3);
  assert.deepEqual(result.receipt.consumedCostIds, ["cost-wolf-fp"]);
});

test("rejects a pending or blocked plan before any mutation", () => {
  const character = createExecutorCharacter();
  const pending = planFormTransition(
    character,
    "set-body",
    "form-wolf",
  );
  const before = JSON.stringify(character);

  assert.throws(
    () => executeFormTransition(character, pending),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "PLAN_NOT_READY"
    ),
  );

  assert.equal(JSON.stringify(character), before);
});

test("revalidates resources against the current character", () => {
  const original = createExecutorCharacter({ fp: 5 });
  const plan = planFormTransition(
    original,
    "set-body",
    "form-wolf",
    readyContext(),
  );
  const changed = createCharacter({
    ...original,
    pools: {
      ...original.pools,
      FP: {
        ...original.pools.FP,
        current: 1,
      },
    },
  });
  const before = JSON.stringify(changed);

  assert.throws(
    () => executeFormTransition(changed, plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "REVALIDATION_FAILED" &&
      error.details.reasons.includes("insufficient-resource")
    ),
  );

  assert.equal(JSON.stringify(changed), before);
});

test("rejects stale plan when effective rules changed", () => {
  const original = createExecutorCharacter({ wolfBaseTime: 5 });
  const plan = planFormTransition(
    original,
    "set-body",
    "form-wolf",
    readyContext(),
  );
  const changed = createCharacter({
    ...original,
    alternateFormSets: original.alternateFormSets.map(set => ({
      ...set,
      forms: set.forms.map(form => (
        form.id === "form-wolf"
          ? {
            ...form,
            transitionRules: {
              ...form.transitionRules,
              activation: {
                ...form.transitionRules.activation,
                baseTimeSeconds: 10,
              },
            },
          }
          : form
      )),
    })),
  });

  assert.throws(
    () => executeFormTransition(changed, plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "PLAN_STALE"
    ),
  );
});

test("does not expose partially consumed resources when activation fails", () => {
  const character = createExecutorCharacter({
    fp: 5,
    targetTemplateId: "missing-template",
  });
  const plan = planFormTransition(
    character,
    "set-body",
    "form-wolf",
    readyContext(),
  );
  const before = JSON.stringify(character);

  assert.throws(
    () => executeFormTransition(character, plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "TRANSITION_FAILED"
    ),
  );

  assert.equal(JSON.stringify(character), before);
  assert.equal(character.pools.FP.current, 5);
  assert.equal(character.alternateFormSets[0].activeFormId, "form-base");
});

test("cannot execute the same plan twice", () => {
  const character = createExecutorCharacter();
  const plan = planFormTransition(
    character,
    "set-body",
    "form-wolf",
    readyContext(),
  );
  const first = executeFormTransition(character, plan);

  assert.throws(
    () => executeFormTransition(first.character, plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "PLAN_STALE"
    ),
  );
});

test("executes a planned return and consumes deactivation cost", () => {
  const character = createExecutorCharacter({
    fp: 5,
    activeFormId: "form-wolf",
  });
  const plan = planFormReturn(character, "set-body");
  const result = executeFormTransition(character, plan, {
    now: "2026-06-19T13:00:00.000Z",
  });

  assert.equal(plan.transitionKind, "deactivation");
  assert.equal(plan.allowed, true);
  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-base");
  assert.equal(result.character.pools.FP.current, 4);
  assert.equal(result.receipt.transitionKind, "deactivation");
  assert.deepEqual(result.receipt.consumedCostIds, ["cost-return-fp"]);
});
