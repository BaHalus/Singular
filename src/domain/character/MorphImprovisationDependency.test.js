import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { applyResolvedMorphProfile } from "./MorphProfileResolver.js";
import { analyzeMorphImprovisation } from "./MorphImprovisationOperations.js";

const NOW = "2026-06-20T22:00:00.000Z";

test("Cósmica isolada preserva a dependência e não autoriza improvisação", () => {
  let character = createCharacter({
    identity: {
      id: "char-morph-cosmic-dependency",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    advantages: [{
      id: "adv-morph",
      name: "Morfose",
      modifiers: [{
        id: "mod-cosmic-improvised",
        name: "Cósmica (Para Formas Improvisadas)",
      }],
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

  const applied = applyResolvedMorphProfile(character, "set-morph", { now: NOW });
  character = applied.character;

  assert.equal(applied.resolution.morphProfile.improvisation.mode, "unknown");
  assert.equal(
    applied.resolution.morphProfile.improvisation.availabilityScope,
    "unrestricted",
  );
  assert.equal(
    applied.resolution.diagnostics.some(item => (
      item.type === "modifier-dependency" &&
      item.ruleId === "gurps.morph.cosmic-improvised-forms"
    )),
    true,
  );

  const analysis = analyzeMorphImprovisation(character, "set-morph", {
    id: "improvisation-cosmic-alone",
    name: "Forma impossível",
    template: {
      id: "improvisation-cosmic-alone-template",
      templateType: "form",
      name: "Forma impossível",
      importedPoints: 10,
    },
    evidence: {
      physicalNaturalOnly: true,
      allCharacteristicsExistInSetting: false,
      changesComposition: false,
      conditionsSatisfied: true,
    },
  });

  assert.equal(analysis.status, "pending");
  assert.equal(
    analysis.reasons.includes("morph-improvisation-policy-unknown"),
    true,
  );
});
