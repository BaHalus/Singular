import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { createMorphProfile } from "./MorphProfile.js";
import {
  applyMorphPointLimitToSelection,
  evaluateMorphPointLimit,
} from "./MorphPointLimit.js";
import { materializeMorphKnownForm } from "./MorphKnownFormMaterialization.js";
import { materializeMorphImprovisedForm } from "./MorphImprovisationOperations.js";
import { planFormTransition } from "./FormTransitionPlanner.js";

const NOW = "2026-06-20T22:00:00.000Z";

function limitedProfile(limit, improvisationPointLimit = null) {
  return createMorphProfile({
    pointLimitMode: "limited",
    pointLimit: limit,
    pointLimitSource: "manual",
    improvisation: {
      mode: "allowed",
      pointLimit: improvisationPointLimit,
      traitScope: "physicalNatural",
      availabilityScope: "settingOnly",
      compositionScope: "sameComposition",
    },
  });
}

function createKnownCharacter({
  pointLimitMode = "limited",
  pointLimit = 50,
  templatePoints = 45,
} = {}) {
  return createCharacter({
    identity: {
      id: "char-morph-point-limit-known",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    templates: [{
      id: "template-known-target",
      templateType: "form",
      name: "Forma conhecida",
      importedPoints: templatePoints,
    }],
    alternateFormSets: [{
      id: "set-morph-known",
      name: "Morfose",
      mechanism: "morph",
      baseFormId: "form-base",
      activeFormId: "form-base",
      forms: [{ id: "form-base", name: "Forma natural" }],
      morphProfile: {
        pointLimitMode,
        pointLimit: pointLimitMode === "limited" ? pointLimit : null,
        pointLimitSource: pointLimitMode === "undeclared" ? "undeclared" : "manual",
        knownForms: [{
          id: "known-target",
          templateId: "template-known-target",
          name: "Forma conhecida",
          acquisitionMethod: "manual",
          state: "available",
        }],
      },
    }],
    metadata: {
      createdAt: NOW,
      updatedAt: NOW,
      source: "singular",
    },
  });
}

function materializeKnown(character) {
  return materializeMorphKnownForm(
    character,
    "set-morph-known",
    "known-target",
    { now: NOW, formId: "form-known-target" },
  ).character;
}

function createImprovisedCharacter({
  pointLimitMode = "limited",
  pointLimit = 100,
  improvisationPointLimit = 40,
} = {}) {
  return createCharacter({
    identity: {
      id: "char-morph-point-limit-improvised",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    alternateFormSets: [{
      id: "set-morph-improvised",
      name: "Morfose",
      mechanism: "morph",
      baseFormId: "form-base",
      activeFormId: "form-base",
      forms: [{ id: "form-base", name: "Forma natural" }],
      morphProfile: {
        pointLimitMode,
        pointLimit: pointLimitMode === "limited" ? pointLimit : null,
        pointLimitSource: pointLimitMode === "undeclared" ? "undeclared" : "manual",
        improvisation: {
          mode: "allowed",
          pointLimit: improvisationPointLimit,
          traitScope: "physicalNatural",
          availabilityScope: "settingOnly",
          compositionScope: "sameComposition",
        },
      },
    }],
    metadata: {
      createdAt: NOW,
      updatedAt: NOW,
      source: "singular",
    },
  });
}

function improvisedDraft(points = 45) {
  return {
    id: "improvisation-point-limit",
    name: "Forma improvisada",
    template: {
      id: "template-improvised-point-limit",
      name: "Forma improvisada",
      importedPoints: points,
    },
    evidence: {
      physicalNaturalOnly: true,
      allCharacteristicsExistInSetting: true,
      changesComposition: false,
      conditionsSatisfied: true,
    },
  };
}

test("limited Morfose accepts a template at the ceiling", () => {
  const evaluation = evaluateMorphPointLimit(limitedProfile(50), 50);

  assert.equal(evaluation.status, "ready");
  assert.equal(evaluation.enforced, true);
  assert.equal(evaluation.complete, true);
  assert.equal(evaluation.effectivePointLimit, 50);
  assert.equal(evaluation.generalExcessPoints, 0);
  assert.deepEqual(evaluation.reasons, []);
});

test("limited Morfose blocks a template above the ceiling", () => {
  const evaluation = evaluateMorphPointLimit(limitedProfile(50), 61);

  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.generalExcessPoints, 11);
  assert.equal(
    evaluation.reasons.includes("morph-point-limit-exceeded"),
    true,
  );
});

test("unlimited Morfose does not require a finite template ceiling", () => {
  const profile = createMorphProfile({
    pointLimitMode: "unlimited",
    pointLimit: null,
    pointLimitSource: "modifier",
  });
  const evaluation = evaluateMorphPointLimit(profile, 1000);

  assert.equal(evaluation.status, "ready");
  assert.equal(evaluation.effectivePointLimit, null);
  assert.equal(evaluation.generalExcessPoints, null);
});

test("undeclared limit remains explicit and is not presented as enforced", () => {
  const evaluation = evaluateMorphPointLimit(createMorphProfile(), 45);
  const selection = applyMorphPointLimitToSelection({
    status: "ready",
    reasons: [],
    templateImportedPoints: 45,
    pointLimitEvaluation: null,
  }, evaluation);

  assert.equal(evaluation.status, "pending");
  assert.equal(evaluation.enforced, false);
  assert.equal(evaluation.enforcementMode, "none");
  assert.deepEqual(evaluation.reasons, ["morph-point-limit-undeclared"]);
  assert.equal(selection.status, "ready");
  assert.deepEqual(selection.reasons, []);
  assert.equal(selection.pointLimitEvaluation.status, "pending");
});

test("known target with unknown point value remains pending under a finite limit", () => {
  const evaluation = evaluateMorphPointLimit(limitedProfile(50), null);

  assert.equal(evaluation.status, "pending");
  assert.equal(
    evaluation.reasons.includes("morph-template-points-unknown"),
    true,
  );
});

test("improvisation uses the stricter of general and specific limits", () => {
  const evaluation = evaluateMorphPointLimit(
    limitedProfile(100, 40),
    45,
    { targetKind: "improvised" },
  );

  assert.equal(evaluation.effectivePointLimit, 40);
  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.generalExcessPoints, 0);
  assert.equal(evaluation.improvisationExcessPoints, 5);
  assert.equal(
    evaluation.reasons.includes("morph-improvisation-point-limit-exceeded"),
    true,
  );
});

test("transition planner blocks a known form above the resolved limit", () => {
  const character = materializeKnown(createKnownCharacter({
    pointLimit: 50,
    templatePoints: 60,
  }));
  const plan = planFormTransition(
    character,
    "set-morph-known",
    "form-known-target",
  );

  assert.equal(plan.status, "blocked");
  assert.equal(plan.allowed, false);
  assert.equal(
    plan.reasons.includes("morph-point-limit-exceeded"),
    true,
  );
  assert.equal(plan.morphSelection.pointLimitEvaluation.enforced, true);
  assert.equal(plan.morphSelection.pointLimitEvaluation.generalExcessPoints, 10);
});

test("transition planner accepts a known form inside the resolved limit", () => {
  const character = materializeKnown(createKnownCharacter({
    pointLimit: 50,
    templatePoints: 45,
  }));
  const plan = planFormTransition(
    character,
    "set-morph-known",
    "form-known-target",
  );

  assert.equal(plan.status, "ready");
  assert.equal(plan.allowed, true);
  assert.equal(plan.morphSelection.pointLimitEvaluation.status, "ready");
  assert.deepEqual(plan.reasons, []);
});

test("transition planner blocks an improvisation above its specific limit", () => {
  const materialized = materializeMorphImprovisedForm(
    createImprovisedCharacter(),
    "set-morph-improvised",
    improvisedDraft(45),
    { now: NOW, formId: "form-improvised-point-limit" },
  );
  const plan = planFormTransition(
    materialized.character,
    "set-morph-improvised",
    "form-improvised-point-limit",
  );

  assert.equal(plan.status, "blocked");
  assert.equal(
    plan.reasons.includes("morph-improvisation-point-limit-exceeded"),
    true,
  );
  assert.equal(plan.morphSelection.pointLimitEvaluation.effectivePointLimit, 40);
});

test("changing a declared limit changes the transition fingerprint", async () => {
  const character = materializeKnown(createKnownCharacter({
    pointLimit: 70,
    templatePoints: 60,
  }));
  const ready = planFormTransition(
    character,
    "set-morph-known",
    "form-known-target",
  );
  const restricted = createCharacter({
    ...character,
    alternateFormSets: character.alternateFormSets.map(set => (
      set.id === "set-morph-known"
        ? {
          ...set,
          morphProfile: {
            ...set.morphProfile,
            pointLimit: 50,
          },
        }
        : set
    )),
  });
  const blocked = planFormTransition(
    restricted,
    "set-morph-known",
    "form-known-target",
  );

  assert.equal(ready.status, "ready");
  assert.equal(blocked.status, "blocked");
  assert.notDeepEqual(
    ready.morphSelection.pointLimitEvaluation,
    blocked.morphSelection.pointLimitEvaluation,
  );
});
