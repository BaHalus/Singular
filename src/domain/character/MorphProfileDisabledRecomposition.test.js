import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  applyResolvedMorphProfile,
} from "./MorphProfileResolver.js";

function createCharacterWithModifier(disabled = false) {
  return createCharacter({
    identity: {
      id: "char-morph-disable",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    advantages: [
      {
        id: "adv-morph",
        name: "Morfose",
        modifiers: [
          {
            id: "mod-unlimited",
            name: "Ilimitada",
            disabled,
          },
        ],
      },
    ],
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

test("disabling a previously resolved modifier removes its contribution", () => {
  const active = applyResolvedMorphProfile(
    createCharacterWithModifier(false),
    "set-morph",
    { now: "2026-06-19T17:00:00.000Z" },
  ).character;

  assert.equal(active.alternateFormSets[0].morphProfile.pointLimitMode, "unlimited");

  const disabled = createCharacter({
    ...active,
    advantages: active.advantages.map(advantage => (
      advantage.id === "adv-morph"
        ? {
          ...advantage,
          modifiers: advantage.modifiers.map(modifier => ({
            ...modifier,
            disabled: true,
          })),
        }
        : advantage
    )),
  });
  const recomposed = applyResolvedMorphProfile(
    disabled,
    "set-morph",
    { now: "2026-06-19T17:05:00.000Z" },
  );
  const set = recomposed.character.alternateFormSets[0];

  assert.equal(set.morphProfile.pointLimitMode, "undeclared");
  assert.equal(set.morphProfile.pointLimit, null);
  assert.equal(set.morphProfile.pointLimitSource, "undeclared");
  assert.equal(
    recomposed.resolution.ignoredModifiers.some(item => (
      item.id === "mod-unlimited" &&
      item.ruleId === "gurps.morph.unlimited"
    )),
    true,
  );
});
