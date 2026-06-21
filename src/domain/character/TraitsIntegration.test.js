import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { importCharacterWithDiagnostics } from "../import/CharacterImporter.js";


test("creating a canonical trait does not freeze caller-owned nested data", () => {
  const modifier = {
    id: "modifier-owned-by-caller",
    name: "Limitado",
    disabled: false,
  };
  const raw = {
    nested: {
      value: 1,
    },
  };

  const trait = createTrait({
    id: "trait-owned-input",
    role: "advantage",
    name: "Entrada",
    modifiers: [modifier],
    raw,
  });

  assert.equal(Object.isFrozen(trait), true);
  assert.equal(Object.isFrozen(trait.modifiers[0]), true);
  assert.equal(Object.isFrozen(trait.raw.nested), true);

  assert.equal(Object.isFrozen(modifier), false);
  assert.equal(Object.isFrozen(raw), false);
  assert.equal(Object.isFrozen(raw.nested), false);

  modifier.disabled = true;
  raw.nested.value = 2;

  assert.equal(trait.modifiers[0].disabled, false);
  assert.equal(trait.raw.nested.value, 1);
});


test("GCS trait import populates canonical traits and compatibility projections", () => {
  const imported = importCharacterWithDiagnostics({
    id: "character-trait-import",
    profile: {
      name: "Importado",
    },
    traits: [
      {
        type: "advantage",
        id: "gcs-advantage-imported",
        name: "Reflexos em Combate",
        base_points: 15,
        calc: {
          points: 15,
        },
        categories: ["Advantage"],
      },
      {
        type: "disadvantage",
        id: "gcs-disadvantage-imported",
        name: "Mau Humor",
        base_points: -10,
        calc: {
          points: -10,
        },
        categories: ["Disadvantage"],
      },
    ],
  }, {
    now: "2026-06-21T20:00:00.000Z",
  });

  assert.deepEqual(imported.character.traits.map(item => item.role), [
    "advantage",
    "disadvantage",
  ]);
  assert.deepEqual(imported.character.advantages.map(item => item.id), [
    "gcs-advantage-imported",
  ]);
  assert.deepEqual(imported.character.disadvantages.map(item => item.id), [
    "gcs-disadvantage-imported",
  ]);
  assert.equal(imported.character.traits[0].source.kind, "imported");
  assert.equal(imported.character.traits[0].source.provider, "gcs");
});
