import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

test("creates default alternate form sets collection", () => {
  const character = createCharacter();

  assert.deepEqual(character.alternateFormSets, []);
});

test("accepts and serializes alternate form sets", () => {
  const character = createCharacter({
    alternateFormSets: [
      {
        id: "set-001",
        name: "Formas do Vampiro",
        baseFormId: "form-base",
        activeFormId: "form-bat",
        activeActivationId: "activation-001",
        activeSince: "2026-06-19T12:00:00.000Z",
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-bat",
            name: "Morcego",
            templateId: "template-bat",
          },
        ],
      },
    ],
  });

  assert.equal(character.alternateFormSets.length, 1);
  assert.equal(character.alternateFormSets[0].activeFormId, "form-bat");

  const json = serializeCharacter(character);

  assert.equal(json.alternateFormSets.length, 1);
  assert.equal(json.alternateFormSets[0].forms[1].templateId, "template-bat");
  assert.equal(json.alternateFormSets[0].activeActivationId, "activation-001");
});

test("rejects invalid alternate form sets inside character", () => {
  assert.throws(() => {
    createCharacter({
      alternateFormSets: "forms",
    });
  });
});
