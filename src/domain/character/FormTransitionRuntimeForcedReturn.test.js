import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  advanceFormTransitionRuntime,
} from "./FormTransitionRuntimeEngine.js";

function createCharacterWithForcedReturn({ fp = 5, maximumSeconds = 60 } = {}) {
  return createCharacter({
    identity: {
      id: "char-forced-return",
      name: "Mira",
      concept: "Metamorfa",
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
        activeFormId: "form-wolf",
        activeSince: "2026-06-19T12:00:00.000Z",
        forms: [
          { id: "form-base", name: "Humanoide" },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              activation: {
                costs: [
                  {
                    id: "maintenance-fp",
                    resource: "FP",
                    amount: 1,
                    timing: "maintenance",
                    intervalSeconds: 60,
                  },
                ],
              },
              duration: {
                maximumSeconds,
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
}

test("maximum duration prepares ready return even when configured trigger is unknown", () => {
  const result = advanceFormTransitionRuntime(
    createCharacterWithForcedReturn({ fp: 5, maximumSeconds: 60 }),
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(result.report.status, "expired");
  assert.equal(
    result.report.returnRequest.reasons.includes("maximum-duration-reached"),
    true,
  );
  assert.equal(result.returnPlan.allowed, true);
  assert.equal(result.returnPlan.status, "ready");
  assert.deepEqual(result.returnPlan.unknownTriggers, []);
  assert.deepEqual(result.returnPlan.inactiveTriggers, []);
});

test("unpaid maintenance prepares ready return without requiring unrelated trigger", () => {
  const result = advanceFormTransitionRuntime(
    createCharacterWithForcedReturn({ fp: 0, maximumSeconds: 600 }),
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(result.report.status, "maintenance-unpaid");
  assert.equal(
    result.report.returnRequest.reasons.includes("maintenance-unpaid"),
    true,
  );
  assert.equal(result.returnPlan.allowed, true);
  assert.equal(result.returnPlan.status, "ready");
  assert.deepEqual(result.returnPlan.unknownTriggers, []);
});
