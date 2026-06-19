import test from "node:test";
import assert from "node:assert/strict";

import {
  importCharacter,
  importCharacterWithDiagnostics,
} from "./CharacterImporter.js";

function createSource(modifiers) {
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
        modifiers,
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

function findWolfForm(character) {
  return character.alternateFormSets[0].forms.find(
    form => form.templateId === "template-wolf",
  );
}

test("derives target-form transition rules from imported modifiers", () => {
  const result = importCharacterWithDiagnostics(
    createSource([
      {
        type: "modifier",
        id: "mod-fatigue",
        name: "Custa Fadiga",
        disabled: false,
        levels: 2,
        cost_type: "percentage",
        cost: -10,
      },
      {
        type: "modifier",
        id: "mod-extra-time",
        name: "Gasto Adicional de Tempo",
        disabled: false,
        levels: 1,
        cost_type: "percentage",
        cost: -10,
      },
      {
        type: "modifier",
        id: "mod-trigger",
        name: "Gatilho",
        disabled: false,
        notes: "@Lua cheia@",
        cost_type: "percentage",
        cost: -15,
      },
      {
        type: "modifier",
        id: "mod-uncontrollable",
        name: "Incontrolável",
        disabled: true,
        cost_type: "percentage",
        cost: -10,
      },
    ]),
    {
      now: "2026-06-19T12:00:00.000Z",
    },
  );

  const set = result.character.alternateFormSets[0];
  const base = set.forms.find(form => form.id === set.baseFormId);
  const wolf = findWolfForm(result.character);
  const wolfResolution = result.formTransitionRulesResolutions.find(
    resolution => resolution.formId === wolf.id,
  );

  assert.equal(result.formTransitionRulesResolutions.length, 2);
  assert.equal(base.transitionRules.activation.costs.length, 0);
  assert.equal(wolf.transitionRules.activation.costs[0].resource, "FP");
  assert.equal(wolf.transitionRules.activation.costs[0].amount, 2);
  assert.equal(wolf.transitionRules.activation.timeStepsDelta, 1);
  assert.equal(wolf.transitionRules.activation.triggers[0].description, "Lua cheia");
  assert.equal(wolf.transitionRules.activation.involuntary, false);
  assert.equal(
    wolfResolution.decisions.collections.activation.costs.source,
    "builtin",
  );
  assert.equal(
    wolfResolution.decisions.scalars.activation.involuntary.source,
    "existing",
  );
});

test("accepts campaign rules and per-form override during import", () => {
  const result = importCharacterWithDiagnostics(
    createSource([
      {
        type: "modifier",
        id: "mod-trigger",
        name: "Gatilho",
        disabled: false,
        notes: "Lua cheia",
      },
    ]),
    {
      now: "2026-06-19T12:00:00.000Z",
      formTransitionRulesResolver: {
        campaignRules: [
          {
            id: "campaign-will-test",
            when: {
              modifierNames: ["Gatilho"],
            },
            transitionRules: {
              activation: {
                maneuver: "Concentrate",
                tests: [
                  {
                    id: "test-will",
                    kind: "attribute",
                    target: "Will",
                    modifier: -2,
                  },
                ],
              },
            },
          },
        ],
        manualOverrides: {
          "form_linked_body_adv-form-wolf_template-wolf": {
            activation: {
              maneuver: "Ready",
              triggers: [],
            },
          },
        },
        overrideId: "master-ruling-001",
      },
    },
  );

  const wolf = findWolfForm(result.character);

  assert.equal(wolf.transitionRules.activation.maneuver, "Ready");
  assert.deepEqual(wolf.transitionRules.activation.triggers, []);
  assert.equal(wolf.transitionRules.activation.tests[0].target, "Will");
  assert.equal(wolf.transitionRules.activation.tests[0].modifier, -2);
  assert.equal(wolf.transitionRulesOverride.activation.maneuver, "Ready");
  assert.equal(
    wolf.transitionRulesResolution.decisions.scalars.activation.maneuver.source,
    "manual",
  );
});

test("importCharacter returns character with resolved form transition rules", () => {
  const character = importCharacter(
    createSource([
      {
        type: "modifier",
        id: "mod-preparation",
        name: "Preparação Necessária",
        disabled: false,
        notes: "Ritual de 10 minutos",
      },
    ]),
  );

  const wolf = findWolfForm(character);

  assert.equal(
    wolf.transitionRules.activation.requirements[0].description,
    "Ritual de 10 minutos",
  );
});
