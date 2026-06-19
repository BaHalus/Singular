import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  planFormTransition,
  planFormReturn,
} from "./FormTransitionPlanner.js";

function createSwitchCharacter({ returnMode = "manual" } = {}) {
  return createCharacter({
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 4, maximum: 10 },
    },
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              deactivation: {
                baseTimeSeconds: 2,
                maneuver: "Ready",
                costs: [
                  {
                    id: "cost-wolf-exit",
                    resource: "FP",
                    amount: 1,
                    timing: "deactivation",
                  },
                ],
              },
              return: {
                mode: returnMode,
                targetFormId: "form-base",
                triggers: [
                  {
                    id: "return-sunrise",
                    description: "Nascer do sol",
                  },
                ],
              },
            },
          },
          {
            id: "form-bat",
            name: "Morcego",
            transitionRules: {
              activation: {
                baseTimeSeconds: 4,
                maneuver: "Concentrate",
                costs: [
                  {
                    id: "cost-bat-entry",
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
  });
}

test("plans switch as deactivation plus activation without treating return target as a blocker", () => {
  const plan = planFormTransition(
    createSwitchCharacter(),
    "set-body",
    "form-bat",
  );

  assert.equal(plan.allowed, true);
  assert.equal(plan.status, "ready");
  assert.equal(plan.transitionKind, "switch");
  assert.equal(plan.phases.length, 2);
  assert.equal(plan.phases[0].kind, "deactivation");
  assert.equal(plan.phases[1].kind, "activation");
  assert.deepEqual(plan.maneuvers, ["Ready", "Concentrate"]);
  assert.equal(plan.maneuver, null);
  assert.equal(plan.timeKnown, true);
  assert.equal(plan.timeSeconds, 6);
  assert.equal(plan.costs.length, 2);
  assert.equal(plan.costs[0].totalRequired, 3);
  assert.equal(plan.costs[1].totalRequired, 3);
  assert.equal(plan.costs[0].payable, true);
  assert.equal(plan.reasons.includes("invalid-return-target"), false);
});

test("aggregates equal resources across both switch phases", () => {
  const character = createSwitchCharacter();
  character.pools.FP.current = 2;

  const plan = planFormTransition(
    character,
    "set-body",
    "form-bat",
  );

  assert.equal(plan.allowed, false);
  assert.equal(plan.status, "blocked");
  assert.equal(plan.costs.every(cost => cost.payable === false), true);
  assert.equal(plan.reasons.includes("insufficient-resource"), true);
});

test("plans return to configured form and checks return trigger", () => {
  const pending = planFormReturn(
    createSwitchCharacter({ returnMode: "automatic" }),
    "set-body",
  );

  assert.equal(pending.targetFormId, "form-base");
  assert.equal(pending.transitionKind, "deactivation");
  assert.equal(pending.status, "pending");
  assert.equal(pending.unknownTriggers[0].id, "return-sunrise");

  const ready = planFormReturn(
    createSwitchCharacter({ returnMode: "automatic" }),
    "set-body",
    {
      triggerResults: {
        "return-sunrise": "active",
      },
    },
  );

  assert.equal(ready.allowed, true);
  assert.equal(ready.return.evaluation.mode, "automatic");
  assert.equal(ready.applicableTriggers[0].id, "return-sunrise");
});

test("blocks a locked return", () => {
  const plan = planFormReturn(
    createSwitchCharacter({ returnMode: "locked" }),
    "set-body",
    {
      activeTriggers: ["return-sunrise"],
    },
  );

  assert.equal(plan.allowed, false);
  assert.equal(plan.status, "blocked");
  assert.equal(plan.reasons.includes("return-locked"), true);
});

test("unknown time is optional unless the caller requires it", () => {
  const character = createSwitchCharacter();
  character.alternateFormSets[0].forms[2].transitionRules.activation.baseTimeSeconds = null;

  const optional = planFormTransition(
    character,
    "set-body",
    "form-bat",
  );

  assert.equal(optional.allowed, true);
  assert.equal(optional.timeKnown, false);
  assert.equal(optional.timeSeconds, null);

  const required = planFormTransition(
    character,
    "set-body",
    "form-bat",
    {
      requireKnownTime: true,
    },
  );

  assert.equal(required.allowed, false);
  assert.equal(required.status, "pending");
  assert.equal(required.reasons.includes("unknown-time"), true);
});
