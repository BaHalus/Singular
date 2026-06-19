import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

test("character preserves transition runtime through serialization", () => {
  const character = createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        activeActivationId: "activation-wolf",
        activeSince: "2026-06-19T12:00:00.000Z",
        transitionRuntime: {
          activationId: "activation-wolf",
          formId: "form-wolf",
          startedAt: "2026-06-19T12:00:00.000Z",
          observedAt: "2026-06-19T12:01:00.000Z",
          elapsedSeconds: 60,
          maintenance: [
            {
              costId: "maintenance-fp",
              resource: "FP",
              resourceKey: "FP",
              amount: 1,
              intervalSeconds: 60,
              chargedIntervals: 1,
              lastChargedAt: "2026-06-19T12:01:00.000Z",
              nextDueAt: "2026-06-19T12:02:00.000Z",
            },
          ],
          duration: {
            maximumSeconds: 600,
          },
        },
        forms: [
          { id: "form-base", name: "Humanoide" },
          { id: "form-wolf", name: "Lobo" },
        ],
      },
    ],
  });

  const runtime = character.alternateFormSets[0].transitionRuntime;
  assert.equal(runtime.formId, "form-wolf");
  assert.equal(runtime.maintenance[0].chargedIntervals, 1);

  const json = serializeCharacter(character);
  assert.deepEqual(json.alternateFormSets[0].transitionRuntime, runtime);
  assert.notEqual(json.alternateFormSets[0].transitionRuntime, runtime);
});

test("rejects runtime linked to a form other than the active form", () => {
  assert.throws(() => createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        transitionRuntime: {
          activationId: "runtime-wrong",
          formId: "form-base",
          startedAt: "2026-06-19T12:00:00.000Z",
        },
        forms: [
          { id: "form-base", name: "Humanoide" },
          { id: "form-wolf", name: "Lobo" },
        ],
      },
    ],
  }));
});

test("rejects runtime activation id different from active activation", () => {
  assert.throws(() => createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        activeActivationId: "activation-wolf",
        transitionRuntime: {
          activationId: "runtime-other",
          formId: "form-wolf",
          startedAt: "2026-06-19T12:00:00.000Z",
        },
        forms: [
          { id: "form-base", name: "Humanoide" },
          { id: "form-wolf", name: "Lobo" },
        ],
      },
    ],
  }));
});
