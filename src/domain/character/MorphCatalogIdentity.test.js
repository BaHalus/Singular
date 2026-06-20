import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import {
  analyzeMorphCatalogOperation,
  memorizeMorphForm,
  registerMorphKnownForm,
} from "./MorphCatalogOperations.js";
import {
  findMorphKnownFormsByExternalId,
  resolveMorphKnownFormIdentity,
} from "./MorphKnownFormIdentity.js";
import { countOccupiedMorphMemorySlots } from "./MorphMemorizationPolicy.js";

const NOW = "2026-06-20T14:00:00.000Z";

function createCharacterWithCatalog({ iq = 2, knownForms = [], twoSets = false } = {}) {
  let character = createCharacter({
    identity: {
      id: "char-morph-identity",
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
    alternateFormSets: [
      {
        id: "set-morph-a",
        name: "Morfose A",
        mechanism: "morph",
        sourceTraitId: "adv-morph",
        baseFormId: "form-base-a",
        activeFormId: "form-base-a",
        forms: [{ id: "form-base-a", name: "Forma natural A" }],
        morphProfile: { knownForms },
      },
      ...(twoSets ? [{
        id: "set-morph-b",
        name: "Morfose B",
        mechanism: "morph",
        sourceTraitId: "adv-morph",
        baseFormId: "form-base-b",
        activeFormId: "form-base-b",
        forms: [{ id: "form-base-b", name: "Forma natural B" }],
        morphProfile: { knownForms: [] },
      }] : []),
    ],
    metadata: {
      createdAt: "2026-06-20T08:00:00.000Z",
      updatedAt: "2026-06-20T08:00:00.000Z",
      source: "singular",
    },
  });
  character = applyResolvedMorphProfile(character, "set-morph-a", { now: NOW }).character;
  if (twoSets) {
    character = applyResolvedMorphProfile(character, "set-morph-b", { now: NOW }).character;
  }
  return character;
}

function setOf(character, id = "set-morph-a") {
  return character.alternateFormSets.find(set => set.id === id);
}

test("identity precedence reuses explicit knownFormId and merges evidence", () => {
  const character = createCharacterWithCatalog({
    knownForms: [{
      id: "known-wolf",
      templateId: "template-wolf",
      externalIds: { gcs: "wolf-001" },
      name: "Lobo",
      acquisitionMethod: "manual",
      acquiredAt: "2026-06-20T10:00:00.000Z",
      tags: ["animal"],
    }],
  });

  const updated = registerMorphKnownForm(character, "set-morph-a", {
    id: "known-wolf",
    templateId: "template-wolf",
    externalIds: { gca: "wolf-A" },
    name: "Nome importado",
    acquisitionMethod: "imported",
    tags: ["importado"],
    notes: "Evidência GCA",
  }, { now: NOW });
  const profile = setOf(updated).morphProfile;

  assert.equal(profile.knownForms.length, 1);
  assert.equal(profile.knownForms[0].id, "known-wolf");
  assert.deepEqual(profile.knownForms[0].externalIds, {
    gcs: "wolf-001",
    gca: "wolf-A",
  });
  assert.deepEqual(profile.knownForms[0].tags, ["animal", "importado"]);
  assert.equal(profile.knownForms[0].acquisitionMethod, "manual");
  assert.equal(profile.catalogHistory.at(-1).data.reused, true);
  assert.equal(profile.catalogHistory.at(-1).data.identityResolution.matchedBy, "knownFormId");
});

test("exact template identity reuses the canonical entry despite a new incoming id", () => {
  const character = createCharacterWithCatalog({
    knownForms: [{
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "manual",
    }],
  });
  const updated = registerMorphKnownForm(character, "set-morph-a", {
    id: "incoming-wolf",
    templateId: "template-wolf",
    externalIds: { gcs: "wolf-002" },
    name: "Lobo importado",
    acquisitionMethod: "imported",
  }, { now: NOW });

  assert.equal(setOf(updated).morphProfile.knownForms.length, 1);
  assert.equal(setOf(updated).morphProfile.knownForms[0].id, "known-wolf");
  assert.equal(
    setOf(updated).morphProfile.catalogHistory.at(-1).data.identityResolution.matchedBy,
    "templateId",
  );
});

test("exact external id resolves an unresolved imported form without name matching", () => {
  const character = createCharacterWithCatalog({
    knownForms: [{
      id: "known-external",
      templateId: null,
      externalIds: { gcs: "external-17" },
      name: "Forma antiga",
      acquisitionMethod: "imported",
    }],
  });
  const updated = registerMorphKnownForm(character, "set-morph-a", {
    id: "incoming-external",
    templateId: "template-owl",
    externalIds: { gcs: "external-17" },
    name: "Coruja",
    acquisitionMethod: "imported",
  }, { now: NOW });
  const stored = setOf(updated).morphProfile.knownForms[0];

  assert.equal(stored.id, "known-external");
  assert.equal(stored.templateId, "template-owl");
  assert.equal(findMorphKnownFormsByExternalId(setOf(updated), "gcs", "external-17").length, 1);
  assert.equal(
    setOf(updated).morphProfile.catalogHistory.at(-1).data.identityResolution.matchedBy,
    "externalIds",
  );
});

test("conflicting exact signals block instead of selecting arbitrarily", () => {
  const character = createCharacterWithCatalog({
    knownForms: [
      {
        id: "known-wolf",
        templateId: "template-wolf",
        externalIds: { gcs: "wolf" },
        name: "Lobo",
      },
      {
        id: "known-bat",
        templateId: "template-bat",
        externalIds: { gcs: "bat" },
        name: "Morcego",
      },
    ],
  });
  const analysis = analyzeMorphCatalogOperation(character, "set-morph-a", {
    type: "acquire-form",
    knownForm: {
      id: "incoming",
      templateId: "template-wolf",
      externalIds: { gcs: "bat" },
      name: "Ambígua",
    },
  }, { now: NOW });

  assert.equal(analysis.status, "blocked");
  assert.equal(
    analysis.reasons.some(reason => reason.code === "morph-known-form-identity-conflict"),
    true,
  );
  assert.equal(setOf(character).morphProfile.knownForms.length, 2);
});

test("duplicate exact external evidence is reported as ambiguous", () => {
  const character = createCharacterWithCatalog({
    knownForms: [
      { id: "known-a", templateId: null, externalIds: { source: "same" }, name: "A" },
      { id: "known-b", templateId: null, externalIds: { source: "same" }, name: "B" },
    ],
  });
  const resolution = resolveMorphKnownFormIdentity(
    setOf(character),
    {
      id: "incoming",
      templateId: null,
      externalIds: { source: "same" },
    },
    { explicitKnownFormId: "incoming" },
  );

  assert.equal(resolution.status, "ambiguous");
  assert.equal(resolution.reasons[0].knownFormIds.length, 2);
});

test("equal names alone never create an identity link", () => {
  let character = createCharacterWithCatalog();
  character = registerMorphKnownForm(character, "set-morph-a", {
    id: "known-a",
    templateId: null,
    name: "Forma sem identidade",
  }, { now: NOW });
  character = registerMorphKnownForm(character, "set-morph-a", {
    id: "known-b",
    templateId: null,
    name: "Forma sem identidade",
  }, { now: "2026-06-20T14:01:00.000Z" });

  assert.equal(setOf(character).morphProfile.knownForms.length, 2);
});

test("reacquisition is idempotent for catalog identity and does not materialize or activate", () => {
  let character = createCharacterWithCatalog({ twoSets: true });
  const beforeTemplates = serializeCharacter(character).templates;
  const beforeSetB = structuredClone(setOf(character, "set-morph-b"));

  character = registerMorphKnownForm(character, "set-morph-a", {
    id: "known-wolf",
    templateId: "template-wolf",
    name: "Lobo",
    acquisitionMethod: "manual",
  }, { now: NOW });
  character = registerMorphKnownForm(character, "set-morph-a", {
    id: "incoming-wolf",
    templateId: "template-wolf",
    externalIds: { gcs: "wolf-003" },
    name: "Lobo",
    acquisitionMethod: "imported",
  }, { now: "2026-06-20T14:02:00.000Z" });

  const setA = setOf(character);
  assert.equal(setA.morphProfile.knownForms.length, 1);
  assert.equal(setA.forms.length, 1);
  assert.equal(setA.activeFormId, "form-base-a");
  assert.deepEqual(serializeCharacter(character).templates, beforeTemplates);
  assert.deepEqual(setOf(character, "set-morph-b"), beforeSetB);
});

test("re-memorizing a retained form at full capacity needs no replacement", () => {
  const character = createCharacterWithCatalog({
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
  const analysis = analyzeMorphCatalogOperation(character, "set-morph-a", {
    type: "memorize-form",
    knownForm: {
      id: "incoming-wolf",
      templateId: "template-wolf",
      name: "Lobo",
    },
    originalPresent: true,
    concentrationSeconds: 60,
  }, { now: "2026-06-20T14:03:00.000Z" });

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.capacityEvaluation.requiredSlots, 0);
  assert.equal(analysis.capacityEvaluation.projectedUsed, 1);

  const result = memorizeMorphForm(character, "set-morph-a", {
    id: "incoming-wolf",
    templateId: "template-wolf",
    name: "Lobo",
  }, {
    now: "2026-06-20T14:03:00.000Z",
    originalPresent: true,
    concentrationSeconds: 60,
  });
  assert.equal(setOf(result.character).morphProfile.knownForms.length, 1);
});

test("restoring a forgotten identity consumes a slot and requires replacement when full", () => {
  const character = createCharacterWithCatalog({
    iq: 1,
    knownForms: [
      {
        id: "known-wolf",
        templateId: "template-wolf",
        name: "Lobo",
        state: "forgotten",
      },
      {
        id: "known-bat",
        templateId: "template-bat",
        name: "Morcego",
        state: "available",
      },
    ],
  });
  const analysis = analyzeMorphCatalogOperation(character, "set-morph-a", {
    type: "memorize-form",
    knownForm: {
      id: "incoming-wolf",
      templateId: "template-wolf",
      name: "Lobo",
    },
    originalPresent: true,
    concentrationSeconds: 60,
  }, { now: NOW });

  assert.equal(analysis.status, "pending");
  assert.equal(analysis.capacityEvaluation.requiredSlots, 1);
  assert.equal(
    analysis.reasons.some(reason => reason.code === "morph-memorization-replacement-required"),
    true,
  );
});

test("all retained catalog entries occupy capacity regardless of provenance; forgotten entries do not", () => {
  const character = createCharacterWithCatalog({
    knownForms: [
      { id: "manual", templateId: null, name: "Manual", acquisitionMethod: "manual" },
      { id: "imported", templateId: null, name: "Importada", acquisitionMethod: "imported", state: "unavailable" },
      { id: "observed", templateId: null, name: "Observada", acquisitionMethod: "observed" },
      { id: "forgotten", templateId: null, name: "Esquecida", acquisitionMethod: "memorized", state: "forgotten" },
    ],
  });

  assert.equal(countOccupiedMorphMemorySlots(setOf(character)), 3);
});
