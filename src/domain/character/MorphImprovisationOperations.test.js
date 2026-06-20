import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import {
  analyzeMorphImprovisation,
  planMorphImprovisation,
  executeMorphImprovisationPlan,
  materializeMorphImprovisedForm,
  prepareMorphImprovisedTransition,
  discardMorphImprovisedForm,
} from "./MorphImprovisationOperations.js";

const NOW = "2026-06-20T21:00:00.000Z";

function createMorphCharacter({
  modifiers = [{ id: "mod-improvised", name: "Formas Improvisadas" }],
  secondSet = false,
  manualOverride = null,
} = {}) {
  let character = createCharacter({
    identity: {
      id: "char-morph-improvisation",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    advantages: [{ id: "adv-morph", name: "Morfose", modifiers }],
    alternateFormSets: [
      {
        id: "set-morph",
        name: "Morfose",
        mechanism: "morph",
        sourceTraitId: "adv-morph",
        baseFormId: "form-base",
        activeFormId: "form-base",
        forms: [{ id: "form-base", name: "Forma natural" }],
      },
      ...(secondSet ? [{
        id: "set-alternate",
        name: "Forma Alternativa",
        mechanism: "alternateForm",
        baseFormId: "alternate-base",
        activeFormId: "alternate-base",
        forms: [{ id: "alternate-base", name: "Forma natural" }],
      }] : []),
    ],
    metadata: {
      createdAt: "2026-06-20T08:00:00.000Z",
      updatedAt: "2026-06-20T08:00:00.000Z",
      source: "singular",
    },
  });

  character = applyResolvedMorphProfile(character, "set-morph", {
    now: NOW,
    ...(manualOverride === null ? {} : { manualOverride }),
  }).character;
  return character;
}

function validDraft(overrides = {}) {
  const evidence = overrides.evidence ?? {};
  return {
    id: overrides.id ?? "improvisation-winged",
    name: overrides.name ?? "Predador Alado",
    source: overrides.source ?? "manual",
    template: {
      id: overrides.templateId ?? "improvisation-winged-template",
      templateType: "form",
      name: overrides.templateName ?? "Predador Alado",
      importedPoints: Object.hasOwn(overrides, "importedPoints")
        ? overrides.importedPoints
        : 45,
      tags: ["animal"],
    },
    evidence: {
      physicalNaturalOnly: evidence.physicalNaturalOnly ?? true,
      allCharacteristicsExistInSetting:
        evidence.allCharacteristicsExistInSetting ?? true,
      changesComposition: evidence.changesComposition ?? false,
      conditionsSatisfied: evidence.conditionsSatisfied ?? true,
    },
    notes: overrides.notes ?? "Combinação transitória.",
    tags: overrides.tags ?? ["sessão"],
  };
}

function morphSet(character) {
  return character.alternateFormSets.find(set => set.id === "set-morph");
}

test("standard improvised form exposes canonical point-limit analysis", () => {
  const analysis = analyzeMorphImprovisation(
    createMorphCharacter(),
    "set-morph",
    validDraft(),
  );

  assert.equal(analysis.status, "ready");
  assert.deepEqual(analysis.reasons, []);
  assert.equal(analysis.pointLimitEvaluation.enforced, false);
  assert.equal(analysis.pointLimitEvaluation.complete, false);
  assert.equal(analysis.pointLimitEvaluation.status, "pending");
  assert.equal(
    analysis.pointLimitEvaluation.reasons.includes("morph-point-limit-undeclared"),
    true,
  );
  assert.equal(analysis.pointLimitEvaluation.templateImportedPoints, 45);
});

test("finite improvisation limit is evaluated during analysis", () => {
  const analysis = analyzeMorphImprovisation(
    createMorphCharacter({
      manualOverride: {
        pointLimitMode: "limited",
        pointLimit: 40,
        pointLimitSource: "manual",
      },
    }),
    "set-morph",
    validDraft({ importedPoints: 45 }),
  );

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.pointLimitEvaluation.status, "blocked");
  assert.equal(analysis.pointLimitEvaluation.generalExcessPoints, 5);
  assert.equal(
    analysis.pointLimitEvaluation.reasons.includes("morph-point-limit-exceeded"),
    true,
  );
});

test("standard improvisation blocks traits absent from the setting", () => {
  const analysis = analyzeMorphImprovisation(
    createMorphCharacter(),
    "set-morph",
    validDraft({ evidence: { allCharacteristicsExistInSetting: false } }),
  );

  assert.equal(analysis.status, "blocked");
  assert.equal(
    analysis.reasons.includes("morph-improvisation-characteristic-not-in-setting"),
    true,
  );
});

test("Cosmic allows out-of-setting traits but not nonphysical traits", () => {
  const character = createMorphCharacter({
    modifiers: [
      { id: "mod-improvised", name: "Formas Improvisadas" },
      { id: "mod-cosmic", name: "Cósmica (Para Formas Improvisadas)" },
    ],
  });
  const outOfSetting = analyzeMorphImprovisation(
    character,
    "set-morph",
    validDraft({ evidence: { allCharacteristicsExistInSetting: false } }),
  );
  const nonphysical = analyzeMorphImprovisation(
    character,
    "set-morph",
    validDraft({
      id: "improvisation-mental",
      evidence: { physicalNaturalOnly: false },
    }),
  );

  assert.equal(outOfSetting.status, "ready");
  assert.equal(nonphysical.status, "blocked");
  assert.equal(
    nonphysical.reasons.includes("morph-improvisation-nonphysical-characteristic"),
    true,
  );
});

test("Ilimitada allows composition changes but keeps physical-natural restriction", () => {
  const character = createMorphCharacter({
    modifiers: [
      { id: "mod-improvised", name: "Formas Improvisadas" },
      { id: "mod-unlimited", name: "Ilimitada" },
    ],
  });
  const elemental = analyzeMorphImprovisation(
    character,
    "set-morph",
    validDraft({ evidence: { changesComposition: true } }),
  );
  const nonphysical = analyzeMorphImprovisation(
    character,
    "set-morph",
    validDraft({
      id: "improvisation-nonphysical",
      evidence: { physicalNaturalOnly: false, changesComposition: true },
    }),
  );

  assert.equal(elemental.status, "ready");
  assert.equal(nonphysical.status, "blocked");
});

test("missing evidence remains pending instead of being invented", () => {
  const analysis = analyzeMorphImprovisation(
    createMorphCharacter(),
    "set-morph",
    {
      ...validDraft(),
      evidence: {
        physicalNaturalOnly: null,
        allCharacteristicsExistInSetting: null,
        changesComposition: null,
        conditionsSatisfied: true,
      },
    },
  );

  assert.equal(analysis.status, "pending");
  assert.equal(
    analysis.reasons.includes(
      "morph-improvisation-physical-natural-evidence-unknown",
    ),
    true,
  );
  assert.equal(
    analysis.reasons.includes("morph-improvisation-setting-evidence-unknown"),
    true,
  );
  assert.equal(
    analysis.reasons.includes("morph-improvisation-composition-evidence-unknown"),
    true,
  );
});

test("materialization is transient and does not alter templates or known forms", () => {
  const character = createMorphCharacter({ secondSet: true });
  const beforeTemplates = structuredClone(character.templates);
  const beforeKnownForms = structuredClone(morphSet(character).morphProfile.knownForms);
  const beforeAlternate = structuredClone(
    character.alternateFormSets.find(set => set.id === "set-alternate"),
  );

  const result = materializeMorphImprovisedForm(
    character,
    "set-morph",
    validDraft(),
    { now: NOW, formId: "form-improvised-winged" },
  );
  const set = morphSet(result.character);
  const form = set.forms.find(item => item.id === "form-improvised-winged");

  assert.equal(result.status, "materialized");
  assert.equal(set.activeFormId, "form-base");
  assert.equal(form.templateId, null);
  assert.equal(form.morphKnownFormId, null);
  assert.equal(form.morphMaterialization, null);
  assert.equal(form.morphImprovisation.improvisationId, "improvisation-winged");
  assert.equal(form.morphImprovisation.draft.template.importedPoints, 45);
  assert.equal(form.morphImprovisation.pointLimitEvaluation.status, "pending");
  assert.deepEqual(result.character.templates, beforeTemplates);
  assert.deepEqual(set.morphProfile.knownForms, beforeKnownForms);
  assert.deepEqual(
    result.character.alternateFormSets.find(item => item.id === "set-alternate"),
    beforeAlternate,
  );
});

test("same draft materializes idempotently", () => {
  const first = materializeMorphImprovisedForm(
    createMorphCharacter(),
    "set-morph",
    validDraft(),
    { now: NOW },
  );
  const second = materializeMorphImprovisedForm(
    first.character,
    "set-morph",
    validDraft(),
    { now: "2026-06-20T21:01:00.000Z" },
  );

  assert.equal(second.status, "already-materialized");
  assert.equal(second.changed, false);
  assert.equal(morphSet(second.character).forms.length, 2);
});

test("active improvisation cannot be refreshed or discarded", () => {
  const materialized = materializeMorphImprovisedForm(
    createMorphCharacter(),
    "set-morph",
    validDraft(),
    { now: NOW, formId: "form-active-improvised" },
  );
  const active = createCharacter({
    ...materialized.character,
    alternateFormSets: materialized.character.alternateFormSets.map(set => (
      set.id === "set-morph"
        ? { ...set, activeFormId: "form-active-improvised" }
        : set
    )),
  });
  const changedDraft = validDraft({ notes: "Versão alterada." });
  const analysis = analyzeMorphImprovisation(active, "set-morph", changedDraft);

  assert.equal(analysis.status, "blocked");
  assert.equal(
    analysis.reasons.includes("morph-active-improvisation-cannot-refresh"),
    true,
  );
  assert.throws(() => materializeMorphImprovisedForm(
    active,
    "set-morph",
    changedDraft,
    { now: "2026-06-20T21:02:00.000Z" },
  ));
  assert.throws(() => discardMorphImprovisedForm(
    active,
    "set-morph",
    "form-active-improvised",
    { now: "2026-06-20T21:02:00.000Z" },
  ));
});

test("stale plan is rejected when the improvisation policy changes", () => {
  const character = createMorphCharacter();
  const plan = planMorphImprovisation(
    character,
    "set-morph",
    validDraft(),
    { now: NOW, planId: "plan-stale" },
  );
  const changed = createCharacter({
    ...character,
    alternateFormSets: character.alternateFormSets.map(set => (
      set.id === "set-morph"
        ? {
          ...set,
          morphProfile: {
            ...set.morphProfile,
            improvisation: {
              ...set.morphProfile.improvisation,
              mode: "forbidden",
            },
          },
        }
        : set
    )),
  });

  assert.throws(() => executeMorphImprovisationPlan(changed, plan));
});

test("prepared improvised transition uses the existing FormTransitionPlanner", () => {
  const prepared = prepareMorphImprovisedTransition(
    createMorphCharacter(),
    "set-morph",
    validDraft(),
    {},
    { now: NOW, formId: "form-transition-improvised" },
  );

  assert.equal(prepared.formId, "form-transition-improvised");
  assert.equal(prepared.plan.targetFormId, "form-transition-improvised");
  assert.equal(
    prepared.plan.morphSelection.improvisationId,
    "improvisation-winged",
  );
  assert.equal(prepared.plan.morphSelection.status, "ready");
  assert.equal(
    prepared.plan.morphSelection.pointLimitEvaluation.enforced,
    false,
  );
  assert.equal(
    prepared.plan.morphSelection.pointLimitEvaluation.status,
    "pending",
  );
});

test("save and load preserve the embedded improvised template and provenance", () => {
  const materialized = materializeMorphImprovisedForm(
    createMorphCharacter(),
    "set-morph",
    validDraft(),
    { now: NOW },
  );
  const payload = serializeCharacter(materialized.character);
  const restored = createCharacter(payload);
  const projection = morphSet(restored).forms
    .find(form => form.morphImprovisation !== null)
    .morphImprovisation;

  assert.equal(projection.improvisationId, "improvisation-winged");
  assert.equal(projection.draft.template.name, "Predador Alado");
  assert.equal(projection.draft.template.importedPoints, 45);
  assert.equal(projection.materializedAt, NOW);
  assert.equal(projection.pointLimitEvaluation.status, "pending");
});

test("discard removes only an inactive improvised projection", () => {
  const materialized = materializeMorphImprovisedForm(
    createMorphCharacter(),
    "set-morph",
    validDraft(),
    { now: NOW, formId: "form-discardable" },
  );
  const discarded = discardMorphImprovisedForm(
    materialized.character,
    "set-morph",
    "form-discardable",
    { now: "2026-06-20T21:03:00.000Z" },
  );

  assert.equal(morphSet(discarded).forms.length, 1);
  assert.equal(morphSet(discarded).forms[0].id, "form-base");
});

test("Forma Alternativa cannot receive an improvised Morfose projection", () => {
  const character = createMorphCharacter({ secondSet: true });

  assert.throws(() => materializeMorphImprovisedForm(
    character,
    "set-alternate",
    validDraft(),
    { now: NOW },
  ));
});
