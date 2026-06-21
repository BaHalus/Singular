import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitBaseCost } from "./TraitBaseCost.js";

test("blocks divergent fixed authorities", () => {
  const trait = createTrait({
    id: "trait-fixed-conflict",
    role: "advantage",
    pointValue: {
      mode: "total",
      declaredPoints: 10,
      importedPoints: 12,
    },
  });
  const result = evaluateTraitBaseCost(trait);

  assert.equal(result.status, "conflict");
  assert.equal(result.calculatedPoints, null);
  assert.deepEqual(result.conflictingAuthorities, [
    "declaredPoints",
    "importedPoints",
  ]);
});
