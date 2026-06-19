import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

test("stores set defaults and form-specific transition rules", () => {
  const character = createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        transitionRules: {
          activation: {
            baseTimeSeconds: 10,
          },
        },
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              activation: {
                baseTimeSeconds: 3,
                maneuver: "Concentrate",
              },
              return: {
                mode: "automatic",
                targetFormId: "form-base",
              },
            },
            transitionRulesOverride: {
              activation: {
                maneuver: "Ready",
              },
            },
            transitionRulesResolution: {
              setId: "set-body",
              formId: "form-wolf",
              resolvedAt: "2026-06-19T12:00:00.000Z",
            },
          },
        ],
      },
    ],
  });

  const set = character.alternateFormSets[0];
  const base = set.forms[0];
  const wolf = set.forms[1];

  assert.equal(set.transitionRules.activation.baseTimeSeconds, 10);
  assert.equal(base.transitionRules, null);
  assert.equal(wolf.transitionRules.activation.baseTimeSeconds, 3);
  assert.equal(wolf.transitionRules.return.targetFormId, "form-base");
  assert.equal(wolf.transitionRulesOverride.activation.maneuver, "Ready");
  assert.equal(wolf.transitionRulesResolution.formId, "form-wolf");

  const json = serializeCharacter(character);
  const serializedWolf = json.alternateFormSets[0].forms[1];

  assert.equal(serializedWolf.transitionRules.activation.maneuver, "Concentrate");
  assert.equal(serializedWolf.transitionRulesOverride.activation.maneuver, "Ready");
  assert.equal(serializedWolf.transitionRulesResolution.formId, "form-wolf");
});

test("rejects transition return target outside its form set", () => {
  assert.throws(() => {
    createCharacter({
      alternateFormSets: [
        {
          id: "set-body",
          name: "Corpo",
          baseFormId: "form-base",
          activeFormId: "form-base",
          forms: [
            {
              id: "form-base",
              name: "Humanoide",
            },
            {
              id: "form-wolf",
              name: "Lobo",
              transitionRules: {
                return: {
                  targetFormId: "missing-form",
                },
              },
            },
          ],
        },
      ],
    });
  });
});
