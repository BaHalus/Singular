import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import {
  analyzeMorphKnownFormMaterialization,
  materializeMorphKnownForm,
  MorphKnownFormMaterializationError,
} from "./MorphKnownFormMaterialization.js";

function createMorphCharacter({
  knownFormState = "available",
  templateId = "template-wolf",
  templateImportedPoints = 45,
} = {}) {
  return createCharacter({
    identity: {
      id: "char-morph-materialization",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    advantages: [
      {
        id: "adv-morph",
        name: "Morfose",
      },
    ],
    templates: templateId === null ? [] : [
      {
        id: templateId,
        templateType: "form",
        name: "Lobo",
        importedPoints: templateImportedPoints,
        tags: ["animal"],
        traits: {
          advantages: [
            {
              id: "adv-wolf-senses",
              name: "Olfato Discriminatório",
            },
          ],
        },
      },
    ],
    alternateFormSets: [
      {
        id: "set-morph",
        name: "Morfose",
        mechanism: "morph",
        sourceTraitId: "adv-morph",
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
              templateId,
              name: "Lobo Cinzento",
              acquisitionMethod: "observed",
              acquiredAt: "2026-06-19T10:00:00.000Z",
              state: knownFormState,
              notes: "Forma observada nas montanhas.",
              tags: ["conhecida"],
              externalIds: {
                gcs: "external-wolf",
              },
            },
          ],
        },
      },
    ],
  });
}

test("materializes one available known form without activating it", () => {
  const character = createMorphCharacter();
  const result = materializeMorphKnownForm(
    character,
    "set-morph",
    "known-wolf",
    { now: "2026-06-19T12:00:00.000Z" },
  );
  const set = result.character.alternateFormSets[0];
  const form = set.forms.find(item => item.id === result.formId);

  assert.equal(result.status, "materialized");
  assert.equal(result.changed, true);
  assert.equal(character.alternateFormSets[0].forms.length, 1);
  assert.equal(set.forms.length, 2);
  assert.equal(set.activeFormId, "form-base");
  assert.equal(form.name, "Lobo Cinzento");
  assert.equal(form.templateId, "template-wolf");
  assert.equal(form.morphKnownFormId, "known-wolf");
  assert.equal(form.morphMaterialization.knownFormId, "known-wolf");
  assert.equal(form.morphMaterialization.templateId, "template-wolf");
  assert.equal(
    form.morphMaterialization.materializedAt,
    "2026-06-19T12:00:00.000Z",
  );
  assert.deepEqual(form.tags, ["conhecida", "animal"]);
  assert.equal(result.analysis.pointLimitEvaluation.enforced, false);
  assert.equal(
    result.analysis.pointLimitEvaluation.status,
    "deferred-to-dom-morph-1.5",
  );
});

test("materialization is idempotent while source template is unchanged", () => {
  const first = materializeMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
    { now: "2026-06-19T12:00:00.000Z" },
  );
  const second = materializeMorphKnownForm(
    first.character,
    "set-morph",
    "known-wolf",
    { now: "2026-06-19T12:05:00.000Z" },
  );

  assert.equal(second.status, "already-materialized");
  assert.equal(second.changed, false);
  assert.equal(second.character, first.character);
  assert.equal(second.character.alternateFormSets[0].forms.length, 2);
});

test("blocks unavailable and forgotten known forms", () => {
  for (const state of ["unavailable", "forgotten"]) {
    const analysis = analyzeMorphKnownFormMaterialization(
      createMorphCharacter({ knownFormState: state }),
      "set-morph",
      "known-wolf",
    );

    assert.equal(analysis.status, "blocked");
    assert.equal(
      analysis.reasons.includes(`morph-known-form-${state}`),
      true,
    );
    assert.throws(
      () => materializeMorphKnownForm(
        createMorphCharacter({ knownFormState: state }),
        "set-morph",
        "known-wolf",
      ),
      error => (
        error instanceof MorphKnownFormMaterializationError &&
        error.code === "KNOWN_FORM_BLOCKED"
      ),
    );
  }
});

test("keeps unresolved imported form pending without inventing a template", () => {
  const character = createMorphCharacter({ templateId: null });
  const analysis = analyzeMorphKnownFormMaterialization(
    character,
    "set-morph",
    "known-wolf",
  );

  assert.equal(analysis.status, "pending");
  assert.deepEqual(analysis.reasons, ["morph-known-form-template-unresolved"]);
  assert.throws(
    () => materializeMorphKnownForm(
      character,
      "set-morph",
      "known-wolf",
    ),
    error => (
      error instanceof MorphKnownFormMaterializationError &&
      error.code === "KNOWN_FORM_PENDING"
    ),
  );
});

test("detects stale template materialization and refreshes only explicitly", () => {
  const first = materializeMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
    { now: "2026-06-19T12:00:00.000Z" },
  );
  const changedTemplate = createCharacter({
    ...first.character,
    templates: first.character.templates.map(template => (
      template.id === "template-wolf"
        ? {
          ...template,
          notes: "Template revisado.",
          importedPoints: 47,
        }
        : template
    )),
  });
  const analysis = analyzeMorphKnownFormMaterialization(
    changedTemplate,
    "set-morph",
    "known-wolf",
  );

  assert.equal(analysis.status, "blocked");
  assert.equal(analysis.reasons.includes("morph-materialization-stale"), true);
  assert.throws(
    () => materializeMorphKnownForm(
      changedTemplate,
      "set-morph",
      "known-wolf",
    ),
    error => error.code === "KNOWN_FORM_BLOCKED",
  );

  const refreshed = materializeMorphKnownForm(
    changedTemplate,
    "set-morph",
    "known-wolf",
    {
      now: "2026-06-19T12:10:00.000Z",
      refresh: true,
    },
  );

  assert.equal(refreshed.status, "refreshed");
  assert.equal(refreshed.character.alternateFormSets[0].forms.length, 2);
  assert.equal(
    refreshed.form.morphMaterialization.materializedAt,
    "2026-06-19T12:10:00.000Z",
  );
  assert.equal(
    refreshed.analysis.pointLimitEvaluation.templateImportedPoints,
    47,
  );
});

test("materialized form and provenance survive Character serialization", () => {
  const result = materializeMorphKnownForm(
    createMorphCharacter(),
    "set-morph",
    "known-wolf",
    { now: "2026-06-19T12:00:00.000Z" },
  );
  const restored = createCharacter(serializeCharacter(result.character));
  const form = restored.alternateFormSets[0].forms.find(item => (
    item.morphKnownFormId === "known-wolf"
  ));

  assert.equal(form.templateId, "template-wolf");
  assert.equal(form.morphMaterialization.knownFormId, "known-wolf");
  assert.equal(form.morphMaterialization.acquisitionMethod, "observed");
  assert.equal(form.morphMaterialization.externalIds.gcs, "external-wolf");
});
