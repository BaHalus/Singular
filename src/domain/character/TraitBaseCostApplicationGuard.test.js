import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { withTraitCalculatedBaseCost } from "./TraitBaseCost.js";

test("refuses to apply an incomplete calculation", () => {
  const trait = createTrait({
    id: "trait-apply-incomplete",
    role: "advantage",
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 5,
    },
  });

  assert.throws(
    () => withTraitCalculatedBaseCost(trait),
    /requires ready status, received incomplete/,
  );
});
