import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import {
  validateExecutableFormTransitionPlan,
  createFormTransitionPlanFingerprint,
  createExecutionContextFromPlan,
} from "./FormTransitionPlan.js";

function createReadyPlan() {
  const character = createCharacter({
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
                baseTimeSeconds: 5,
                costs: [
                  {
                    id: "cost-fp",
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
                    modifier: -1,
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  });

  return planFormTransition(
    character,
    "set-body",
    "form-wolf",
    {
      testResults: {
        "test-will": "passed",
      },
    },
  );
}

test("validates ready executable plan", () => {
  const plan = createReadyPlan();

  assert.equal(validateExecutableFormTransitionPlan(plan), true);
});

test("rejects non-ready plan", () => {
  const plan = {
    ...createReadyPlan(),
    allowed: false,
    status: "pending",
    reasons: ["pending-test"],
  };

  assert.throws(() => validateExecutableFormTransitionPlan(plan));
});

test("fingerprint ignores instantaneous availability but detects rule changes", () => {
  const plan = createReadyPlan();
  const availabilityChanged = structuredClone(plan);
  availabilityChanged.costs[0].available = 100;
  availabilityChanged.costs[0].payable = true;
  availabilityChanged.costs[0].totalRequired = 2;

  assert.equal(
    createFormTransitionPlanFingerprint(availabilityChanged),
    createFormTransitionPlanFingerprint(plan),
  );

  const ruleChanged = structuredClone(plan);
  ruleChanged.costs[0].amount = 3;

  assert.notEqual(
    createFormTransitionPlanFingerprint(ruleChanged),
    createFormTransitionPlanFingerprint(plan),
  );
});

test("reconstructs resolved execution context from plan", () => {
  const context = createExecutionContextFromPlan(createReadyPlan());

  assert.equal(context.intent, "voluntary");
  assert.equal(context.testResults["test-will"], "passed");
  assert.deepEqual(context.requirementResults, {});
  assert.deepEqual(context.triggerResults, {});
  assert.deepEqual(context.impedimentResults, {});
});
