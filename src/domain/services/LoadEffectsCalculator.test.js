import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateLoadEffects,
  getLoadEffect,
} from "./LoadEffectsCalculator.js";

test("returns load effect table entries", () => {
  assert.deepEqual(getLoadEffect(0), { moveMultiplier: 1, dodgePenalty: 0 });
  assert.deepEqual(getLoadEffect(1), { moveMultiplier: 0.8, dodgePenalty: -1 });
  assert.deepEqual(getLoadEffect(2), { moveMultiplier: 0.6, dodgePenalty: -2 });
  assert.deepEqual(getLoadEffect(3), { moveMultiplier: 0.4, dodgePenalty: -3 });
  assert.deepEqual(getLoadEffect(4), { moveMultiplier: 0.2, dodgePenalty: -4 });
});

test("calculates level zero effects", () => {
  const result = calculateLoadEffects({ basicMove: 6, dodge: 9, encumbranceLevel: 0 });

  assert.equal(result.moveMultiplier, 1);
  assert.equal(result.effectiveMove, 6);
  assert.equal(result.dodgePenalty, 0);
  assert.equal(result.effectiveDodge, 9);
});

test("calculates level one effects", () => {
  const result = calculateLoadEffects({ basicMove: 6, dodge: 9, encumbranceLevel: 1 });

  assert.equal(result.moveMultiplier, 0.8);
  assert.equal(result.effectiveMove, 4);
  assert.equal(result.dodgePenalty, -1);
  assert.equal(result.effectiveDodge, 8);
});

test("calculates level two effects", () => {
  const result = calculateLoadEffects({ basicMove: 6, dodge: 9, encumbranceLevel: 2 });

  assert.equal(result.moveMultiplier, 0.6);
  assert.equal(result.effectiveMove, 3);
  assert.equal(result.dodgePenalty, -2);
  assert.equal(result.effectiveDodge, 7);
});

test("calculates level three effects", () => {
  const result = calculateLoadEffects({ basicMove: 6, dodge: 9, encumbranceLevel: 3 });

  assert.equal(result.moveMultiplier, 0.4);
  assert.equal(result.effectiveMove, 2);
  assert.equal(result.dodgePenalty, -3);
  assert.equal(result.effectiveDodge, 6);
});

test("calculates level four effects", () => {
  const result = calculateLoadEffects({ basicMove: 6, dodge: 9, encumbranceLevel: 4 });

  assert.equal(result.moveMultiplier, 0.2);
  assert.equal(result.effectiveMove, 1);
  assert.equal(result.dodgePenalty, -4);
  assert.equal(result.effectiveDodge, 5);
});

test("floors effective move", () => {
  const result = calculateLoadEffects({ basicMove: 5.75, dodge: 9, encumbranceLevel: 1 });

  assert.equal(result.effectiveMove, 4);
});

test("rejects invalid inputs", () => {
  assert.throws(() => calculateLoadEffects({ basicMove: "6", dodge: 9, encumbranceLevel: 0 }));
  assert.throws(() => calculateLoadEffects({ basicMove: -1, dodge: 9, encumbranceLevel: 0 }));
  assert.throws(() => calculateLoadEffects({ basicMove: 6, dodge: "9", encumbranceLevel: 0 }));
  assert.throws(() => calculateLoadEffects({ basicMove: 6, dodge: 9, encumbranceLevel: 5 }));
  assert.throws(() => calculateLoadEffects({ basicMove: 6, dodge: 9, encumbranceLevel: 1.5 }));
});
