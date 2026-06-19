import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { planFormTransition } from "./FormTransitionPlanner.js";

function createPlannerCharacter({ fp = 5, activeFormId = "form-base" } = {}) {
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
      EnergyReserve: { current: 3, maximum: 5 },
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
            transitionRules: {
              activation: {
                baseTimeSeconds: 5,
                timeStepsDelta: 1,
                maneuver: "Concentrate",
                costs: [
                  {
                    id: "cost-fp",
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
                tests: [
                  {
                    id: "test-will",
                    kind: "attribute",
                    target: "Will",
                    modifier: -2,
                  },
                ],
                requirements: [
                  {
                    id: "req-moon",
                    kind: "environment",
                    description: "Lua visível",
                  },
                ],
                triggers: [
                  {
                    id: "trigger-night",
                    kind: "trigger",
                    description: "Anoitecer",
                  },
                ],
              },
              duration: {
                minimumSeconds: 60,
                maximumSeconds: 3600,
              },
              return: {
                mode: "manual",
                targetFormId: "form-base",
              },
              impediments: [
                {
                  id: "imp-silver",
                  kind: "material",
                  description: "Prata consagrada",
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

function readyContext() {
  return {
    testResults: {
      "test-will": "passed",
    },
    requirementResults: {
      "req-moon": "satisfied",
    },
    triggerResults: {
      "trigger-night": "active",
    },
    impedimentResults: {
      "imp-silver": "inactive",
    },
  };
}

test("builds a ready plan without modifying the character", () => {
  const character = createPlannerCharacter();
  const before = JSON.stringify(character);
  const plan = planFormTransition(
    character,
    "set-body",
    "form-wolf",
    readyContext(),
  );

  assert.equal(plan.allowed, true);
  assert.equal(plan.status, "ready");
  assert.equal(plan.transitionKind, "activation");
  assert.equal(plan.fromFormId, "form-base");
  assert.equal(plan.targetFormId, "form-wolf");
  assert.equal(plan.maneuver, "Concentrate");
  assert.equal(plan.timeKnown, true);
  assert.equal(plan.timeSeconds, 10);
  assert.equal(plan.costs.length, 1);
  assert.equal(plan.costs[0].available, 5);
  assert.equal(plan.costs[0].payable, true);
  assert.equal(plan.requiredTests[0].status, "passed");
  assert.equal(plan.applicableTriggers[0].id, "trigger-night");
  assert.equal(plan.maintenanceCosts[0].id, "maintenance-fp");
  assert.deepEqual(plan.reasons, []);
  assert.equal(JSON.stringify(character), before);
});

test("blocks transition when the total resource is insufficient", () => {
  const plan = planFormTransition(
    createPlannerCharacter({ fp: 1 }),
    "set-body",
    "form-wolf",
    readyContext(),
  );

  assert.equal(plan.allowed, false);
  assert.equal(plan.status, "blocked");
  assert.equal(plan.costs[0].available, 1);
  assert.equal(plan.costs[0].totalRequired, 2);
  assert.equal(plan.costs[0].payable, false);
  assert.deepEqual(plan.reasons, ["insufficient-resource"]);
});

test("returns pending plan while tests and world context are unresolved", () => {
  const plan = planFormTransition(
    createPlannerCharacter(),
    "set-body",
    "form-wolf",
  );

  assert.equal(plan.allowed, false);
  assert.equal(plan.status, "pending");
  assert.equal(plan.requiredTests[0].status, "pending");
  assert.equal(plan.unknownRequirements[0].id, "req-moon");
  assert.equal(plan.unknownImpediments[0].id, "imp-silver");
  assert.equal(plan.unknownTriggers[0].id, "trigger-night");
  assert.equal(plan.reasons.includes("pending-test"), true);
  assert.equal(plan.reasons.includes("unknown-requirement"), true);
  assert.equal(plan.reasons.includes("unknown-impediment"), true);
  assert.equal(plan.reasons.includes("unknown-trigger"), true);
});

test("blocks failed tests unmet requirements active impediments and inactive triggers", () => {
  const plan = planFormTransition(
    createPlannerCharacter(),
    "set-body",
    "form-wolf",
    {
      testResults: { "test-will": false },
      unsatisfiedRequirements: ["req-moon"],
      inactiveTriggers: ["trigger-night"],
      activeImpediments: ["imp-silver"],
    },
  );

  assert.equal(plan.allowed, false);
  assert.equal(plan.status, "blocked");
  assert.equal(plan.reasons.includes("failed-test"), true);
  assert.equal(plan.reasons.includes("unmet-requirement"), true);
  assert.equal(plan.reasons.includes("active-impediment"), true);
  assert.equal(plan.reasons.includes("inactive-trigger"), true);
});

test("allows context resources to override character pools", () => {
  const plan = planFormTransition(
    createPlannerCharacter({ fp: 0 }),
    "set-body",
    "form-wolf",
    {
      ...readyContext(),
      resources: {
        FP: 4,
      },
    },
  );

  assert.equal(plan.allowed, true);
  assert.equal(plan.costs[0].available, 4);
});

test("reports already active without producing phases", () => {
  const plan = planFormTransition(
    createPlannerCharacter({ activeFormId: "form-wolf" }),
    "set-body",
    "form-wolf",
  );

  assert.equal(plan.allowed, false);
  assert.equal(plan.status, "already-active");
  assert.equal(plan.transitionKind, "none");
  assert.deepEqual(plan.phases, []);
  assert.deepEqual(plan.reasons, ["already-active"]);
});

test("rejects invalid identifiers and context", () => {
  const character = createPlannerCharacter();

  assert.throws(() => {
    planFormTransition(character, "missing", "form-wolf");
  });
  assert.throws(() => {
    planFormTransition(character, "set-body", "missing");
  });
  assert.throws(() => {
    planFormTransition(character, "set-body", "form-wolf", {
      intent: "random",
    });
  });
  assert.throws(() => {
    planFormTransition(character, "set-body", "form-wolf", {
      testResults: {
        "test-will": "critical-success",
      },
    });
  });
});
