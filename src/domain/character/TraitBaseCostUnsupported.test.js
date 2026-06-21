import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitBaseCost } from "./TraitBaseCost.js";

test("preserves future modes as unsupported", () => {
  const trait = createTrait({
    id: "trait-future-mode",
    role: "advantage",
    pointValue: {
      mode: "campaign-formula",
      declaredPoints: 20,
    },
  });
  const result = evaluateTraitBaseCost(trait);

  assert.equal(result.status, "unsupported");
  assert.equal(result.formula, null);
  assert.equal(result.calculatedPoints, null);
  assert.equal(result.diagnostics[0].mode, "campaign-formula");
});
