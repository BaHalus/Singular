import test from "node:test";
import assert from "node:assert/strict";

import {
  createSecondaryCharacteristics,
  validateSecondaryCharacteristics,
  serializeSecondaryCharacteristics,
} from "./SecondaryCharacteristics.js";

test("creates default secondary characteristics", () => {
  const secondary = createSecondaryCharacteristics();

  assert.equal(secondary.HP.base, null);
  assert.equal(secondary.FP.base, null);
  assert.equal(secondary.Will.base, null);
  assert.equal(secondary.Per.base, null);
  assert.equal(secondary.BasicSpeed.base, null);
  assert.equal(secondary.BasicMove.base, null);
});

test("creates secondary characteristics from numeric values", () => {
  const secondary = createSecondaryCharacteristics({
    HP: 12,
    FP: 11,
    Will: 13,
    Per: 14,
    BasicSpeed: 5.75,
    BasicMove: 6,
  });

  assert.equal(secondary.HP.base, 12);
  assert.equal(secondary.FP.base, 11);
  assert.equal(secondary.Will.base, 13);
  assert.equal(secondary.Per.base, 14);
  assert.equal(secondary.BasicSpeed.base, 5.75);
  assert.equal(secondary.BasicMove.base, 6);
});

test("creates secondary characteristics from structured values", () => {
  const secondary = createSecondaryCharacteristics({
    HP: {
      base: null,
      override: 14,
    },
  });

  assert.equal(secondary.HP.base, null);
  assert.equal(secondary.HP.override, 14);
});

test("validates valid secondary characteristics", () => {
  const secondary = createSecondaryCharacteristics();

  assert.equal(
    validateSecondaryCharacteristics(secondary),
    true
  );
});

test("serializes secondary characteristics", () => {
  const secondary = createSecondaryCharacteristics();

  const json = serializeSecondaryCharacteristics(secondary);

  assert.ok(json);
  assert.ok(json.HP);
  assert.ok(json.FP);
  assert.ok(json.Will);
  assert.ok(json.Per);
  assert.ok(json.BasicSpeed);
  assert.ok(json.BasicMove);
});

test("throws when HP base is invalid", () => {
  assert.throws(() => {
    createSecondaryCharacteristics({
      HP: {
        base: "10",
        override: null,
      },
    });
  });
});

test("throws when override is invalid", () => {
  assert.throws(() => {
    createSecondaryCharacteristics({
      HP: {
        base: null,
        override: "abc",
      },
    });
  });
});
