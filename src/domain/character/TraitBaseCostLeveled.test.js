import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitBaseCost } from "./TraitBaseCost.js";

test("calculates per-level cost", () => {
  const trait = createTrait({
    id: "trait-per-level",
    role: "advantage",
    pointValue: { pointsPerLevel: 2, levels: 3 },
  });
  assert.equal(evaluateTraitBaseCost(trait).calculatedPoints, 6);
});
