import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

test("Morfose set receives profile and survives Character serialization", () => {
  const character = createCharacter({
    identity: {
      id: "char-morph",
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
        importedPoints: 45,
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
        morphProfile: {
          pointLimit: 50,
          pointLimitSource: "manual",
          knownForms: [
            {
              id: "known-wolf",
              templateId: "template-wolf",
              name: "Lobo",
              acquisitionMethod: "manual",
            },
          ],
        },
      },
    ],
  });

  const set = character.alternateFormSets[0];

  assert.equal(set.mechanism, "morph");
  assert.equal(set.morphProfile.pointLimit, 50);
  assert.equal(set.morphProfile.knownForms[0].templateId, "template-wolf");

  const json = serializeCharacter(character);
  assert.equal(json.alternateFormSets[0].morphProfile.pointLimit, 50);
  assert.equal(
    json.alternateFormSets[0].morphProfile.knownForms[0].templateId,
    "template-wolf",
  );
});

test("Morfose set receives an empty profile when none is supplied", () => {
  const character = createCharacter({
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

  assert.deepEqual(
    character.alternateFormSets[0].morphProfile.knownForms,
    [],
  );
});

test("Forma Alternativa set cannot carry Morfose profile", () => {
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
          pointLimit: 50,
        },
      },
    ],
  });

  assert.equal(character.alternateFormSets[0].morphProfile, null);
});

test("rejects known form reference to missing Character template", () => {
  assert.throws(() => createCharacter({
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
        morphProfile: {
          knownForms: [
            {
              id: "known-wolf",
              templateId: "missing-template",
              name: "Lobo",
            },
          ],
        },
      },
    ],
  }));
});

test("allows unresolved imported known form with null templateId", () => {
  const character = createCharacter({
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
        morphProfile: {
          knownForms: [
            {
              id: "known-unresolved",
              templateId: null,
              externalIds: {
                gcs: "external-form-1",
              },
              name: "Forma não resolvida",
              acquisitionMethod: "imported",
            },
          ],
        },
      },
    ],
  });

  assert.equal(
    character.alternateFormSets[0].morphProfile.knownForms[0].templateId,
    null,
  );
});
