import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  registerMorphKnownForm,
  forgetMorphKnownForm,
  restoreMorphKnownForm,
  setMorphKnownFormAvailability,
  setMorphPointLimit,
  findMorphKnownForm,
  findMorphKnownFormByTemplate,
  listAvailableMorphKnownForms,
} from "./MorphCatalogOperations.js";

function createMorphCharacter() {
  return createCharacter({
    identity: {
      id: "char-morph-catalog",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Lobo",
      },
      {
        id: "template-bat",
        templateType: "form",
        name: "Morcego",
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
      {
        id: "set-alternate",
        name: "Forma Alternativa",
        mechanism: "alternateForm",
        baseFormId: "alt-base",
        activeFormId: "alt-base",
        forms: [
          {
            id: "alt-base",
            name: "Forma natural",
          },
        ],
      },
    ],
    metadata: {
      createdAt: "2026-06-19T08:00:00.000Z",
      updatedAt: "2026-06-19T08:00:00.000Z",
      source: "singular",
    },
  });
}

test("registers known form immutably", () => {
  const character = createMorphCharacter();
  const updated = registerMorphKnownForm(
    character,
    "set-morph",
    {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "observed",
    },
    { now: "2026-06-19T12:00:00.000Z" },
  );

  assert.deepEqual(
    character.alternateFormSets[0].morphProfile.knownForms,
    [],
  );
  assert.equal(
    updated.alternateFormSets[0].morphProfile.knownForms[0].id,
    "known-wolf",
  );
  assert.equal(
    updated.alternateFormSets[0].morphProfile.knownForms[0].acquiredAt,
    "2026-06-19T12:00:00.000Z",
  );
  assert.equal(updated.metadata.updatedAt, "2026-06-19T12:00:00.000Z");
});

test("rejects missing template and reuses exact template identity", () => {
  const character = createMorphCharacter();

  assert.throws(() => registerMorphKnownForm(
    character,
    "set-morph",
    {
      id: "known-missing",
      templateId: "missing-template",
      name: "Desconhecida",
    },
  ));

  const withWolf = registerMorphKnownForm(
    character,
    "set-morph",
    {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
    },
  );
  const reacquired = registerMorphKnownForm(
    withWolf,
    "set-morph",
    {
      id: "known-wolf-imported",
      templateId: "template-wolf",
      name: "Outro Lobo",
      acquisitionMethod: "imported",
      externalIds: { gcs: "wolf-001" },
    },
  );
  const profile = reacquired.alternateFormSets[0].morphProfile;

  assert.equal(profile.knownForms.length, 1);
  assert.equal(profile.knownForms[0].id, "known-wolf");
  assert.equal(profile.knownForms[0].externalIds.gcs, "wolf-001");
  assert.equal(profile.catalogHistory.at(-1).data.reused, true);
});

test("forgets and restores known form without deleting provenance", () => {
  const withWolf = registerMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
      acquisitionMethod: "memorized",
    },
  );
  const forgotten = forgetMorphKnownForm(
    withWolf,
    "set-morph",
    "known-wolf",
  );

  assert.equal(
    forgotten.alternateFormSets[0].morphProfile.knownForms[0].state,
    "forgotten",
  );
  assert.equal(
    forgotten.alternateFormSets[0].morphProfile.knownForms[0].acquisitionMethod,
    "memorized",
  );
  assert.equal(listAvailableMorphKnownForms(forgotten, "set-morph").length, 0);

  const restored = restoreMorphKnownForm(
    forgotten,
    "set-morph",
    "known-wolf",
  );

  assert.equal(
    restored.alternateFormSets[0].morphProfile.knownForms[0].state,
    "available",
  );
  assert.equal(listAvailableMorphKnownForms(restored, "set-morph").length, 1);
});

test("temporarily marks known form unavailable", () => {
  const withWolf = registerMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
    },
  );
  const unavailable = setMorphKnownFormAvailability(
    withWolf,
    "set-morph",
    "known-wolf",
    false,
  );

  assert.equal(
    unavailable.alternateFormSets[0].morphProfile.knownForms[0].state,
    "unavailable",
  );
  assert.deepEqual(listAvailableMorphKnownForms(unavailable, "set-morph"), []);
});

test("updates declared point limit without calculating it locally", () => {
  const updated = setMorphPointLimit(
    createMorphCharacter(),
    "set-morph",
    80,
    "campaign",
    { now: "2026-06-19T13:00:00.000Z" },
  );

  assert.equal(updated.alternateFormSets[0].morphProfile.pointLimit, 80);
  assert.equal(
    updated.alternateFormSets[0].morphProfile.pointLimitSource,
    "campaign",
  );
});

test("finds catalog entries by own id and template id", () => {
  const character = registerMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    {
      id: "known-bat",
      templateId: "template-bat",
      name: "Morcego",
    },
  );
  const set = character.alternateFormSets[0];

  assert.equal(findMorphKnownForm(set, "known-bat").name, "Morcego");
  assert.equal(
    findMorphKnownFormByTemplate(set, "template-bat").id,
    "known-bat",
  );
});

test("rejects Morfose operations on Forma Alternativa set", () => {
  assert.throws(() => registerMorphKnownForm(
    createMorphCharacter(),
    "set-alternate",
    {
      id: "known-wolf",
      templateId: "template-wolf",
      name: "Lobo",
    },
  ));
});
