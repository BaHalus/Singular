import test from "node:test";
import assert from "node:assert/strict";

import { createTrait, serializeTrait } from "./Traits.js";
import { evaluateTraitFinalCost } from "./TraitFinalCost.js";

test("does not persist the individual final cost before alternative-group authority", () => {
  const trait = createTrait({
    id: "trait-final-cost-gate",
    role: "advantage",
    pointValue: {
      basePoints: 10,
      calculatedPoints: null,
    },
    modifiers: [{ id: "enhancement", cost_adj: "+20%" }],
    selfControl: 9,
  });
  const before = serializeTrait(trait);
  const result = evaluateTraitFinalCost(trait);
  const after = serializeTrait(trait);

  assert.equal(result.calculatedPoints, 18);
  assert.equal(trait.pointValue.calculatedPoints, null);
  assert.deepEqual(after, before);
});
