import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  advanceFormTransitionRuntime,
} from "./FormTransitionRuntimeEngine.js";

function createCharacterWithRules(transitionRules) {
  return createCharacter({
    identity: {
      id: "char-runtime-persistence",
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
            transitionRules,
          },
        ],
      },
    ],
  });
}

test("preserves incomplete maintenance without inventing schedule or debit", () => {
  const character = createCharacterWithRules({
    activation: {
      costs: [
        {
          id: "maintenance-unknown-interval",
          resource: "FP",
          amount: 1,
          timing: "maintenance",
          intervalSeconds: null,
        },
      ],
    },
  });

  const result = advanceFormTransitionRuntime(
    character,
    "set-body",
    { now: "2026-06-19T13:00:00.000Z" },
  );
  const runtime = result.character.alternateFormSets[0].transitionRuntime;

  assert.equal(result.character.pools.FP.current, 5);
  assert.deepEqual(result.report.dueMaintenance, []);
  assert.equal(result.report.unscheduledMaintenance.length, 1);
  assert.equal(
    result.report.unscheduledMaintenance[0].reason,
    "unknown-interval",
  );
  assert.equal(runtime.maintenance[0].intervalSeconds, null);
  assert.equal(runtime.maintenance[0].nextDueAt, null);
  assert.equal(runtime.maintenance[0].chargedIntervals, 0);
  assert.equal(result.returnPlan, null);
});

test("keeps a detected return request until the active form changes", () => {
  const character = createCharacterWithRules({
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
  });

  const detected = advanceFormTransitionRuntime(
    character,
    "set-body",
    {
      now: "2026-06-19T12:00:10.000Z",
      triggerResults: {
        "trigger-sunrise": "active",
      },
    },
  );
  const requestedAt = detected.report.returnRequest.requestedAt;

  const repeated = advanceFormTransitionRuntime(
    detected.character,
    "set-body",
    {
      now: "2026-06-19T12:00:20.000Z",
    },
  );
  const request = repeated.character.alternateFormSets[0]
    .transitionRuntime.returnRequest;

  assert.notEqual(request, null);
  assert.equal(request.requestedAt, requestedAt);
  assert.deepEqual(request.reasons, ["return-trigger-active"]);
  assert.deepEqual(request.triggerIds, ["trigger-sunrise"]);
  assert.notEqual(repeated.returnPlan, null);
  assert.equal(repeated.returnPlan.targetFormId, "form-base");
});
