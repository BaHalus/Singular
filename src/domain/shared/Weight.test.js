import test from "node:test";
import assert from "node:assert/strict";

import {
  poundsToKilograms,
  kilogramsToPounds,
  parseGcsWeight,
  normalizeWeightKg,
} from "./Weight.js";

test("converts pounds to kilograms using GURPS convention", () => {
  assert.equal(poundsToKilograms(2), 1);
  assert.equal(poundsToKilograms(3), 1.5);
  assert.equal(poundsToKilograms(0.1), 0.05);
});

test("converts kilograms to pounds using GURPS convention", () => {
  assert.equal(kilogramsToPounds(1), 2);
  assert.equal(kilogramsToPounds(1.5), 3);
});

test("parses GCS pound weights", () => {
  assert.equal(parseGcsWeight("2 lb"), 1);
  assert.equal(parseGcsWeight("3 lb"), 1.5);
  assert.equal(parseGcsWeight("0.1 lb"), 0.05);
  assert.equal(parseGcsWeight("10 lbs"), 5);
});

test("parses kilogram weights", () => {
  assert.equal(parseGcsWeight("1 kg"), 1);
  assert.equal(parseGcsWeight("1.5 kg"), 1.5);
});

test("parses numeric weights as kilograms", () => {
  assert.equal(parseGcsWeight(1.5), 1.5);
  assert.equal(parseGcsWeight("1.5"), 1.5);
});

test("treats empty weight as zero", () => {
  assert.equal(parseGcsWeight(undefined), 0);
  assert.equal(parseGcsWeight(null), 0);
  assert.equal(parseGcsWeight(""), 0);
});

test("rejects unsupported weight format", () => {
  assert.throws(() => {
    parseGcsWeight("heavy");
  });
});

test("rejects negative normalized weight", () => {
  assert.throws(() => {
    normalizeWeightKg("-1 lb");
  });
});

test("normalizes valid weight to kilograms", () => {
  assert.equal(normalizeWeightKg("3 lb"), 1.5);
});
