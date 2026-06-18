import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  validateCharacter,
  serializeCharacter,
} from "./Character.js";

test("creates a default character", () => {
  const character = createCharacter();

  assert.ok(character);
});

test("creates identity automatically", () => {
  const character = createCharacter();

  assert.ok(character.identity);
  assert.ok(character.identity.id);
  assert.ok(character.identity.name);
});

test("creates default attributes aggregate", () => {
  const character = createCharacter();

  assert.equal(character.attributes.ST.base, 10);
  assert.equal(character.attributes.DX.base, 10);
  assert.equal(character.attributes.IQ.base, 10);
  assert.equal(character.attributes.HT.base, 10);
});

test("creates default secondary characteristics aggregate", () => {
  const character = createCharacter();

  assert.equal(character.secondaryCharacteristics.HP.base, null);
  assert.equal(character.secondaryCharacteristics.FP.base, null);
  assert.equal(character.secondaryCharacteristics.Will.base, null);
  assert.equal(character.secondaryCharacteristics.Per.base, null);
  assert.equal(character.secondaryCharacteristics.BasicSpeed.base, null);
  assert.equal(character.secondaryCharacteristics.BasicMove.base, null);
});

test("creates default pools aggregate", () => {
  const character = createCharacter();

  assert.equal(character.pools.HP.current, null);
  assert.equal(character.pools.HP.maximum, null);
  assert.equal(character.pools.FP.current, null);
  assert.equal(character.pools.FP.maximum, null);
});

test("creates default state aggregate", () => {
  const character = createCharacter();

  assert.deepEqual(character.state.conditions, []);
  assert.deepEqual(character.state.effects, []);
  assert.equal(character.state.combat.engaged, false);
});

test("accepts numeric pools input", () => {
  const character = createCharacter({
    pools: {
      HP: 10,
      FP: 12,
    },
  });

  assert.equal(character.pools.HP.current, 10);
  assert.equal(character.pools.HP.maximum, 10);
  assert.equal(character.pools.FP.current, 12);
  assert.equal(character.pools.FP.maximum, 12);
});

test("accepts optional EnergyReserve pool", () => {
  const character = createCharacter({
    pools: {
      EnergyReserve: {
        current: 5,
        maximum: 10,
      },
    },
  });

  assert.equal(character.pools.EnergyReserve.current, 5);
  assert.equal(character.pools.EnergyReserve.maximum, 10);
});

test("creates metadata automatically", () => {
  const character = createCharacter();

  assert.ok(character.metadata);
  assert.ok(character.metadata.createdAt);
  assert.ok(character.metadata.updatedAt);
});

test("serializes character", () => {
  const character = createCharacter();

  const json = serializeCharacter(character);

  assert.ok(json.identity);
  assert.ok(json.attributes);
  assert.ok(json.secondaryCharacteristics);
  assert.ok(json.pools);
  assert.ok(json.pools.HP);
  assert.ok(json.pools.FP);
  assert.ok(json.state);
  assert.ok(json.state.conditions);
  assert.ok(json.state.effects);
  assert.ok(json.state.combat);
  assert.ok(json.metadata);
});

test("validates valid character", () => {
  const character = createCharacter();

  assert.equal(validateCharacter(character), true);
});

test("throws when ST base is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        ST: {
          base: "10",
          override: null,
        },
      },
    });
  });
});

test("throws when HP secondary base is invalid", () => {
  assert.throws(() => {
    createCharacter({
      secondaryCharacteristics: {
        HP: {
          base: "10",
          override: null,
        },
      },
    });
  });
});

test("throws when HP pool current is invalid", () => {
  assert.throws(() => {
    createCharacter({
      pools: {
        HP: {
          current: "10",
          maximum: 10,
        },
      },
    });
  });
});

test("throws when FP pool maximum is invalid", () => {
  assert.throws(() => {
    createCharacter({
      pools: {
        FP: {
          current: 10,
          maximum: "12",
        },
      },
    });
  });
});

test("throws when state conditions is invalid", () => {
  assert.throws(() => {
    createCharacter({
      state: {
        conditions: "Stunned",
      },
    });
  });
});

test("throws when state effects is invalid", () => {
  assert.throws(() => {
    createCharacter({
      state: {
        effects: "Bless",
      },
    });
  });
});
