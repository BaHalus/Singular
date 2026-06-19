import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  advanceFormTransitionRuntime,
} from "./FormTransitionRuntimeEngine.js";

function createRuntimeHistoryCharacter({ fp = 5, maximumSeconds = 120 } = {}) {
  return createCharacter({
    identity: {
      id: "char-runtime-history",
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
              },
            },
          },
        ],
      },
    ],
  });
}

test("records maintenance charge and return request as distinct events", () => {
  const result = advanceFormTransitionRuntime(
    createRuntimeHistoryCharacter({ fp: 5, maximumSeconds: 120 }),
    "set-body",
    { now: "2026-06-19T12:02:00.000Z" },
  );
  const history = result.character.formTransitionHistory;

  assert.equal(history.length, 2);
  assert.deepEqual(
    history.map(entry => entry.type),
    ["maintenance-charged", "return-requested"],
  );
  assert.equal(history[0].data.consumedResources[0].amount, 2);
  assert.equal(
    history[1].data.request.reasons.includes("maximum-duration-reached"),
    true,
  );
  assert.equal(history[1].targetFormId, "form-base");
});

test("repeating the same observation does not duplicate runtime events", () => {
  const first = advanceFormTransitionRuntime(
    createRuntimeHistoryCharacter({ fp: 5, maximumSeconds: 120 }),
    "set-body",
    { now: "2026-06-19T12:02:00.000Z" },
  );
  const second = advanceFormTransitionRuntime(
    first.character,
    "set-body",
    { now: "2026-06-19T12:02:00.000Z" },
  );

  assert.equal(second.character.formTransitionHistory.length, 2);
  assert.deepEqual(
    second.character.formTransitionHistory.map(entry => entry.id),
    first.character.formTransitionHistory.map(entry => entry.id),
  );
});

test("records unpaid maintenance without changing pools", () => {
  const result = advanceFormTransitionRuntime(
    createRuntimeHistoryCharacter({ fp: 0, maximumSeconds: 600 }),
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
  );
  const history = result.character.formTransitionHistory;

  assert.equal(result.character.pools.FP.current, 0);
  assert.deepEqual(
    history.map(entry => entry.type),
    ["maintenance-unpaid", "return-requested"],
  );
  assert.equal(
    history[0].data.error.code,
    "MAINTENANCE_PAYMENT_FAILED",
  );
  assert.equal(
    history[1].data.request.reasons.includes("maintenance-unpaid"),
    true,
  );
});
