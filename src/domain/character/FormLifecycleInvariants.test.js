import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";

test("base form cannot retain active transition runtime", () => {
  assert.throws(() => createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        transitionRuntime: {
          activationId: "runtime-invalid",
          formId: "form-base",
          startedAt: "2026-06-19T12:00:00.000Z",
        },
        forms: [
          { id: "form-base", name: "Humanoide" },
        ],
      },
    ],
  }));
});

test("active alternate form may remain lazily uninitialized", () => {
  const character = createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        forms: [
          { id: "form-base", name: "Humanoide" },
          { id: "form-wolf", name: "Lobo" },
        ],
      },
    ],
  });

  assert.equal(character.alternateFormSets[0].transitionRuntime, null);
});

test("runtime must reference active alternate form", () => {
  assert.throws(() => createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        transitionRuntime: {
          activationId: "runtime-invalid",
          formId: "form-bat",
          startedAt: "2026-06-19T12:00:00.000Z",
        },
        forms: [
          { id: "form-base", name: "Humanoide" },
          { id: "form-wolf", name: "Lobo" },
          { id: "form-bat", name: "Morcego" },
        ],
      },
    ],
  }));
});
