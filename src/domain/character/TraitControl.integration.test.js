import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import { createTrait, serializeTrait } from "./Traits.js";

test("creates canonical Trait fields from GCS-compatible aliases", () => {
  const trait = createTrait({
    id: "trait-control-aliases",
    role: "disadvantage",
    name: "Compulsão",
    points: -10,
    cr: 9,
    cr_adj: "reaction_penalty",
    frequency: 12,
    round_down: true,
    replacements: {
      Vicio: "Jogos",
    },
  });

  assert.equal(trait.selfControl.roll, 9);
  assert.equal(trait.selfControl.adjustment.type, "reaction-penalty");
  assert.equal(trait.frequency.roll, 12);
  assert.equal(trait.roundCostDown, true);
  assert.deepEqual(trait.choices.map(choice => [choice.key, choice.value]), [
    ["Vicio", "Jogos"],
  ]);
});

test("serializes canonical controls and choices without maintaining legacy aliases", () => {
  const serialized = serializeTrait(createTrait({
    id: "trait-control-serialization",
    role: "disadvantage",
    name: "Mau Humor",
    pointValue: { basePoints: -10 },
    selfControl: { roll: 12, adjustment: "action-penalty" },
    frequency: 6,
    roundCostDown: true,
    choices: [{ key: "gatilho", value: "Contrariedade", required: true }],
  }));

  assert.equal(serialized.selfControl.roll, 12);
  assert.equal(serialized.frequency.roll, 6);
  assert.equal(serialized.roundCostDown, true);
  assert.deepEqual(serialized.choices, [{
    key: "gatilho",
    value: "Contrariedade",
    required: true,
  }]);
  assert.equal(Object.hasOwn(serialized, "cr"), false);
  assert.equal(Object.hasOwn(serialized, "cr_adj"), false);
  assert.equal(Object.hasOwn(serialized, "round_down"), false);
  assert.equal(Object.hasOwn(serialized, "replacements"), false);
});

test("keeps the historical projection shape unchanged for default controls", () => {
  const character = createCharacter({
    advantages: [{
      id: "adv-default-controls",
      externalIds: {},
      name: "Vantagem",
      notes: "",
      tags: [],
      points: 5,
      levels: null,
      modifiers: [],
      features: [],
      weapons: [],
      prereqs: null,
      importMeta: null,
      power: null,
      alternateGroupId: null,
      isPrimaryAlternative: null,
      raw: null,
    }],
  });
  const projected = serializeCharacter(character).advantages[0];

  assert.equal(Object.hasOwn(projected, "selfControl"), false);
  assert.equal(Object.hasOwn(projected, "frequency"), false);
  assert.equal(Object.hasOwn(projected, "roundCostDown"), false);
  assert.equal(Object.hasOwn(projected, "choices"), false);
});

test("round-trips canonical controls and choices through Character save/load", () => {
  const original = createCharacter({
    traits: [{
      id: "trait-control-roundtrip",
      role: "advantage",
      name: "Aliado",
      pointValue: { basePoints: 5 },
      frequency: 9,
      choices: [{ key: "identidade", value: "Ari", required: true }],
    }],
  });
  const serialized = serializeCharacter(original);
  const restored = createCharacter(structuredClone(serialized));

  assert.deepEqual(serializeCharacter(restored), serialized);
  assert.equal(restored.traits[0].frequency.multiplier, 1);
  assert.equal(restored.traits[0].choices[0].key, "identidade");
});
