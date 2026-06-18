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

  assert.equal(character.attributes.ST.override, null);
});

test("accepts numeric attributes input", () => {
  const character = createCharacter({
    attributes: {
      ST: 12,
      DX: 11,
      IQ: 10,
      HT: 9,
    },
  });

  assert.equal(character.attributes.ST.base, 12);
  assert.equal(character.attributes.DX.base, 11);
  assert.equal(character.attributes.IQ.base, 10);
  assert.equal(character.attributes.HT.base, 9);
});

test("creates default secondary characteristics aggregate", () => {
  const character = createCharacter();

  assert.equal(character.secondaryCharacteristics.HP.base, null);
  assert.equal(character.secondaryCharacteristics.FP.base, null);
  assert.equal(character.secondaryCharacteristics.Will.base, null);
  assert.equal(character.secondaryCharacteristics.Per.base, null);
  assert.equal(character.secondaryCharacteristics.BasicSpeed.base, null);
  assert.equal(character.secondaryCharacteristics.BasicMove.base, null);

  assert.equal(character.secondaryCharacteristics.HP.override, null);
});

test("accepts numeric secondary characteristics input", () => {
  const character = createCharacter({
    secondaryCharacteristics: {
      HP: 12,
      FP: 11,
      Will: 13,
      Per: 14,
      BasicSpeed: 5.75,
      BasicMove: 6,
    },
  });

  assert.equal(character.secondaryCharacteristics.HP.base, 12);
  assert.equal(character.secondaryCharacteristics.FP.base, 11);
  assert.equal(character.secondaryCharacteristics.Will.base, 13);
  assert.equal(character.secondaryCharacteristics.Per.base, 14);
  assert.equal(character.secondaryCharacteristics.BasicSpeed.base, 5.75);
  assert.equal(character.secondaryCharacteristics.BasicMove.base, 6);
});

test("creates state automatically", () => {
  const character = createCharacter();

  assert.ok(character.state);
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

  assert.ok(json);
  assert.ok(json.identity);
  assert.ok(json.attributes);
  assert.ok(json.attributes.ST);
  assert.ok(json.secondaryCharacteristics);
  assert.ok(json.secondaryCharacteristics.HP);
  assert.ok(json.state);
  assert.ok(json.metadata);
});

test("validates valid character", () => {
  const character = createCharacter();

  assert.equal(
    validateCharacter(character),
    true
  );
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

test("throws when DX base is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        DX: {
          base: null,
          override: null,
        },
      },
    });
  });
});

test("throws when IQ base is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        IQ: {
          base: undefined,
          override: null,
        },
      },
    });
  });
});

test("throws when HT base is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        HT: {
          base: "abc",
          override: null,
        },
      },
    });
  });
});

test("throws when HP base is invalid", () => {
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

test("throws when secondary characteristic override is invalid", () => {
  assert.throws(() => {
    createCharacter({
      secondaryCharacteristics: {
        Will: {
          base: null,
          override: "abc",
        },
      },
    });
  });
});
