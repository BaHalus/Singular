import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
  validateCharacter,
} from "./Character.js";

test("creates the default Character with canonical empty attacks", () => {
  const character = createCharacter();

  assert.deepEqual(character.attacks, []);
  assert.equal(Object.isFrozen(character.attacks), true);
  assert.equal(validateCharacter(character), true);
});

test("creates declared attacks through the canonical Character aggregate", () => {
  const character = createCharacter({
    attacks: [
      {
        id: "attack-sword-swing",
        name: "Golpe de espada",
        category: "melee",
        skillId: "skill-broadsword",
        source: { kind: "equipment", id: "equipment-sword" },
        damage: { value: "sw+1", type: "cut" },
        reach: "1",
        notes: "Valor declarado.",
      },
    ],
  });

  assert.equal(character.attacks[0].id, "attack-sword-swing");
  assert.equal(character.attacks[0].skillId, "skill-broadsword");
  assert.deepEqual(character.attacks[0].source, {
    kind: "equipment",
    id: "equipment-sword",
  });
  assert.deepEqual(character.attacks[0].damage, {
    value: "sw+1",
    type: "cut",
    authority: "declared",
  });
  assert.equal(Object.hasOwn(character.attacks[0], "skill"), false);
  assert.equal(Object.hasOwn(character.attacks[0], "equipment"), false);
});

test("serializes attacks as a detached portable Character snapshot", () => {
  const raw = { externalDamage: "1d+2" };
  const character = createCharacter({
    attacks: [
      {
        id: "attack-bow-shot",
        name: "Disparo",
        category: "ranged",
        skillId: "skill-bow",
        source: { kind: "equipment", id: "equipment-bow" },
        damage: { value: "thr+1", type: "imp" },
        range: "x15/x20",
        raw,
      },
    ],
  });
  raw.externalDamage = "changed outside";

  const snapshot = serializeCharacter(character);
  snapshot.attacks[0].name = "Changed snapshot";
  snapshot.attacks[0].raw.externalDamage = "changed snapshot";

  assert.equal(character.attacks[0].name, "Disparo");
  assert.equal(character.attacks[0].raw.externalDamage, "1d+2");
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test("roundtrips canonical attacks through Character serialization", () => {
  const original = createCharacter({
    identity: {
      id: "character-attacks-roundtrip",
      name: "Ayla",
    },
    attacks: [
      {
        id: "attack-claws",
        externalIds: { source: "external-claws" },
        name: "Garras",
        category: "melee",
        skillId: "skill-brawling",
        source: { kind: "trait", id: "trait-claws" },
        damage: { value: "thr+2", type: "cut" },
        reach: "C",
        importMeta: { imported: true },
      },
    ],
  });

  const restored = createCharacter(serializeCharacter(original));

  assert.deepEqual(
    serializeCharacter(restored).attacks,
    serializeCharacter(original).attacks,
  );
  assert.notEqual(restored.attacks, original.attacks);
  assert.notEqual(restored.attacks[0], original.attacks[0]);
});

test("rejects invalid and duplicate attack collections at Character boundary", () => {
  assert.throws(
    () => createCharacter({ attacks: "Golpe" }),
    /dense array/,
  );
  assert.throws(
    () => createCharacter({
      attacks: [
        { id: "attack-duplicate" },
        { id: "attack-duplicate" },
      ],
    }),
    /ids must be unique/,
  );
  assert.throws(
    () => createCharacter({
      attacks: [
        {
          id: "attack-calculated",
          damage: {
            value: "2d",
            type: "cut",
            authority: "calculated",
          },
        },
      ],
    }),
    /authority must be declared/,
  );
});
