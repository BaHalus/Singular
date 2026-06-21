import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitBaseCost } from "./TraitBaseCost.js";

test("calculates fixed base cost", () => {
  const trait = createTrait({
    id: "trait-fixed",
    role: "advantage",
    pointValue: { basePoints: 10 },
  });
  const result = evaluateTraitBaseCost(trait);
  assert.equal(result.calculatedPoints, 10);
});
