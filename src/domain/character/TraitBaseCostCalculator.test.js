import test from "node:test";
import assert from "node:assert/strict";

import { createTraitPointValue } from "./TraitPointValue.js";
import { calculateTraitBaseCost } from "./TraitBaseCostCalculator.js";

function pointValue(input) {
  return createTraitPointValue(input, { sourceKind: "singular" });
}

test("calculates fixed and leveled base costs", () => {
  const fixed = calculateTraitBaseCost(pointValue({
    mode: "total",
    declaredPoints: 15,
  }));
  const perLevel = calculateTraitBaseCost(pointValue({
    mode: "per-level",
    pointsPerLevel: 5,
    levels: 3,
  }));
  const basePlus = calculateTraitBaseCost(pointValue({
    mode: "base-plus-levels",
    basePoints: 10,
    pointsPerLevel: 4,
    levels: 2,
  }));

  assert.equal(fixed.calculatedPoints, 15);
  assert.equal(perLevel.calculatedPoints, 15);
  assert.equal(basePlus.calculatedPoints, 18);
});

test("keeps imported evidence separate from a calculation rule", () => {
  const result = calculateTraitBaseCost(createTraitPointValue({
    mode: "total",
    importedPoints: 15,
  }, { sourceKind: "imported" }));

  assert.equal(result.status, "incomplete");
  assert.equal(result.calculatedPoints, null);
});
