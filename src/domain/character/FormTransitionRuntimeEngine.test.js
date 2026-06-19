import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  advanceFormTransitionRuntime,
} from "./FormTransitionRuntimeEngine.js";

function createRuntimeCharacter({
  fp = 5,
  maximumSeconds = 600,
  returnMode = "automatic",
  returnTriggers = [],
} = {}) {
  return createCharacter({
    identity: {
      id: "char-runtime",
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
        activeFormId: "form-wolf",
        activeSince: "2026-06-19T12:00:00.000Z",
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
                minimumSeconds: 30,
                maximumSeconds,
              },
              return: {
                mode: returnMode,
                targetFormId: "form-base",
                triggers: returnTriggers,
              },
            },
          },
        ],
      },
    ],
    metadata: {
      createdAt: "2026-06-19T12:00:00.000Z",
      updatedAt: "2026-06-19T12:00:00.000Z",
      source: "singular",
    },
  });
}

test("initializes runtime lazily and tracks elapsed time", () => {
  const character = createRuntimeCharacter();
  const result = advanceFormTransitionRuntime(
    character,
    "set-body",
    { now: "2026-06-19T12:00:30.000Z" },
  );
  const runtime = result.character.alternateFormSets[0].transitionRuntime;

  assert.equal(character.alternateFormSets[0].transitionRuntime, null);
  assert.equal(runtime.formId, "form-wolf");
  assert.equal(runtime.startedAt, "2026-06-19T12:00:00.000Z");
  assert.equal(runtime.observedAt, "2026-06-19T12:00:30.000Z");
  assert.equal(runtime.elapsedSeconds, 30);
  assert.equal(runtime.duration.minimumReached, true);
  assert.equal(runtime.duration.maximumReached, false);
  assert.equal(result.character.pools.FP.current, 5);
  assert.equal(result.report.status, "active");
  assert.equal(result.returnPlan, null);
});

test("charges all due maintenance intervals atomically", () => {
  const first = advanceFormTransitionRuntime(
    createRuntimeCharacter({ fp: 5 }),
    "set-body",
    { now: "2026-06-19T12:02:10.000Z" },
  );
  const runtime = first.character.alternateFormSets[0].transitionRuntime;

  assert.equal(first.character.pools.FP.current, 3);
  assert.equal(first.report.dueMaintenance[0].dueIntervals, 2);
  assert.equal(first.report.consumedResources[0].amount, 2);
  assert.equal(runtime.maintenance[0].chargedIntervals, 2);
  assert.equal(runtime.maintenance[0].lastChargedAt, "2026-06-19T12:02:00.000Z");
  assert.equal(runtime.maintenance[0].nextDueAt, "2026-06-19T12:03:00.000Z");

  const repeated = advanceFormTransitionRuntime(
    first.character,
    "set-body",
    { now: "2026-06-19T12:02:10.000Z" },
  );

  assert.equal(repeated.character.pools.FP.current, 3);
  assert.deepEqual(repeated.report.consumedResources, []);
  assert.equal(
    repeated.character.alternateFormSets[0].transitionRuntime.maintenance[0].chargedIntervals,
    2,
  );
});

test("prepares return without changing form when maintenance cannot be paid", () => {
  const character = createRuntimeCharacter({ fp: 0 });
  const result = advanceFormTransitionRuntime(
    character,
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
  );
  const set = result.character.alternateFormSets[0];

  assert.equal(result.character.pools.FP.current, 0);
  assert.equal(set.activeFormId, "form-wolf");
  assert.equal(set.transitionRuntime.status, "maintenance-unpaid");
  assert.equal(set.transitionRuntime.maintenance[0].chargedIntervals, 0);
  assert.equal(
    set.transitionRuntime.returnRequest.reasons.includes("maintenance-unpaid"),
    true,
  );
  assert.equal(result.report.maintenancePaid, false);
  assert.equal(result.returnPlan.targetFormId, "form-base");
  assert.equal(result.returnPlan.allowed, true);
});

test("maximum duration prepares automatic return but does not execute it", () => {
  const result = advanceFormTransitionRuntime(
    createRuntimeCharacter({ maximumSeconds: 120, fp: 10 }),
    "set-body",
    { now: "2026-06-19T12:02:00.000Z" },
  );
  const set = result.character.alternateFormSets[0];

  assert.equal(set.activeFormId, "form-wolf");
  assert.equal(set.transitionRuntime.status, "expired");
  assert.equal(set.transitionRuntime.duration.maximumReached, true);
  assert.equal(
    set.transitionRuntime.returnRequest.reasons.includes("maximum-duration-reached"),
    true,
  );
  assert.equal(result.returnPlan.intent, "automatic");
  assert.equal(result.returnPlan.targetFormId, "form-base");
  assert.equal(result.returnPlan.allowed, true);
});

test("active involuntary return trigger prepares involuntary plan", () => {
  const result = advanceFormTransitionRuntime(
    createRuntimeCharacter({
      returnMode: "involuntary",
      returnTriggers: [
        {
          id: "trigger-sunrise",
          description: "Nascer do sol",
        },
      ],
    }),
    "set-body",
    {
      now: "2026-06-19T12:00:10.000Z",
      triggerResults: {
        "trigger-sunrise": "active",
      },
    },
  );

  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-wolf");
  assert.equal(result.report.status, "return-pending");
  assert.equal(result.report.returnRequest.intent, "involuntary");
  assert.deepEqual(result.report.returnRequest.triggerIds, ["trigger-sunrise"]);
  assert.equal(result.returnPlan.intent, "involuntary");
  assert.equal(result.returnPlan.allowed, true);
});

test("rejects backward runtime clock", () => {
  assert.throws(() => {
    advanceFormTransitionRuntime(
      createRuntimeCharacter(),
      "set-body",
      { now: "2026-06-19T11:59:59.000Z" },
    );
  });
});
