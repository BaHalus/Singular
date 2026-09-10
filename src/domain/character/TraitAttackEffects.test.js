import assert from "node:assert/strict";
import test from "node:test";

import { createTrait } from "./Traits.js";
import { constructTraitAttacks } from "./TraitAttackEffects.js";

test("materializes an attack from a trait weapon declaration", () => {
  const trait = createTrait({
    id: "trait-inato-1",
    role: "advantage",
    name: "Ataque Inato",
    weapons: [{
      name: "Rajada de Energia",
      category: "ranged",
      damage: { value: "3d", type: "burn" },
      range: "100/500",
    }],
  });

  const attacks = constructTraitAttacks([trait]);

  assert.equal(attacks.length, 1);
  assert.equal(attacks[0].id, "trait-attack:trait-inato-1:0");
  assert.equal(attacks[0].name, "Rajada de Energia");
  assert.equal(attacks[0].category, "ranged");
  assert.deepEqual(attacks[0].damage, {
    value: "3d",
    type: "burn",
    authority: "declared",
  });
  assert.deepEqual(attacks[0].source, {
    kind: "trait",
    id: "trait-inato-1",
  });
});

test("keeps two trait instances distinct even when their weapon names match", () => {
  const traits = [
    createTrait({
      id: "trait-inato-a",
      role: "advantage",
      name: "Ataque Inato",
      weapons: [{ name: "Raio", damage: { value: "3d", type: "burn" } }],
    }),
    createTrait({
      id: "trait-inato-b",
      role: "advantage",
      name: "Ataque Inato",
      weapons: [{ name: "Raio", damage: { value: "3d", type: "burn" } }],
    }),
  ];

  const attacks = constructTraitAttacks(traits);

  assert.equal(attacks.length, 2);
  assert.deepEqual(
    attacks.map(attack => attack.id),
    ["trait-attack:trait-inato-a:0", "trait-attack:trait-inato-b:0"],
  );
  assert.deepEqual(
    attacks.map(attack => attack.source.id),
    ["trait-inato-a", "trait-inato-b"],
  );
});

test("removing a trait removes only its constructed attack from the projection", () => {
  const first = createTrait({
    id: "trait-inato-a",
    role: "advantage",
    name: "Ataque Inato",
    weapons: [{ name: "Raio A", damage: { value: "3d", type: "burn" } }],
  });
  const second = createTrait({
    id: "trait-inato-b",
    role: "advantage",
    name: "Ataque Inato",
    weapons: [{ name: "Raio B", damage: { value: "2d", type: "burn" } }],
  });

  const before = constructTraitAttacks([first, second]);
  const after = constructTraitAttacks([second]);

  assert.deepEqual(before.map(attack => attack.source.id), [
    "trait-inato-a",
    "trait-inato-b",
  ]);
  assert.deepEqual(after.map(attack => attack.source.id), ["trait-inato-b"]);
});

test("a constructed attack keeps the original weapon declaration in raw", () => {
  const weapon = {
    name: "Raio",
    category: "ranged",
    damage: { value: "3d", type: "burn" },
    customField: "preserve-me",
  };
  const trait = createTrait({
    id: "trait-inato-raw",
    role: "advantage",
    name: "Ataque Inato",
    weapons: [weapon],
  });

  const [attack] = constructTraitAttacks([trait]);

  assert.deepEqual(attack.raw, weapon);
  assert.notStrictEqual(attack.raw, weapon);
});
