import assert from "node:assert/strict";
import test from "node:test";

import { createCharacter } from "./Character.js";
import { projectCharacterAttacks } from "./CharacterAttackProjection.js";

test("projects declared and trait-created attacks together", () => {
  const character = createCharacter({
    identity: { id: "char-1", name: "Teste" },
    attacks: [{
      id: "manual-1",
      name: "Espada",
      category: "melee",
    }],
    traits: [{
      id: "trait-inato-1",
      role: "advantage",
      name: "Ataque Inato",
      weapons: [{
        name: "Raio",
        category: "ranged",
        damage: { value: "3d", type: "burn" },
      }],
    }],
  });

  const attacks = projectCharacterAttacks(character);

  assert.deepEqual(attacks.map(attack => attack.id), [
    "manual-1",
    "trait-attack:trait-inato-1:0",
  ]);
  assert.deepEqual(attacks.map(attack => attack.source.kind), [
    "manual",
    "trait",
  ]);
});

test("removing the trait removes only its derived attack", () => {
  const character = createCharacter({
    identity: { id: "char-2", name: "Teste" },
    attacks: [{ id: "manual-1", name: "Espada", category: "melee" }],
    traits: [{
      id: "trait-inato-1",
      role: "advantage",
      name: "Ataque Inato",
      weapons: [{ name: "Raio", damage: { value: "3d", type: "burn" } }],
    }],
  });

  const before = projectCharacterAttacks(character);
  const withoutTrait = {
    ...character,
    traits: [],
  };
  const after = projectCharacterAttacks(withoutTrait);

  assert.equal(before.length, 2);
  assert.deepEqual(after.map(attack => attack.id), ["manual-1"]);
});
