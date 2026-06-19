import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  activateAlternateForm,
  deactivateAlternateForm,
} from "./AlternateFormOperations.js";
import {
  initializeFormTransitionRuntime,
} from "./FormTransitionRuntimeOperations.js";
import {
  advanceAllFormTransitionRuntimes,
} from "./FormTransitionRuntimeEngine.js";

function createLifecycleCharacter() {
  return createCharacter({
    identity: {
      id: "char-lifecycle",
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
        baseFormId: "body-base",
        activeFormId: "body-wolf",
        activeSince: "2026-06-19T12:00:00.000Z",
        forms: [
          { id: "body-base", name: "Humanoide" },
          {
            id: "body-wolf",
            name: "Lobo",
            transitionRules: {
              activation: {
                costs: [
                  {
                    id: "body-maintenance",
                    resource: "FP",
                    amount: 1,
                    timing: "maintenance",
                    intervalSeconds: 60,
                  },
                ],
              },
            },
          },
          {
            id: "body-bat",
            name: "Morcego",
            transitionRules: {
              activation: {
                costs: [
                  {
                    id: "bat-maintenance",
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
              duration: {
                maximumSeconds: 60,
              },
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
}

test("changing active form clears old runtime and next tick creates a new session", () => {
  const initialized = initializeFormTransitionRuntime(
    createLifecycleCharacter(),
    "set-body",
    { now: "2026-06-19T12:00:00.000Z" },
  );
  const wolfRuntimeId = initialized.alternateFormSets[0].transitionRuntime.activationId;

  const switched = activateAlternateForm(
    initialized,
    "set-body",
    "body-bat",
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(switched.alternateFormSets[0].activeFormId, "body-bat");
  assert.equal(switched.alternateFormSets[0].transitionRuntime, null);

  const advanced = advanceAllFormTransitionRuntimes(
    switched,
    { now: "2026-06-19T12:01:30.000Z" },
  );
  const batRuntime = advanced.character.alternateFormSets[0].transitionRuntime;

  assert.equal(batRuntime.formId, "body-bat");
  assert.notEqual(batRuntime.activationId, wolfRuntimeId);
  assert.equal(batRuntime.startedAt, "2026-06-19T12:01:00.000Z");
  assert.equal(batRuntime.elapsedSeconds, 30);
});

test("returning to base clears transition runtime", () => {
  const initialized = initializeFormTransitionRuntime(
    createLifecycleCharacter(),
    "set-body",
    { now: "2026-06-19T12:00:00.000Z" },
  );

  const returned = deactivateAlternateForm(
    initialized,
    "set-body",
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(returned.alternateFormSets[0].activeFormId, "body-base");
  assert.equal(returned.alternateFormSets[0].transitionRuntime, null);
});

test("advances independent form sets and prepares only applicable return", () => {
  const result = advanceAllFormTransitionRuntimes(
    createLifecycleCharacter(),
    { now: "2026-06-19T12:01:00.000Z" },
  );

  assert.equal(result.reports.length, 2);
  assert.equal(result.character.pools.FP.current, 9);
  assert.equal(
    result.character.alternateFormSets[0].transitionRuntime.maintenance[0].chargedIntervals,
    1,
  );
  assert.equal(
    result.character.alternateFormSets[1].transitionRuntime.duration.maximumReached,
    true,
  );
  assert.equal(result.returnPlans.length, 1);
  assert.equal(result.returnPlans[0].formSetId, "set-armor");
  assert.equal(result.returnPlans[0].targetFormId, "armor-base");
  assert.equal(result.character.alternateFormSets[1].activeFormId, "armor-active");
});
