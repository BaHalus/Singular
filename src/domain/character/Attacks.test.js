import test from "node:test";
import assert from "node:assert/strict";

import {
  createAttack,
  createAttacks,
  getAttackAuthority,
  getAttackCategories,
  getAttackSourceKinds,
  serializeAttacks,
  validateAttack,
  validateAttacks,
} from "./Attacks.js";

test("creates an empty frozen attack collection", () => {
  const attacks = createAttacks();
  assert.deepEqual(attacks, []);
  assert.equal(Object.isFrozen(attacks), true);
  assert.equal(validateAttacks(attacks), true);
});

test("creates declared attacks with ID references only", () => {
  const attack = createAttack({
    id: "attack-sword",
    externalIds: { gcs: "weapon-001" },
    name: "Golpe de espada",
    category: "melee",
    skillId: "skill-broadsword",
    source: { kind: "equipment", id: "equipment-sword" },
    damage: { value: "sw+1", type: "cut" },
    reach: "1",
    notes: "Ainda não resolvido pelo motor.",
    importMeta: { source: "test" },
    raw: { strength: "10" },
  });

  assert.equal(attack.skillId, "skill-broadsword");
  assert.deepEqual(attack.source, {
    kind: "equipment",
    id: "equipment-sword",
  });
  assert.deepEqual(attack.damage, {
    value: "sw+1",
    type: "cut",
    authority: "declared",
  });
  assert.equal(Object.isFrozen(attack), true);
  assert.equal(Object.isFrozen(attack.damage), true);
  assert.equal(Object.hasOwn(attack, "skill"), false);
  assert.equal(Object.hasOwn(attack, "equipment"), false);
  assert.equal(Object.hasOwn(attack, "skillLevel"), false);
});

test("preserves declared order and rejects duplicate IDs", () => {
  const attacks = createAttacks([
    { id: "attack-b", category: "ranged" },
    { id: "attack-a", category: "melee" },
  ]);
  assert.deepEqual(attacks.map(attack => attack.id), ["attack-b", "attack-a"]);
  assert.throws(
    () => createAttacks([{ id: "same" }, { id: "same" }]),
    /ids must be unique/,
  );
});

test("uses explicit declared defaults", () => {
  const attack = createAttack({ id: "attack-default" });
  assert.equal(attack.category, "melee");
  assert.equal(attack.skillId, null);
  assert.deepEqual(attack.source, { kind: "manual", id: null });
  assert.deepEqual(attack.damage, {
    value: "",
    type: "",
    authority: "declared",
  });
  assert.equal(attack.reach, null);
  assert.equal(attack.range, null);
});

test("publishes closed MVP vocabularies", () => {
  assert.deepEqual(getAttackCategories(), ["melee", "ranged"]);
  assert.deepEqual(getAttackSourceKinds(), [
    "manual",
    "equipment",
    "trait",
    "spell",
    "power",
    "other",
  ]);
  assert.equal(getAttackAuthority(), "declared");
});

test("rejects invalid category, source, references and authority", () => {
  assert.throws(
    () => createAttack({ id: "bad-category", category: "area" }),
    /category is invalid/,
  );
  assert.throws(
    () => createAttack({
      id: "bad-source",
      source: { kind: "inventory", id: "equipment-1" },
    }),
    /source kind is invalid/,
  );
  assert.throws(
    () => createAttack({ id: "bad-skill", skillId: 12 }),
    /skillId must be a non-empty string or null/,
  );
  assert.throws(
    () => createAttack({
      id: "bad-authority",
      damage: { value: "2d", type: "cut", authority: "calculated" },
    }),
    /authority must be declared/,
  );
});

test("rejects sparse and non-portable data", () => {
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => createAttacks(sparse), /dense array/);

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => createAttack({ id: "cycle", raw: cyclic }),
    /must not contain cycles/,
  );
  assert.throws(
    () => createAttack({ id: "nan", raw: { value: Number.NaN } }),
    /JSON portable/,
  );
});

test("serializes a detached JSON-portable snapshot", () => {
  const raw = { nested: { value: 1 } };
  const attacks = createAttacks([{
    id: "snapshot",
    externalIds: { gcs: "gcs-attack" },
    source: { kind: "trait", id: "trait-1" },
    damage: { value: "1d", type: "cr" },
    raw,
  }]);
  raw.nested.value = 99;

  const snapshot = serializeAttacks(attacks);
  snapshot[0].externalIds.gcs = "changed";
  snapshot[0].raw.nested.value = 77;

  assert.equal(attacks[0].externalIds.gcs, "gcs-attack");
  assert.equal(attacks[0].raw.nested.value, 1);
  assert.equal(snapshot[0].damage.authority, "declared");
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test("rejects unsupported fields during canonical validation", () => {
  const valid = serializeAttacks(createAttacks([{ id: "valid" }]))[0];
  assert.throws(
    () => validateAttack({ ...valid, calculatedDamage: "2d" }),
    /unsupported fields/,
  );
});
