import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  applyResolvedFormStatePolicy,
} from "./FormStatePolicyResolver.js";

function createCharacterWithModifier(modifiers = []) {
  return createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa",
        modifiers,
      },
    ],
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        sourceTraitId: "adv-form",
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
            templateId: "template-wolf",
            sourceTraitId: "adv-form",
          },
        ],
      },
    ],
  });
}

test("recomputes from preserved base policy when modifier is removed", () => {
  const withModifier = createCharacterWithModifier([
    {
      id: "mod-damage",
      type: "modifier",
      name: "Dano Não-Recíproco",
      disabled: false,
    },
  ]);
  const first = applyResolvedFormStatePolicy(
    withModifier,
    "set-body",
    { now: "2026-06-19T12:00:00.000Z" },
  ).character;

  assert.equal(first.alternateFormSets[0].statePolicy.pools.HP, "perForm");
  assert.equal(
    first.alternateFormSets[0].statePolicyResolution.basePolicy.pools.HP,
    "shared",
  );

  const withoutModifier = createCharacter({
    ...first,
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa",
        modifiers: [],
      },
    ],
  });
  const second = applyResolvedFormStatePolicy(
    withoutModifier,
    "set-body",
    { now: "2026-06-19T13:00:00.000Z" },
  ).character;

  assert.equal(second.alternateFormSets[0].statePolicy.pools.HP, "shared");
  assert.equal(second.alternateFormSets[0].statePolicy.injuries, "shared");
  assert.equal(
    second.alternateFormSets[0].statePolicyResolution.decisions.pools.HP.source,
    "existing",
  );
});

test("persists and clears manual override explicitly", () => {
  const original = createCharacterWithModifier();
  const overridden = applyResolvedFormStatePolicy(
    original,
    "set-body",
    {
      now: "2026-06-19T12:00:00.000Z",
      manualOverride: {
        injuries: "perForm",
      },
      overrideId: "master-ruling-001",
    },
  ).character;

  assert.equal(
    overridden.alternateFormSets[0].statePolicyOverride.injuries,
    "perForm",
  );
  assert.equal(
    overridden.alternateFormSets[0].statePolicy.injuries,
    "perForm",
  );

  const repeated = applyResolvedFormStatePolicy(
    overridden,
    "set-body",
    { now: "2026-06-19T13:00:00.000Z" },
  ).character;

  assert.equal(repeated.alternateFormSets[0].statePolicy.injuries, "perForm");
  assert.equal(
    repeated.alternateFormSets[0].statePolicyResolution.decisions.injuries.source,
    "manual",
  );

  const cleared = applyResolvedFormStatePolicy(
    repeated,
    "set-body",
    {
      now: "2026-06-19T14:00:00.000Z",
      manualOverride: null,
    },
  ).character;

  assert.equal(cleared.alternateFormSets[0].statePolicyOverride, null);
  assert.equal(cleared.alternateFormSets[0].statePolicy.injuries, "shared");
  assert.equal(
    cleared.alternateFormSets[0].statePolicyResolution.decisions.injuries.source,
    "existing",
  );
});
