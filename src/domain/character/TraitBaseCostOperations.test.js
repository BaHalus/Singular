import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { withTraitBaseCostCalculation } from "./TraitBaseCostOperations.js";

test("stores a validated base cost calculation on the Trait", () => {
  const trait = createTrait({
    id: "trait-costed",
    role: "advantage",
    name: "Trait calculado",
    pointValue: {
      mode: "base-plus-levels",
      basePoints: 5,
      pointsPerLevel: 10,
      levels: 2,
    },
  });
  const result = withTraitBaseCostCalculation(trait);

  assert.equal(result.trait.pointValue.calculatedPoints, 25);
  assert.equal(
    result.trait.pointValue.baseCostCalculation.calculatedPoints,
    25,
  );
  assert.equal(result.trait.pointValue.reconciliation.status, "calculated-only");
  assert.equal(trait.pointValue.calculatedPoints, null);
});
