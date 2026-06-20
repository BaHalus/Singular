import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import {
  analyzeMorphCatalogOperation,
  memorizeMorphForm,
  planMorphCatalogOperation,
  executeMorphCatalogPlan,
} from "./MorphCatalogOperations.js";

const NOW = "2026-06-20T18:00:00.000Z";

function createGuardCharacter() {
  const character = createCharacter({
    identity: {
      id: "char-morph-replacement-guard",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    attributes: { IQ: 2 },
    advantages: [{ id: "adv-morph", name: "Morfose", modifiers: [] }],
    templates: [
      { id: "template-bat", templateType: "form", name: "Morcego" },
      { id: "template-wolf", templateType: "form", name: "Lobo" },
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

function profileOf(character) {
  return character.alternateFormSets[0].morphProfile;
}

test("memorize-form rejects replacementKnownFormId and preserves the catalog", () => {
  const character = createGuardCharacter();
  const analysis = analyzeMorphCatalogOperation(character, "set-morph", {
    type: "memorize-form",
    replacementKnownFormId: "known-bat",
    knownForm: {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
    },
    originalPresent: true,
    concentrationSeconds: 60,
  }, { now: NOW });

  assert.equal(analysis.status, "blocked");
  assert.equal(
    analysis.reasons.some(reason => (
      reason.code === "morph-replacement-operation-required" &&
      reason.operation === "memorize-form"
    )),
    true,
  );

  assert.throws(() => memorizeMorphForm(character, "set-morph", {
    id: "known-wolf",
    templateId: "template-wolf",
    name: "Lobo",
  }, {
    now: NOW,
    originalPresent: true,
    concentrationSeconds: 60,
    replacementKnownFormId: "known-bat",
  }));

  assert.equal(profileOf(character).knownForms.length, 1);
  assert.equal(profileOf(character).knownForms[0].id, "known-bat");
  assert.equal(profileOf(character).knownForms[0].state, "available");
  assert.equal(profileOf(character).catalogHistory.length, 0);
});

test("observe-form rejects injected replacement and cannot execute the blocked plan", () => {
  const character = createGuardCharacter();
  const plan = planMorphCatalogOperation(character, "set-morph", {
    type: "observe-form",
    replacementKnownFormId: "known-bat",
    knownForm: {
      id: "observed-owl",
      templateId: "template-owl",
      name: "Coruja",
    },
    originalPresent: true,
  }, { now: NOW, planId: "plan-observe-with-replacement" });

  assert.equal(plan.status, "blocked");
  assert.equal(
    plan.reasons.some(reason => (
      reason.code === "morph-replacement-operation-required" &&
      reason.operation === "observe-form"
    )),
    true,
  );
  assert.throws(() => executeMorphCatalogPlan(character, plan));

  assert.equal(profileOf(character).knownForms.length, 1);
  assert.equal(profileOf(character).knownForms[0].state, "available");
  assert.equal(profileOf(character).catalogHistory.length, 0);
});
