import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  initializeFormTransitionRuntime,
} from "./FormTransitionRuntimeOperations.js";
import {
  advanceFormTransitionRuntime,
} from "./FormTransitionRuntimeEngine.js";

test("runtime keeps maintenance entries distinct when phases reuse the same cost id", () => {
  const character = createCharacter({
    identity: {
      id: "char-duplicate-maintenance",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 10, maximum: 10 },
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
                    id: "transition-cost-1",
                    resource: "FP",
                    amount: 1,
                    timing: "maintenance",
                    intervalSeconds: 60,
                  },
                ],
              },
              deactivation: {
                costs: [
                  {
                    id: "transition-cost-1",
                    resource: "FP",
                    amount: 2,
                    timing: "maintenance",
                    intervalSeconds: 120,
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  });

  const initialized = initializeFormTransitionRuntime(
    character,
    "set-body",
    { now: "2026-06-19T12:00:00.000Z" },
  );
  const maintenance = initialized.alternateFormSets[0].transitionRuntime.maintenance;

  assert.equal(maintenance.length, 2);
  assert.deepEqual(
    maintenance.map(entry => entry.costId),
    [
      "activation:transition-cost-1:1",
      "deactivation:transition-cost-1:1",
    ],
  );

  const advanced = advanceFormTransitionRuntime(
    initialized,
    "set-body",
    { now: "2026-06-19T12:02:00.000Z" },
  );

  assert.equal(advanced.character.pools.FP.current, 6);
  assert.deepEqual(
    advanced.character.alternateFormSets[0].transitionRuntime.maintenance
      .map(entry => entry.chargedIntervals),
    [2, 1],
  );
  assert.equal(advanced.report.consumedResources[0].amount, 4);
});
