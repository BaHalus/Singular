import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  evaluateTraitModifiedCost,
  withTraitCalculatedModifiedCost,
} from "./TraitModifiedCost.js";

function trait(input = {}) {
  return createTrait({
    id: input.id ?? "trait-modified",
    role: "advantage",
    name: "Trait",
    pointValue: input.pointValue ?? {
      mode: "total",
      basePoints: 100,
    },
    modifiers: input.modifiers ?? [],
  });
}

test("aggregates enhancements and limitations additively", () => {
  const result = evaluateTraitModifiedCost(trait({
    modifiers: [
      { id: "enh", cost_adj: "+20%" },
      { id: "lim", cost_adj: "-40%" },
    ],
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.rawPoints, 80);
  assert.equal(result.aggregates.baseEnhancement, 20);
  assert.equal(result.aggregates.baseLimitation, -40);
});

test("supports multiplicative percentage policy and limitation floor", () => {
  const modified = trait({
    modifiers: [
      { id: "enh", cost_adj: "+20%" },
      { id: "lim", cost_adj: "-50%" },
    ],
  });
  const multiplicative = evaluateTraitModifiedCost(modified, {
    percentagePolicy: "multiplicative",
  });
  const floored = evaluateTraitModifiedCost(trait({
    modifiers: [{ id: "deep-limit", cost_adj: "-120%" }],
  }));

  assert.equal(multiplicative.rawPoints, 60);
  assert.equal(floored.rawPoints, 20);
});

test("applies points to base or per-level components before percentages", () => {
  const result = evaluateTraitModifiedCost(trait({
    pointValue: {
      mode: "base-plus-levels",
      basePoints: 10,
      pointsPerLevel: 5,
      levels: 2,
    },
    modifiers: [
      { id: "base-points", cost_adj: "2", affects: "base_only" },
      { id: "level-points", cost_adj: "1", affects: "levels_only" },
      { id: "base-enh", cost_adj: "+50%", affects: "base_only" },
      { id: "level-lim", cost_adj: "-20%", affects: "levels_only" },
      { id: "mult", cost_adj: "x2" },
    ],
  }));

  assert.equal(result.aggregates.basePoints, 12);
  assert.equal(result.aggregates.pointsPerLevel, 6);
  assert.equal(result.aggregates.modifiedBase, 18);
  assert.equal(result.aggregates.modifiedLevels, 9.6);
  assert.equal(result.rawPoints, 55.2);
});

test("applies leveled modifiers and ignores disabled or textual modifiers", () => {
  const result = evaluateTraitModifiedCost(trait({
    modifiers: [
      { id: "leveled", cost_adj: "+5%", levels: 4 },
      { id: "disabled", cost_adj: "+100%", disabled: true },
      { id: "text", cost_adj: "special" },
    ],
  }));

  assert.equal(result.rawPoints, 120);
  assert.equal(result.contributions.length, 1);
  assert.equal(result.contributions[0].effectiveValue, 20);
  assert.equal(result.diagnostics.length, 2);
});

test("reports unsupported and incomplete cost-affecting modifiers", () => {
  const unsupported = evaluateTraitModifiedCost(trait({
    modifiers: [{
      id: "unknown",
      costType: "unknown",
      affectsCost: true,
    }],
  }));
  const incomplete = evaluateTraitModifiedCost(trait({
    modifiers: [{
      id: "missing",
      costType: "percentage",
      costValue: null,
      affectsCost: true,
    }],
  }));

  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.calculatedPoints, null);
  assert.equal(incomplete.status, "incomplete");
});

test("writes calculated authority and reconciles without mutating source", () => {
  const original = trait({
    pointValue: {
      mode: "total",
      basePoints: 100,
      importedPoints: 80,
    },
    modifiers: [{ id: "lim", cost_adj: "-20%" }],
  });
  const result = withTraitCalculatedModifiedCost(original);

  assert.equal(result.trait.pointValue.calculatedPoints, 80);
  assert.equal(result.reconciliation.status, "reconciled");
  assert.equal(original.pointValue.calculatedPoints, null);
});
