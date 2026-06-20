import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import {
  analyzeMorphCatalogOperation,
  registerMorphKnownForm,
} from "./MorphCatalogOperations.js";

const NOW = "2026-06-20T17:00:00.000Z";

function createCharacterWithRoom() {
  const character = createCharacter({
    identity: {
      id: "char-morph-replacement-necessity",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    attributes: { IQ: 2 },
    advantages: [{ id: "adv-morph", name: "Morfose", modifiers: [] }],
    templates: [
      { id: "template-bat", templateType: "form", name: "Morcego" },
      { id: "template-owl", templateType: "form", name: "Coruja" },
    ],
    alternateFormSets: [{
      id: "set-morph",
      name: "Morfose",
      mechanism: "morph",
      sourceTraitId: "adv-morph",
      baseFormId: "form-base",
      activeFormId: "form-base",
      forms: [{ id: "form-base", name: "Forma natural" }],
      morphProfile: {
        knownForms: [{
          id: "known-bat",
          templateId: "template-bat",
          name: "Morcego",
          acquisitionMethod: "memorized",
          state: "available",
        }],
      },
    }],
    metadata: {
      createdAt: "2026-06-20T08:00:00.000Z",
      updatedAt: "2026-06-20T08:00:00.000Z",
      source: "singular",
    },
  });

  return applyResolvedMorphProfile(character, "set-morph", { now: NOW }).character;
}

test("rejects acquisition replacement when a new identity fits without discarding another form", () => {
  const character = createCharacterWithRoom();
  const analysis = analyzeMorphCatalogOperation(character, "set-morph", {
    type: "acquire-form",
    replacementKnownFormId: "known-bat",
    knownForm: {
      id: "known-owl",
      templateId: "template-owl",
      name: "Coruja",
      acquisitionMethod: "imported",
    },
  }, { now: NOW });

  assert.equal(analysis.capacityEvaluation.used, 1);
  assert.equal(analysis.capacityEvaluation.requiredSlots, 1);
  assert.equal(analysis.status, "blocked");
  assert.equal(
    analysis.reasons.some(reason => (
      reason.code === "morph-acquisition-replacement-not-required"
    )),
    true,
  );

  assert.throws(() => registerMorphKnownForm(character, "set-morph", {
    id: "known-owl",
    templateId: "template-owl",
    name: "Coruja",
    acquisitionMethod: "imported",
  }, {
    now: NOW,
    replacementKnownFormId: "known-bat",
  }));

  const profile = character.alternateFormSets[0].morphProfile;
  assert.equal(profile.knownForms.length, 1);
  assert.equal(profile.knownForms[0].id, "known-bat");
  assert.equal(profile.knownForms[0].state, "available");
});
