import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitBaseCost } from "./TraitBaseCost.js";

test("does not promote legacy-only evidence", () => {
  const trait = createTrait({
    id: "trait-legacy-only",
    role: "advantage",
    points: 5,
    source: {
      kind: "unknown",
      provider: null,
      format: null,
      reference: null,
      version: null,
    },
  });
  const result = evaluateTraitBaseCost(trait);

  assert.equal(trait.pointValue.reconciliation.status, "legacy-only");
  assert.equal(result.status, "incomplete");
  assert.equal(result.calculatedPoints, null);
  assert.equal(result.diagnostics[0].code, "trait-base-cost-legacy-evidence-only");
});
