import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  validateCharacter,
  serializeCharacter,
} from "./Character.js";

test("creates a default character", () => {
  const character = createCharacter();

  assert.ok(character.identity.id);
  assert.equal(character.identity.name, "Unnamed");
});

test("creates default structural aggregates", () => {
  const character = createCharacter();

  assert.equal(character.attributes.ST.base, 10);
  assert.equal(character.secondaryCharacteristics.HP.base, null);
  assert.equal(character.pools.HP.current, null);
  assert.deepEqual(character.state.conditions, []);
});

test("creates default trait aggregates", () => {
  const character = createCharacter();

  assert.deepEqual(character.advantages, []);
  assert.deepEqual(character.perks, []);
  assert.deepEqual(character.disadvantages, []);
  assert.deepEqual(character.quirks, []);
});

test("accepts trait aggregate input", () => {
  const character = createCharacter({
    advantages: [
      {
        id: "adv-001",
        externalIds: { gcs: "gcs-adv-001" },
        name: "Combat Reflexes",
      },
    ],
    perks: [
      {
        id: "perk-001",
        externalIds: { gcs: "gcs-perk-001" },
        name: "Accessory",
      },
    ],
    disadvantages: [
      {
        id: "disadv-001",
        externalIds: { gcs: "gcs-disadv-001" },
        name: "Bad Temper",
      },
    ],
    quirks: [
      {
        id: "quirk-001",
        externalIds: { gcs: "gcs-quirk-001" },
        name: "Minor Habit",
      },
    ],
  });

  assert.equal(character.advantages[0].name, "Combat Reflexes");
  assert.equal(character.perks[0].name, "Accessory");
  assert.equal(character.disadvantages[0].name, "Bad Temper");
  assert.equal(character.quirks[0].name, "Minor Habit");
});

test("serializes character", () => {
  const character = createCharacter({
    advantages: [
      {
        id: "adv-001",
        externalIds: { gcs: "gcs-adv-001" },
        name: "Combat Reflexes",
      },
    ],
  });

  const json = serializeCharacter(character);

  assert.ok(json.identity);
  assert.ok(json.attributes);
  assert.ok(json.secondaryCharacteristics);
  assert.ok(json.pools);
  assert.ok(json.state);
  assert.ok(json.metadata);

  assert.equal(json.advantages[0].externalIds.gcs, "gcs-adv-001");
  assert.deepEqual(json.perks, []);
  assert.deepEqual(json.disadvantages, []);
  assert.deepEqual(json.quirks, []);
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

test("throws when state conditions is invalid", () => {
  assert.throws(() => {
    createCharacter({
      state: {
        conditions: "Stunned",
      },
    });
  });
});

test("throws when advantage externalIds is invalid", () => {
  assert.throws(() => {
    createCharacter({
      advantages: [
        {
          id: "adv-001",
          externalIds: "gcs-adv-001",
          name: "Combat Reflexes",
        },
      ],
    });
  });
});

test("throws when perks is not an array", () => {
  assert.throws(() => {
    createCharacter({
      perks: "Accessory",
    });
  });
});

test("throws when disadvantages is not an array", () => {
  assert.throws(() => {
    createCharacter({
      disadvantages: "Bad Temper",
    });
  });
});

test("throws when quirks is not an array", () => {
  assert.throws(() => {
    createCharacter({
      quirks: "Minor Habit",
    });
  });
});
