import test from "node:test";
import assert from "node:assert/strict";

import {
  importCharacter,
  importCharacterWithDiagnostics,
} from "./CharacterImporter.js";

function createSource(modifier) {
  return {
    id: "char-001",
    profile: {
      name: "Eldrin",
    },
    advantages: [
      {
        type: "advantage",
        id: "adv-form-wolf",
        name: "Forma Alternativa",
        notes: "Lobo",
        base_points: 15,
        modifiers: [modifier],
        calc: { points: 15 },
        categories: ["Vantagem"],
      },
    ],
    templates: [
      {
        type: "template",
        version: 2,
        id: "template-wolf",
        name: "Forma de Lobo",
      },
    ],
  };
}

test("derives form state policy from imported enabled modifiers", () => {
  const result = importCharacterWithDiagnostics(
    createSource({
      type: "modifier",
      id: "mod-damage",
      name: "Dano Não-Recíproco",
      disabled: false,
      cost_type: "percentage",
      cost: 50,
    }),
    {
      now: "2026-06-19T12:00:00.000Z",
    },
  );

  assert.equal(result.character.alternateFormSets.length, 1);
  assert.equal(result.formStatePolicyResolutions.length, 1);

  const set = result.character.alternateFormSets[0];
  const resolution = result.formStatePolicyResolutions[0];

  assert.equal(set.statePolicy.pools.HP, "perForm");
  assert.equal(set.statePolicy.injuries, "perForm");
  assert.equal(set.statePolicy.pools.FP, "shared");
  assert.equal(
    set.statePolicyResolution.decisions.pools.HP.source,
    "builtin",
  );
  assert.equal(resolution.setId, set.id);
  assert.equal(
    resolution.decisions.injuries.derivedFrom[0].ruleId,
    "gurps.non-reciprocal-damage",
  );
});

test("does not derive from imported disabled modifiers", () => {
  const character = importCharacter(
    createSource({
      type: "modifier",
      id: "mod-damage",
      name: "Dano Não-Recíproco",
      disabled: true,
      cost_type: "percentage",
      cost: 50,
    }),
  );

  const set = character.alternateFormSets[0];

  assert.equal(set.statePolicy.pools.HP, "shared");
  assert.equal(set.statePolicy.injuries, "shared");
  assert.equal(set.statePolicyResolution.decisions.pools.HP.source, "existing");
});

test("accepts campaign rules and manual overrides during import", () => {
  const result = importCharacterWithDiagnostics(
    createSource({
      type: "modifier",
      id: "mod-absorption",
      name: "Mudança com Absorção",
      disabled: false,
      cost_type: "percentage",
      cost: 5,
    }),
    {
      now: "2026-06-19T12:00:00.000Z",
      formStatePolicyResolver: {
        campaignRules: [
          {
            id: "campaign.absorptive-equipment",
            when: {
              modifierNames: ["Mudança com Absorção"],
            },
            policy: {
              equipment: "perForm",
            },
          },
        ],
        manualOverride: {
          equipment: "shared",
          effects: "perForm",
        },
        overrideId: "master-ruling-001",
      },
    },
  );

  const set = result.character.alternateFormSets[0];

  assert.equal(set.statePolicy.equipment, "shared");
  assert.equal(set.statePolicy.effects, "perForm");
  assert.equal(set.statePolicyOverride.equipment, "shared");
  assert.equal(set.statePolicyResolution.decisions.equipment.source, "manual");
  assert.equal(set.statePolicyResolution.decisions.effects.source, "manual");
});
