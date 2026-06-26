import test from "node:test";
import assert from "node:assert/strict";

import { createAttacks } from "./Attacks.js";
import {
  addAttack,
  findAttackById,
  removeAttack,
  reorderAttack,
  updateAttack,
} from "./AttacksOperations.js";

function baseAttacks() {
  return createAttacks([
    {
      id: "attack-one",
      name: "Um",
      category: "melee",
      damage: { value: "1d", type: "cr" },
    },
    {
      id: "attack-two",
      name: "Dois",
      category: "ranged",
      range: "10/20",
    },
  ]);
}

test("adds an attack without mutating the source collection", () => {
  const source = baseAttacks();
  const result = addAttack(source, {
    id: "attack-three",
    name: "Três",
    category: "melee",
  });

  assert.deepEqual(source.map(attack => attack.id), ["attack-one", "attack-two"]);
  assert.deepEqual(result.map(attack => attack.id), [
    "attack-one",
    "attack-two",
    "attack-three",
  ]);
  assert.notEqual(result, source);
  assert.equal(Object.isFrozen(result), true);
});

test("updates only the selected attack and preserves its ID", () => {
  const source = baseAttacks();
  const result = updateAttack(source, "attack-one", {
    name: "Um atualizado",
    skillId: "skill-brawling",
    source: { kind: "trait", id: "trait-claws" },
    damage: { value: "1d+1", type: "cut" },
  });

  assert.equal(source[0].name, "Um");
  assert.equal(result[0].id, "attack-one");
  assert.equal(result[0].name, "Um atualizado");
  assert.equal(result[0].skillId, "skill-brawling");
  assert.deepEqual(result[0].source, { kind: "trait", id: "trait-claws" });
  assert.deepEqual(result[0].damage, {
    value: "1d+1",
    type: "cut",
    authority: "declared",
  });
  assert.equal(result[1], source[1]);
});

test("removes an attack without mutating the source", () => {
  const source = baseAttacks();
  const result = removeAttack(source, "attack-one");

  assert.equal(source.length, 2);
  assert.deepEqual(result.map(attack => attack.id), ["attack-two"]);
});

test("reorders attacks deterministically", () => {
  const source = addAttack(baseAttacks(), {
    id: "attack-three",
    category: "melee",
  });
  const result = reorderAttack(source, "attack-three", 0);

  assert.deepEqual(source.map(attack => attack.id), [
    "attack-one",
    "attack-two",
    "attack-three",
  ]);
  assert.deepEqual(result.map(attack => attack.id), [
    "attack-three",
    "attack-one",
    "attack-two",
  ]);
  assert.equal(reorderAttack(source, "attack-two", 1), source);
});

test("finds attacks only by canonical ID", () => {
  const attacks = baseAttacks();

  assert.equal(findAttackById(attacks, "attack-two").name, "Dois");
  assert.equal(findAttackById(attacks, "missing"), null);
  assert.equal(findAttackById(attacks, "Dois"), null);
});

test("rejects missing IDs, invalid positions and unsupported patches", () => {
  const attacks = baseAttacks();

  assert.throws(() => updateAttack(attacks, "missing", { name: "X" }), /not found/);
  assert.throws(() => removeAttack(attacks, "missing"), /not found/);
  assert.throws(() => reorderAttack(attacks, "attack-one", -1), /index is invalid/);
  assert.throws(() => reorderAttack(attacks, "attack-one", 2), /index is invalid/);
  assert.throws(
    () => updateAttack(attacks, "attack-one", { parry: "10" }),
    /unsupported fields/,
  );
  assert.throws(
    () => updateAttack(attacks, "attack-one", { id: "replacement" }),
    /unsupported fields/,
  );
});
