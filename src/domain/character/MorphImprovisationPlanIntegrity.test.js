import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import {
  planMorphImprovisation,
  executeMorphImprovisationPlan,
} from "./MorphImprovisationOperations.js";

const NOW = "2026-06-20T23:00:00.000Z";

function createImproviser() {
  let character = createCharacter({
    identity: {
      id: "char-morph-plan-integrity",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    advantages: [{
      id: "adv-morph",
      name: "Morfose",
      modifiers: [{ id: "mod-improvised", name: "Formas Improvisadas" }],
    }],
    alternateFormSets: [{
      id: "set-morph",
      name: "Morfose",
      mechanism: "morph",
      sourceTraitId: "adv-morph",
      baseFormId: "form-base",
      activeFormId: "form-base",
      forms: [{ id: "form-base", name: "Forma natural" }],
    }],
    metadata: {
      createdAt: NOW,
      updatedAt: NOW,
      source: "singular",
    },
  });

  character = applyResolvedMorphProfile(character, "set-morph", { now: NOW }).character;
  return character;
}

function draft() {
  return {
    id: "improvisation-integrity",
    name: "Predador Alado",
    template: {
      id: "improvisation-integrity-template",
      templateType: "form",
      name: "Predador Alado",
      importedPoints: 40,
    },
    evidence: {
      physicalNaturalOnly: true,
      allCharacteristicsExistInSetting: true,
      changesComposition: false,
      conditionsSatisfied: true,
    },
  };
}

function formsOf(character) {
  return character.alternateFormSets.find(set => set.id === "set-morph").forms;
}

test("rejects a plan whose draft changed after analysis", () => {
  const character = createImproviser();
  const plan = planMorphImprovisation(character, "set-morph", draft(), {
    now: NOW,
    planId: "plan-draft-tamper",
  });
  const tampered = structuredClone(plan);
  tampered.draft.template.importedPoints = 400;

  assert.throws(
    () => executeMorphImprovisationPlan(character, tampered, { now: NOW }),
    /draft fingerprint mismatch/,
  );
  assert.equal(formsOf(character).length, 1);
});

test("rejects a plan whose policy snapshot changed after analysis", () => {
  const character = createImproviser();
  const plan = planMorphImprovisation(character, "set-morph", draft(), {
    now: NOW,
    planId: "plan-policy-tamper",
  });
  const tampered = structuredClone(plan);
  tampered.policySnapshot.availabilityScope = "unrestricted";

  assert.throws(
    () => executeMorphImprovisationPlan(character, tampered, { now: NOW }),
    /policy fingerprint mismatch/,
  );
  assert.equal(formsOf(character).length, 1);
});

test("rejects a plan whose point-limit evaluation changed after analysis", () => {
  const character = createImproviser();
  const plan = planMorphImprovisation(character, "set-morph", draft(), {
    now: NOW,
    planId: "plan-limit-tamper",
  });
  const tampered = structuredClone(plan);
  tampered.pointLimitEvaluation.enforced = true;

  assert.throws(
    () => executeMorphImprovisationPlan(character, tampered, { now: NOW }),
    /point-limit evaluation mismatch/,
  );
  assert.equal(formsOf(character).length, 1);
});
