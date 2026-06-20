import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import {
  analyzeMorphKnownFormMaterialization,
  materializeMorphKnownForm,
} from "./MorphKnownFormMaterialization.js";
import {
  analyzeMorphImprovisation,
  prepareMorphImprovisedTransition,
} from "./MorphImprovisationOperations.js";
import { prepareMorphKnownFormTransition } from "./MorphKnownFormSelection.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import {
  executeFormTransition,
  FormTransitionExecutionError,
} from "./FormTransitionExecutor.js";

const CREATED_AT = "2026-06-20T20:00:00.000Z";
const EXECUTED_AT = "2026-06-20T20:10:00.000Z";

function createKnownCharacter({
  pointLimit = 50,
  templatePoints = 45,
  characterId = "char-gate-known",
} = {}) {
  return createCharacter({
    identity: {
      id: characterId,
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    templates: [{
      id: "template-gate-wolf",
      templateType: "form",
      name: "Lobo de Gate",
      importedPoints: templatePoints,
      tags: ["gate"],
    }],
    alternateFormSets: [{
      id: "set-gate-known",
      name: "Morfose conhecida",
      mechanism: "morph",
      baseFormId: "form-gate-base",
      activeFormId: "form-gate-base",
      forms: [{ id: "form-gate-base", name: "Forma natural" }],
      morphProfile: {
        pointLimitMode: "limited",
        pointLimit,
        pointLimitSource: "manual",
        knownForms: [{
          id: "known-gate-wolf",
          templateId: "template-gate-wolf",
          name: "Lobo de Gate",
          acquisitionMethod: "manual",
          state: "available",
          externalIds: { gate: "known-wolf" },
        }],
      },
    }],
    metadata: {
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      source: "singular",
    },
  });
}

function createImprovisedCharacter() {
  return createCharacter({
    identity: {
      id: "char-gate-improvised",
      name: "Mira",
      concept: "Metamorfa improvisadora",
      playerId: null,
      campaignId: null,
    },
    alternateFormSets: [{
      id: "set-gate-improvised",
      name: "Morfose improvisada",
      mechanism: "morph",
      baseFormId: "form-gate-base",
      activeFormId: "form-gate-base",
      forms: [{ id: "form-gate-base", name: "Forma natural" }],
      morphProfile: {
        pointLimitMode: "limited",
        pointLimit: 80,
        pointLimitSource: "manual",
        improvisation: {
          mode: "allowed",
          pointLimit: 40,
          traitScope: "physicalNatural",
          availabilityScope: "settingOnly",
          compositionScope: "sameComposition",
        },
      },
    }],
    metadata: {
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      source: "singular",
    },
  });
}

function improvisedDraft(points = 35) {
  return {
    id: "improvisation-gate-winged",
    name: "Predador Alado de Gate",
    source: "manual",
    template: {
      id: "template-gate-winged",
      templateType: "form",
      name: "Predador Alado de Gate",
      importedPoints: points,
      tags: ["gate"],
    },
    evidence: {
      physicalNaturalOnly: true,
      allCharacteristicsExistInSetting: true,
      changesComposition: false,
      conditionsSatisfied: true,
    },
  };
}

test("GATE-MORPH-CLOSE certifies known-form analysis execution receipt history and save/load", () => {
  const character = createKnownCharacter();
  const analysis = analyzeMorphKnownFormMaterialization(
    character,
    "set-gate-known",
    "known-gate-wolf",
  );
  const prepared = prepareMorphKnownFormTransition(
    character,
    "set-gate-known",
    "known-gate-wolf",
    {},
    { now: CREATED_AT, formId: "form-gate-known" },
  );
  const executed = executeFormTransition(
    prepared.character,
    prepared.plan,
    {
      now: EXECUTED_AT,
      executionId: "execution-gate-known",
      activationId: "activation-gate-known",
    },
  );
  const history = executed.character.formTransitionHistory.find(event => (
    event.executionId === "execution-gate-known"
  ));
  const restored = createCharacter(serializeCharacter(executed.character));
  const restoredSet = restored.alternateFormSets.find(set => set.id === "set-gate-known");
  const restoredForm = restoredSet.forms.find(form => form.id === "form-gate-known");
  const restoredHistory = restored.formTransitionHistory.find(event => (
    event.executionId === "execution-gate-known"
  ));

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.pointLimitEvaluation.status, "ready");
  assert.equal(analysis.pointLimitEvaluation.enforced, true);
  assert.equal(prepared.plan.status, "ready");
  assert.equal(prepared.plan.allowed, true);
  assert.equal(executed.receipt.morphKnownFormId, "known-gate-wolf");
  assert.equal(executed.receipt.morphImprovisationId, null);
  assert.equal(executed.receipt.targetTemplateId, "template-gate-wolf");
  assert.equal(executed.receipt.morphPointLimitEvaluation.status, "ready");
  assert.equal(history.data.morphKnownFormId, "known-gate-wolf");
  assert.equal(history.data.morphPointLimitEvaluation.effectivePointLimit, 50);
  assert.equal(restoredSet.activeFormId, "form-gate-known");
  assert.equal(restoredForm.morphMaterialization.knownFormId, "known-gate-wolf");
  assert.equal(restoredForm.morphMaterialization.externalIds.gate, "known-wolf");
  assert.equal(restoredHistory.data.morphKnownFormId, "known-gate-wolf");
  assert.equal(restoredHistory.data.morphPointLimitEvaluation.status, "ready");
});

test("GATE-MORPH-CLOSE certifies improvised analysis execution provenance history and save/load", () => {
  const character = createImprovisedCharacter();
  const draft = improvisedDraft();
  const analysis = analyzeMorphImprovisation(
    character,
    "set-gate-improvised",
    draft,
  );
  const prepared = prepareMorphImprovisedTransition(
    character,
    "set-gate-improvised",
    draft,
    {},
    { now: CREATED_AT, formId: "form-gate-improvised" },
  );
  const executed = executeFormTransition(
    prepared.character,
    prepared.plan,
    {
      now: EXECUTED_AT,
      executionId: "execution-gate-improvised",
      activationId: "activation-gate-improvised",
    },
  );
  const history = executed.character.formTransitionHistory.find(event => (
    event.executionId === "execution-gate-improvised"
  ));
  const restored = createCharacter(serializeCharacter(executed.character));
  const restoredSet = restored.alternateFormSets.find(
    set => set.id === "set-gate-improvised",
  );
  const restoredForm = restoredSet.forms.find(
    form => form.id === "form-gate-improvised",
  );
  const restoredHistory = restored.formTransitionHistory.find(event => (
    event.executionId === "execution-gate-improvised"
  ));

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.pointLimitEvaluation.status, "ready");
  assert.equal(analysis.pointLimitEvaluation.effectivePointLimit, 40);
  assert.equal(prepared.plan.status, "ready");
  assert.equal(prepared.plan.morphSelection.improvisationId, draft.id);
  assert.equal(executed.receipt.morphKnownFormId, null);
  assert.equal(executed.receipt.morphImprovisationId, draft.id);
  assert.equal(executed.receipt.targetTemplateId, null);
  assert.equal(executed.receipt.morphPointLimitEvaluation.status, "ready");
  assert.equal(history.data.morphImprovisationId, draft.id);
  assert.equal(history.data.morphPointLimitEvaluation.effectivePointLimit, 40);
  assert.equal(restoredSet.activeFormId, "form-gate-improvised");
  assert.equal(restoredForm.morphImprovisation.improvisationId, draft.id);
  assert.equal(
    restoredForm.morphImprovisation.draft.template.importedPoints,
    35,
  );
  assert.equal(restoredHistory.data.morphImprovisationId, draft.id);
  assert.equal(restoredHistory.data.morphPointLimitEvaluation.status, "ready");
});

test("GATE-MORPH-CLOSE rejects a plan made obsolete by a lower point limit atomically", () => {
  const original = createKnownCharacter({ pointLimit: 50, templatePoints: 45 });
  const prepared = prepareMorphKnownFormTransition(
    original,
    "set-gate-known",
    "known-gate-wolf",
    {},
    { now: CREATED_AT, formId: "form-gate-known" },
  );
  const changed = createCharacter({
    ...prepared.character,
    alternateFormSets: prepared.character.alternateFormSets.map(set => (
      set.id === "set-gate-known"
        ? {
          ...set,
          morphProfile: {
            ...set.morphProfile,
            pointLimit: 40,
          },
        }
        : set
    )),
  });
  const before = JSON.stringify(changed);

  assert.throws(
    () => executeFormTransition(changed, prepared.plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "REVALIDATION_FAILED" &&
      error.details.reasons.includes("morph-point-limit-exceeded")
    ),
  );
  assert.equal(JSON.stringify(changed), before);
  assert.equal(changed.alternateFormSets[0].activeFormId, "form-gate-base");
  assert.equal(changed.formTransitionHistory.length, 0);
});

test("GATE-MORPH-CLOSE keeps unknown template cost pending under a finite limit", () => {
  const character = createKnownCharacter({ templatePoints: null });
  const analysis = analyzeMorphKnownFormMaterialization(
    character,
    "set-gate-known",
    "known-gate-wolf",
  );
  const materialized = materializeMorphKnownForm(
    character,
    "set-gate-known",
    "known-gate-wolf",
    { now: CREATED_AT, formId: "form-gate-known" },
  );
  const plan = planFormTransition(
    materialized.character,
    "set-gate-known",
    "form-gate-known",
  );
  const before = JSON.stringify(materialized.character);

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.pointLimitEvaluation.status, "pending");
  assert.equal(
    analysis.pointLimitEvaluation.reasons.includes("morph-template-points-unknown"),
    true,
  );
  assert.equal(plan.status, "pending");
  assert.equal(plan.allowed, false);
  assert.equal(plan.reasons.includes("morph-template-points-unknown"), true);
  assert.throws(
    () => executeFormTransition(materialized.character, plan),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "PLAN_NOT_READY"
    ),
  );
  assert.equal(JSON.stringify(materialized.character), before);
});

test("GATE-MORPH-CLOSE preserves the generic Forma Alternativa pipeline", () => {
  const character = createCharacter({
    identity: {
      id: "char-gate-alternate",
      name: "Ari",
      concept: "Forma Alternativa",
      playerId: null,
      campaignId: null,
    },
    alternateFormSets: [{
      id: "set-gate-alternate",
      name: "Forma Alternativa",
      mechanism: "alternateForm",
      baseFormId: "form-gate-base",
      activeFormId: "form-gate-base",
      forms: [
        { id: "form-gate-base", name: "Forma natural" },
        { id: "form-gate-alternate", name: "Forma alternativa" },
      ],
    }],
  });
  const plan = planFormTransition(
    character,
    "set-gate-alternate",
    "form-gate-alternate",
  );
  const executed = executeFormTransition(character, plan, {
    now: EXECUTED_AT,
    executionId: "execution-gate-alternate",
  });

  assert.equal(plan.status, "ready");
  assert.equal(plan.morphSelection, null);
  assert.equal(executed.character.alternateFormSets[0].activeFormId, "form-gate-alternate");
  assert.equal(executed.receipt.morphKnownFormId, null);
  assert.equal(executed.receipt.morphImprovisationId, null);
  assert.equal(executed.receipt.morphPointLimitEvaluation, null);
});
