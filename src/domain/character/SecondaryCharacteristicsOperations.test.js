import test from "node:test";
import assert from "node:assert/strict";

import { createSecondaryCharacteristics } from "./SecondaryCharacteristics.js";

import {
  setSecondaryCharacteristicBase,
  setSecondaryCharacteristicOverride,
  clearSecondaryCharacteristicOverride,
} from "./SecondaryCharacteristicsOperations.js";

test("sets secondary characteristic base without mutating original", () => {
  const secondary = createSecondaryCharacteristics();

  const updated =
    setSecondaryCharacteristicBase(secondary, "HP", 12);

  assert.equal(secondary.HP.base, null);
  assert.equal(updated.HP.base, 12);
});

test("sets secondary characteristic override without mutating original", () => {
  const secondary = createSecondaryCharacteristics();

  const updated =
    setSecondaryCharacteristicOverride(secondary, "Will", 14);

  assert.equal(secondary.Will.override, null);
  assert.equal(updated.Will.override, 14);
});

test("clears secondary characteristic override without mutating original", () => {
  const secondary = createSecondaryCharacteristics({
    Per: {
      base: null,
      override: 13,
    },
  });

  const updated =
    clearSecondaryCharacteristicOverride(secondary, "Per");

  assert.equal(secondary.Per.override, 13);
  assert.equal(updated.Per.override, null);
});

test("accepts null base value", () => {
  const secondary = createSecondaryCharacteristics({
    HP: 12,
  });

  const updated =
    setSecondaryCharacteristicBase(secondary, "HP", null);

  assert.equal(updated.HP.base, null);
});

test("accepts null override value", () => {
  const secondary = createSecondaryCharacteristics();

  const updated =
    setSecondaryCharacteristicOverride(secondary, "FP", null);

  assert.equal(updated.FP.override, null);
});

test("throws on invalid secondary characteristic key", () => {
  const secondary = createSecondaryCharacteristics();

  assert.throws(() => {
    setSecondaryCharacteristicBase(secondary, "Vision", 10);
  });
});

test("throws on invalid base value", () => {
  const secondary = createSecondaryCharacteristics();

  assert.throws(() => {
    setSecondaryCharacteristicBase(secondary, "HP", "10");
  });
});

test("throws on invalid override value", () => {
  const secondary = createSecondaryCharacteristics();

  assert.throws(() => {
    setSecondaryCharacteristicOverride(secondary, "Will", "12");
  });
});
