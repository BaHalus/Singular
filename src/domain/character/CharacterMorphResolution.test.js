import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";
import {
  applyResolvedMorphProfile,
} from "./MorphProfileResolver.js";

test("Morfose source link, override and resolution survive save and restore", () => {
  const character = createCharacter({
    identity: {
      id: "char-morph-resolution",
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
          },
          {
            id: "mod-improvised",
            name: "Formas Improvisadas",
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

  const applied = applyResolvedMorphProfile(character, "set-morph", {
    now: "2026-06-19T15:00:00.000Z",
    manualOverride: {
      improvisation: {
        mode: "conditional",
        pointLimit: 25,
      },
    },
  });
  const serialized = serializeCharacter(applied.character);
  const restored = createCharacter(serialized);
  const set = restored.alternateFormSets[0];

  assert.equal(set.sourceTraitId, "adv-morph");
  assert.equal(set.morphProfile.pointLimitMode, "unlimited");
  assert.equal(set.morphProfile.improvisation.mode, "conditional");
  assert.equal(set.morphProfile.improvisation.pointLimit, 25);
  assert.deepEqual(set.morphProfileOverride, {
    improvisation: {
      mode: "conditional",
      pointLimit: 25,
    },
  });
  assert.equal(set.morphProfileResolution.sourceTraitId, "adv-morph");
  assert.equal(set.morphProfileResolution.resolvedAt, "2026-06-19T15:00:00.000Z");
  assert.equal(
    set.morphProfileResolution.recognizedModifiers.some(item => (
      item.ruleId === "gurps.morph.unlimited"
    )),
    true,
  );
  assert.equal(
    set.morphProfileResolution.decisions.improvisation.mode.source,
    "manual",
  );
});

test("Forma Alternativa discards Morfose resolution fields", () => {
  const character = createCharacter({
    alternateFormSets: [
      {
        id: "set-alternate",
        name: "Forma Alternativa",
        mechanism: "alternateForm",
        baseFormId: "form-base",
        activeFormId: "form-base",
        forms: [
          {
            id: "form-base",
            name: "Forma natural",
          },
        ],
        morphProfile: {
          pointLimit: 30,
        },
        morphProfileOverride: {
          pointLimit: 40,
        },
        morphProfileResolution: {
          sourceTraitId: "adv-morph",
        },
      },
    ],
  });

  const set = character.alternateFormSets[0];
  assert.equal(set.morphProfile, null);
  assert.equal(set.morphProfileOverride, null);
  assert.equal(set.morphProfileResolution, null);
});
