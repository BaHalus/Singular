import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitBaseCost } from "./TraitBaseCost.js";

test("reports missing leveled inputs", () => {
  const trait = createTrait({
    id: "trait-incomplete-levels",
    role: "advantage",
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 5,
      levels: null,
    },
  });
  const result = evaluateTraitBaseCost(trait);

  assert.equal(result.status, "incomplete");
  assert.equal(result.calculatedPoints, null);
  assert.deepEqual(result.missingFields, ["levels"]);
});
