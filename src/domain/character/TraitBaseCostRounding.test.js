import test from "node:test";
import assert from "node:assert/strict";

import { createTraitPointValue } from "./TraitPointValue.js";
import { calculateTraitBaseCost } from "./TraitBaseCostCalculator.js";

function value(input) {
  return createTraitPointValue(input, { sourceKind: "singular" });
}

test("preserves fractions and applies explicit rounding", () => {
  const pointValue = value({
    mode: "per-level",
    pointsPerLevel: 2.5,
    levels: 1.5,
  });
  const exact = calculateTraitBaseCost(pointValue);
  const rounded = calculateTraitBaseCost(pointValue, {
    roundingPolicy: "nearest",
    roundingIncrement: 0.5,
  });

  assert.equal(exact.calculatedPoints, 3.75);
  assert.equal(rounded.calculatedPoints, 4);
  assert.equal(rounded.rounding.applied, true);
});
