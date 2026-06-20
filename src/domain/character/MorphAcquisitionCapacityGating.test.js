import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import {
  analyzeMorphCatalogOperation,
  registerMorphKnownForm,
} from "./MorphCatalogOperations.js";
import { countOccupiedMorphMemorySlots } from "./MorphMemorizationPolicy.js";

const NOW = "2026-06-20T16:00:00.000Z";

function createCapacityCharacter({ iq = 1, knownForms = [] } = {}) {
  const character = createCharacter({
    identity: {
      id: "char-morph-capacity-gating",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    attributes: { IQ: iq },
    advantages: [{ id: "adv-morph", name: "Morfose", modifiers: [] }],
    templates: [
      { id: "template-wolf", templateType: "form", name: "Lobo" },
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
      morphProfile: { knownForms },
    }],
    metadata: {
      createdAt: "2026-06-20T08:00:00.000Z",
      updatedAt: "2026-06-20T08:00:00.000Z",
      source: "singular",
    },
  });

  return applyResolvedMorphProfile(character, "set-morph", { now: NOW }).character;
}

function setOf(character) {
  return character.alternateFormSets.find(set => set.id === "set-morph");
}

test("new imported acquisition at full capacity requires explicit replacement", () => {
  const character = createCapacityCharacter({
    knownForms: [{
      id: "known-bat",
      templateId: "template-bat",
      name: "Morcego",
      acquisitionMethod: "memorized",
      state: "available",
    }],
  });
  const analysis = analyzeMorphCatalogOperation(character, "set-morph", {
    type: "acquire-form",
    knownForm: {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "imported",
    },
  }, { now: NOW });

  assert.equal(analysis.status, "pending");
  assert.equal(analysis.capacityEvaluation.used, 1);
  assert.equal(analysis.capacityEvaluation.requiredSlots, 1);
  assert.equal(analysis.capacityEvaluation.projectedUsed, 2);
  assert.equal(analysis.capacityEvaluation.wouldExceed, true);
  assert.equal(
    analysis.reasons.some(reason => reason.code === "morph-acquisition-replacement-required"),
    true,
  );
  assert.throws(() => registerMorphKnownForm(character, "set-morph", {
    id: "known-wolf",
    templateId: "template-wolf",
    name: "Lobo",
    acquisitionMethod: "imported",
  }, { now: NOW }));
  assert.equal(setOf(character).morphProfile.knownForms.length, 1);
});

test("reacquiring a forgotten identity at full capacity cannot bypass replacement", () => {
  const character = createCapacityCharacter({
    knownForms: [
      {
        id: "known-wolf",
        templateId: "template-wolf",
        name: "Lobo",
        acquisitionMethod: "memorized",
        state: "forgotten",
      },
      {
        id: "known-bat",
        templateId: "template-bat",
        name: "Morcego",
        acquisitionMethod: "memorized",
        state: "available",
      },
    ],
  });
  const analysis = analyzeMorphCatalogOperation(character, "set-morph", {
    type: "acquire-form",
    knownForm: {
      id: "incoming-wolf",
      templateId: "template-wolf",
      name: "Lobo importado",
      acquisitionMethod: "imported",
    },
  }, { now: NOW });

  assert.equal(analysis.status, "pending");
  assert.equal(analysis.identityResolution.matchedKnownFormId, "known-wolf");
  assert.equal(analysis.capacityEvaluation.requiredSlots, 1);
  assert.equal(
    analysis.reasons.some(reason => reason.code === "morph-acquisition-replacement-required"),
    true,
  );
});

test("explicit acquisition replacement is atomic and preserves canonical identity", () => {
  const character = createCapacityCharacter({
    knownForms: [
      {
        id: "known-wolf",
        templateId: "template-wolf",
        name: "Lobo",
        acquisitionMethod: "memorized",
        state: "forgotten",
      },
      {
        id: "known-bat",
        templateId: "template-bat",
        name: "Morcego",
        acquisitionMethod: "memorized",
        state: "available",
      },
    ],
  });
  const updated = registerMorphKnownForm(character, "set-morph", {
    id: "incoming-wolf",
    templateId: "template-wolf",
    externalIds: { gcs: "wolf-imported" },
    name: "Lobo importado",
    acquisitionMethod: "imported",
  }, {
    now: NOW,
    replacementKnownFormId: "known-bat",
    eventId: "event-acquire-replace",
  });
  const profile = setOf(updated).morphProfile;
  const wolf = profile.knownForms.find(form => form.id === "known-wolf");
  const bat = profile.knownForms.find(form => form.id === "known-bat");
  const receipt = profile.catalogHistory.at(-1);

  assert.equal(wolf.state, "available");
  assert.equal(wolf.externalIds.gcs, "wolf-imported");
  assert.equal(bat.state, "forgotten");
  assert.equal(countOccupiedMorphMemorySlots(setOf(updated)), 1);
  assert.equal(receipt.id, "event-acquire-replace");
  assert.equal(receipt.type, "form-replaced");
  assert.equal(receipt.knownFormId, "known-wolf");
  assert.equal(receipt.relatedKnownFormId, "known-bat");
  assert.equal(receipt.data.reused, true);
  assert.equal(receipt.data.capacityEvaluation.releasedSlots, 1);
  assert.equal(receipt.data.capacityEvaluation.projectedUsed, 1);
});

test("new acquisition may replace an explicitly selected retained form", () => {
  const character = createCapacityCharacter({
    knownForms: [{
      id: "known-bat",
      templateId: "template-bat",
      name: "Morcego",
      state: "available",
    }],
  });
  const updated = registerMorphKnownForm(character, "set-morph", {
    id: "known-owl",
    templateId: "template-owl",
    name: "Coruja",
    acquisitionMethod: "manual",
  }, {
    now: NOW,
    replacementKnownFormId: "known-bat",
  });
  const profile = setOf(updated).morphProfile;

  assert.equal(profile.knownForms.find(form => form.id === "known-bat").state, "forgotten");
  assert.equal(profile.knownForms.find(form => form.id === "known-owl").state, "available");
  assert.equal(countOccupiedMorphMemorySlots(setOf(updated)), 1);
  assert.equal(profile.catalogHistory.at(-1).type, "form-replaced");
});

test("acquisition below capacity needs no replacement", () => {
  const character = createCapacityCharacter({
    iq: 2,
    knownForms: [{
      id: "known-bat",
      templateId: "template-bat",
      name: "Morcego",
      state: "available",
    }],
  });
  const analysis = analyzeMorphCatalogOperation(character, "set-morph", {
    type: "acquire-form",
    knownForm: {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "manual",
    },
  }, { now: NOW });

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.capacityEvaluation.projectedUsed, 2);
  assert.equal(analysis.capacityEvaluation.wouldExceed, false);
});

test("unnecessary replacement cannot discard a retained form", () => {
  const character = createCapacityCharacter({
    iq: 2,
    knownForms: [
      {
        id: "known-wolf",
        templateId: "template-wolf",
        name: "Lobo",
        state: "available",
      },
      {
        id: "known-bat",
        templateId: "template-bat",
        name: "Morcego",
        state: "available",
      },
    ],
  });
  const analysis = analyzeMorphCatalogOperation(character, "set-morph", {
    type: "acquire-form",
    replacementKnownFormId: "known-bat",
    knownForm: {
      id: "incoming-wolf",
      templateId: "template-wolf",
      name: "Lobo",
    },
  }, { now: NOW });

  assert.equal(analysis.status, "blocked");
  assert.equal(
    analysis.reasons.some(reason => reason.code === "morph-replacement-candidate-already-retained"),
    true,
  );
});
