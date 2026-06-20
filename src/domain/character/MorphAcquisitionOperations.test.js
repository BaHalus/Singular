import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import {
  analyzeMorphCatalogOperation,
  planMorphCatalogOperation,
  executeMorphCatalogPlan,
  observeMorphForm,
  memorizeMorphForm,
  replaceMorphMemorizedForm,
  forgetMorphKnownForm,
  registerMorphKnownForm,
} from "./MorphCatalogOperations.js";
import { materializeMorphKnownForm } from "./MorphKnownFormMaterialization.js";
import { resolveMorphMemorizationPolicy } from "./MorphMemorizationPolicy.js";

const NOW = "2026-06-20T12:00:00.000Z";

function createBaseCharacter({ iq = 2, modifiers = [], knownForms = [] } = {}) {
  const character = createCharacter({
    identity: {
      id: "char-morph-acquisition",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    attributes: { IQ: iq },
    advantages: [{ id: "adv-morph", name: "Morfose", modifiers }],
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

test("standard Morfose derives IQ slots and one-minute memorization", () => {
  const character = createBaseCharacter({ iq: 2 });
  const policy = resolveMorphMemorizationPolicy(character, setOf(character));

  assert.equal(policy.source, "gurps-basic-set");
  assert.equal(policy.mode, "limited");
  assert.equal(policy.capacityBasis, "iq");
  assert.equal(policy.effectiveCapacity, 2);
  assert.equal(policy.durationSeconds, 60);
});

test("analysis is immutable and incomplete concentration remains pending", () => {
  const character = createBaseCharacter();
  const before = serializeCharacter(character);
  const analysis = analyzeMorphCatalogOperation(character, "set-morph", {
    type: "memorize-form",
    knownForm: { id: "known-wolf", templateId: "template-wolf", name: "Lobo" },
    originalPresent: true,
    concentrationSeconds: 59,
  }, { now: NOW });

  assert.equal(analysis.status, "pending");
  assert.equal(
    analysis.reasons.some(reason => reason.code === "morph-memorization-concentration-incomplete"),
    true,
  );
  assert.deepEqual(serializeCharacter(character), before);
});

test("memorizes atomically and persists receipt, provenance and save/load", () => {
  const character = createBaseCharacter();
  const result = memorizeMorphForm(character, "set-morph", {
    id: "known-wolf",
    templateId: "template-wolf",
    name: "Lobo",
  }, {
    now: NOW,
    originalPresent: true,
    concentrationSeconds: 60,
    eventId: "event-memorize-wolf",
  });
  const profile = setOf(result.character).morphProfile;

  assert.equal(character.alternateFormSets[0].morphProfile.knownForms.length, 0);
  assert.equal(profile.knownForms.length, 1);
  assert.equal(profile.knownForms[0].acquisitionMethod, "memorized");
  assert.equal(profile.knownForms[0].memorizedAt, NOW);
  assert.equal(profile.knownForms[0].lastObservedAt, NOW);
  assert.equal(profile.catalogHistory[0].type, "form-memorized");
  assert.equal(result.receipt.id, "event-memorize-wolf");

  const roundTrip = createCharacter(serializeCharacter(result.character));
  assert.deepEqual(setOf(roundTrip).morphProfile.catalogHistory, profile.catalogHistory);
});

test("full standard repertoire requires an explicit replacement", () => {
  const character = createBaseCharacter({
    iq: 1,
    knownForms: [{
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "memorized",
      acquiredAt: NOW,
      memorizedAt: NOW,
    }],
  });
  const plan = planMorphCatalogOperation(character, "set-morph", {
    type: "memorize-form",
    knownForm: { id: "known-bat", templateId: "template-bat", name: "Morcego" },
    originalPresent: true,
    concentrationSeconds: 60,
  }, { now: NOW, planId: "plan-full" });

  assert.equal(plan.status, "pending");
  assert.equal(
    plan.reasons.some(reason => reason.code === "morph-memorization-replacement-required"),
    true,
  );
  assert.throws(() => executeMorphCatalogPlan(character, plan));
});

test("replacement is explicit and atomic and keeps forgotten provenance", () => {
  const character = createBaseCharacter({
    iq: 1,
    knownForms: [{
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "memorized",
      acquiredAt: NOW,
      memorizedAt: NOW,
    }],
  });
  const result = replaceMorphMemorizedForm(
    character,
    "set-morph",
    "known-wolf",
    { id: "known-bat", templateId: "template-bat", name: "Morcego" },
    {
      now: "2026-06-20T12:02:00.000Z",
      originalPresent: true,
      concentrationSeconds: 60,
      eventId: "event-replace",
    },
  );
  const profile = setOf(result.character).morphProfile;

  assert.equal(profile.knownForms.length, 2);
  assert.equal(profile.knownForms.find(form => form.id === "known-wolf").state, "forgotten");
  assert.equal(profile.knownForms.find(form => form.id === "known-bat").state, "available");
  assert.equal(profile.catalogHistory.at(-1).type, "form-replaced");
  assert.equal(profile.catalogHistory.at(-1).relatedKnownFormId, "known-wolf");
});

test("No Memorization Required automatically retains an observed form", () => {
  const character = createBaseCharacter({
    modifiers: [{ id: "mod-auto", name: "Não Exige Memorização" }],
  });
  const policy = resolveMorphMemorizationPolicy(character, setOf(character));
  const result = observeMorphForm(character, "set-morph", {
    id: "known-owl",
    templateId: "template-owl",
    name: "Coruja",
  }, { now: NOW, originalPresent: true, eventId: "event-observe-auto" });

  assert.equal(policy.retention, "automatic");
  assert.equal(policy.durationSeconds, 0);
  assert.equal(setOf(result.character).morphProfile.knownForms.length, 1);
  assert.equal(result.receipt.type, "form-observed");
  assert.equal(result.receipt.data.retained, true);
});

test("Cannot Memorize Forms keeps observation transient and blocks memorization", () => {
  const character = createBaseCharacter({
    modifiers: [{ id: "mod-cannot", name: "Incapaz de Memorizar Formas" }],
  });
  const policy = resolveMorphMemorizationPolicy(character, setOf(character));
  const observed = observeMorphForm(character, "set-morph", {
    id: "observed-wolf",
    templateId: "template-wolf",
    name: "Lobo",
  }, { now: NOW, originalPresent: true, eventId: "event-observed-transient" });

  assert.equal(policy.retention, "forbidden");
  assert.equal(setOf(observed.character).morphProfile.knownForms.length, 0);
  assert.equal(observed.receipt.data.retained, false);

  const plan = planMorphCatalogOperation(character, "set-morph", {
    type: "memorize-form",
    knownForm: { id: "known-wolf", templateId: "template-wolf", name: "Lobo" },
    originalPresent: true,
    concentrationSeconds: 60,
  }, { now: NOW });
  assert.equal(plan.status, "blocked");
  assert.equal(plan.reasons.some(reason => reason.code === "morph-memorization-forbidden"), true);
});

test("rejects stale plans after the catalog changes", () => {
  const character = createBaseCharacter();
  const plan = planMorphCatalogOperation(character, "set-morph", {
    type: "memorize-form",
    knownForm: { id: "known-wolf", templateId: "template-wolf", name: "Lobo" },
    originalPresent: true,
    concentrationSeconds: 60,
  }, { now: NOW, planId: "plan-stale" });
  const changed = registerMorphKnownForm(character, "set-morph", {
    id: "known-bat",
    templateId: "template-bat",
    name: "Morcego",
  }, { now: "2026-06-20T12:01:00.000Z" });

  assert.throws(() => executeMorphCatalogPlan(changed, plan), /stale/);
});

test("unresolved external references remain catalogued without name linking", () => {
  const character = createBaseCharacter();
  const result = memorizeMorphForm(character, "set-morph", {
    id: "known-external",
    templateId: null,
    externalIds: { gcs: "external-form-17" },
    name: "Forma externa",
    importMeta: { source: "gcs" },
    raw: { future_field: true },
  }, { now: NOW, originalPresent: true, concentrationSeconds: 60 });
  const stored = setOf(result.character).morphProfile.knownForms[0];

  assert.equal(stored.templateId, null);
  assert.equal(stored.externalIds.gcs, "external-form-17");
  assert.equal(stored.raw.future_field, true);
});

test("catalog survives a later profile recomposition", () => {
  const character = createBaseCharacter();
  const memorized = memorizeMorphForm(character, "set-morph", {
    id: "known-wolf",
    templateId: "template-wolf",
    name: "Lobo",
  }, { now: NOW, originalPresent: true, concentrationSeconds: 60 });
  const recomposed = applyResolvedMorphProfile(
    memorized.character,
    "set-morph",
    { now: "2026-06-20T13:00:00.000Z" },
  ).character;

  assert.equal(setOf(recomposed).morphProfile.knownForms[0].id, "known-wolf");
  assert.equal(setOf(recomposed).morphProfile.catalogHistory.length, 1);
});

test("active materialized form cannot be forgotten or replaced", () => {
  let character = createBaseCharacter({
    iq: 1,
    knownForms: [{
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "memorized",
      acquiredAt: NOW,
      memorizedAt: NOW,
    }],
  });
  const materialized = materializeMorphKnownForm(
    character,
    "set-morph",
    "known-wolf",
    { now: NOW },
  );
  character = createCharacter({
    ...materialized.character,
    alternateFormSets: materialized.character.alternateFormSets.map(set => (
      set.id === "set-morph" ? { ...set, activeFormId: materialized.formId } : set
    )),
  });

  const forgetPlan = planMorphCatalogOperation(character, "set-morph", {
    type: "forget-form",
    knownFormId: "known-wolf",
  }, { now: NOW });
  const replacePlan = planMorphCatalogOperation(character, "set-morph", {
    type: "replace-memorized-form",
    replacementKnownFormId: "known-wolf",
    knownForm: { id: "known-bat", templateId: "template-bat", name: "Morcego" },
    originalPresent: true,
    concentrationSeconds: 60,
  }, { now: NOW });

  assert.equal(forgetPlan.status, "blocked");
  assert.equal(replacePlan.status, "blocked");
  assert.throws(() => forgetMorphKnownForm(character, "set-morph", "known-wolf"));
});
