import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { setMorphPointLimit } from "./MorphCatalogOperations.js";

function characterWithMorfose() {
  return createCharacter({
    identity: {
      id: "char-morph-limit",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    alternateFormSets: [
      {
        id: "set-morph",
        name: "Morfose",
        mechanism: "morph",
        baseFormId: "form-base",
        activeFormId: "form-base",
        forms: [
          {
            id: "form-base",
            name: "Forma natural",
          },
        ],
      },
    ],
  });
}

test("declaring a numeric limit changes mode to limited", () => {
  const character = setMorphPointLimit(
    characterWithMorfose(),
    "set-morph",
    80,
    "campaign",
    { now: "2026-06-19T16:00:00.000Z" },
  );
  const profile = character.alternateFormSets[0].morphProfile;

  assert.equal(profile.pointLimitMode, "limited");
  assert.equal(profile.pointLimit, 80);
  assert.equal(profile.pointLimitSource, "campaign");
});

test("clearing a numeric limit returns profile to undeclared", () => {
  const limited = setMorphPointLimit(
    characterWithMorfose(),
    "set-morph",
    80,
    "manual",
  );
  const cleared = setMorphPointLimit(
    limited,
    "set-morph",
    null,
    "manual",
  );
  const profile = cleared.alternateFormSets[0].morphProfile;

  assert.equal(profile.pointLimitMode, "undeclared");
  assert.equal(profile.pointLimit, null);
  assert.equal(profile.pointLimitSource, "undeclared");
});
