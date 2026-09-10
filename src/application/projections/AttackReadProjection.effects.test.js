import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createAttackReadProjection } from "./AttackReadProjection.js";

function characterWithTraits(traits) {
  return createCharacter({
    identity: {
      id: "character-attack-effect",
      name: "Ayla",
      concept: "Batedora",
    },
    attacks: [
      {
        id: "manual-attack",
        name: "Ataque manual",
        category: "melee",
        source: { kind: "manual", id: null },
        damage: { value: "sw", type: "cr" },
      },
    ],
    traits,
  });
}

const innateAttack = (id, weaponName) => ({
  id,
  role: "advantage",
  name: "Ataque Inato",
  points: 10,
  weapons: [
    {
      name: weaponName,
      category: "ranged",
      damage: { value: "3d", type: "imp" },
      range: "100/300",
      notes: "Declarado pelo Traço.",
    },
  ],
});

test("materializa ataque declarado por Ataque Inato na projeção de leitura", () => {
  const projection = createAttackReadProjection(
    characterWithTraits([innateAttack("trait-innate", "Raio Inato")]),
  );

  assert.deepEqual(projection.attacks.map(attack => attack.id), [
    "manual-attack",
    "trait-attack:trait-innate:0",
  ]);
  assert.equal(projection.attacks[1].name, "Raio Inato");
  assert.equal(projection.attacks[1].source.kind, "trait");
  assert.equal(projection.attacks[1].source.id, "trait-innate");
  assert.equal(projection.attacks[1].damage.value, "3d");
});

test("remover o Traço remove somente o ataque derivado", () => {
  const withoutTrait = createAttackReadProjection(characterWithTraits([]));

  assert.deepEqual(withoutTrait.attacks.map(attack => attack.id), [
    "manual-attack",
  ]);
});

test("duas instâncias do mesmo Traço mantêm ataques derivados distintos", () => {
  const projection = createAttackReadProjection(
    characterWithTraits([
      innateAttack("trait-innate-a", "Raio A"),
      innateAttack("trait-innate-b", "Raio B"),
    ]),
  );

  assert.deepEqual(projection.attacks.map(attack => attack.id), [
    "manual-attack",
    "trait-attack:trait-innate-a:0",
    "trait-attack:trait-innate-b:0",
  ]);
  assert.equal(projection.attacks[1].source.id, "trait-innate-a");
  assert.equal(projection.attacks[2].source.id, "trait-innate-b");
});
