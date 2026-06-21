import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { withTraitCalculatedBaseCost } from "./TraitBaseCost.js";

test("applies ready cost without mutating the source Trait", () => {
  const original = createTrait({
    id: "trait-apply-base-cost",
    role: "advantage",
    points: 12,
    source: {
      kind: "imported",
      provider: "gcs",
      format: "gcs",
      reference: null,
      version: 2,
    },
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 5,
      levels: 2,
    },
  });
  const applied = withTraitCalculatedBaseCost(original);

  assert.equal(original.pointValue.calculatedPoints, null);
  assert.equal(applied.trait.pointValue.calculatedPoints, 10);
  assert.equal(applied.reconciliation.status, "divergent");
  assert.equal(
    applied.reconciliation.differences.calculatedMinusImported,
    -2,
  );
});
