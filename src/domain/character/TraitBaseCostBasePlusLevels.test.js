import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitBaseCost } from "./TraitBaseCost.js";

test("calculates base plus fractional levels without rounding", () => {
  const trait = createTrait({
    id: "trait-base-plus-levels",
    role: "advantage",
    pointValue: {
      basePoints: 5,
      pointsPerLevel: 2.5,
      levels: 1.5,
    },
  });
  const result = evaluateTraitBaseCost(trait);

  assert.equal(result.formula, "base-plus-levels");
  assert.equal(result.calculatedPoints, 8.75);
  assert.equal(result.rounding.policy, "none");
});
