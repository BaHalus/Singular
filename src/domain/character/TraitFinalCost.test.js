import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  evaluateTraitFinalCost,
  serializeTraitFinalCost,
  validateTraitFinalCost,
} from "./TraitFinalCost.js";

function fixedTrait({
  points = 10,
  modifiers = [],
  selfControl = null,
  frequency = null,
  roundCostDown = false,
  pointValue = null,
} = {}) {
  return createTrait({
    id: "trait-final-cost",
    role: "advantage",
    name: "Trait final",
    pointValue: pointValue ?? { basePoints: points },
    modifiers,
    selfControl,
    frequency,
    roundCostDown,
  });
}

test("applies self-control and frequency after modifier arithmetic", () => {
  const trait = fixedTrait({
    modifiers: [{ id: "enhancement", cost_adj: "+20%" }],
    selfControl: 6,
    frequency: 6,
  });
  const result = evaluateTraitFinalCost(trait);

  assert.equal(result.status, "ready");
  assert.equal(result.modifierCost.rawPoints, 12);
  assert.equal(result.beforeControl, 12);
  assert.equal(result.selfControlMultiplier, 2);
  assert.equal(result.afterSelfControl, 24);
  assert.equal(result.frequencyMultiplier, 0.5);
  assert.equal(result.rawPoints, 12);
  assert.equal(result.calculatedPoints, 12);
});

test("defers all rounding until after modifiers and control multipliers", () => {
  const trait = fixedTrait({
    points: 5,
    modifiers: [{ id: "enhancement", cost_adj: "+10%" }],
    selfControl: 15,
    frequency: 12,
  });
  const result = evaluateTraitFinalCost(trait);

  assert.equal(result.modifierCost.policy.rounding, "none");
  assert.equal(result.modifierCost.rawPoints, 5.5);
  assert.equal(result.modifierCost.calculatedPoints, 5.5);
  assert.equal(result.afterSelfControl, 2.75);
  assert.equal(result.rawPoints, 5.5);
  assert.equal(result.calculatedPoints, 6);
});

test("uses the Trait round-down declaration for the final positive and negative result", () => {
  const positive = fixedTrait({
    points: 5,
    modifiers: [{ id: "fraction", cost_adj: "+10%" }],
    roundCostDown: true,
  });
  const negative = fixedTrait({
    points: -5,
    modifiers: [{ id: "fraction", cost_adj: "+10%" }],
    roundCostDown: true,
  });

  const positiveResult = evaluateTraitFinalCost(positive);
  const negativeResult = evaluateTraitFinalCost(negative);

  assert.equal(positiveResult.policy.rounding, "down");
  assert.equal(positiveResult.rawPoints, 5.5);
  assert.equal(positiveResult.calculatedPoints, 5);
  assert.equal(negativeResult.rawPoints, -5.5);
  assert.equal(negativeResult.calculatedPoints, -6);
});

test("forwards the explicit percentage policy to the modifier authority", () => {
  const trait = fixedTrait({
    points: 100,
    modifiers: [
      { id: "enhancement", cost_adj: "+50%" },
      { id: "limitation", cost_adj: "-20%" },
    ],
  });

  const additive = evaluateTraitFinalCost(trait);
  const multiplicative = evaluateTraitFinalCost(trait, {
    percentageMode: "multiplicative",
  });

  assert.equal(additive.calculatedPoints, 130);
  assert.equal(multiplicative.calculatedPoints, 120);
  assert.equal(multiplicative.policy.percentageMode, "multiplicative");
});

test("blocks unsupported control rolls without inventing a multiplier", () => {
  const selfControl = evaluateTraitFinalCost(fixedTrait({ selfControl: 5 }));
  const frequency = evaluateTraitFinalCost(fixedTrait({ frequency: 10 }));

  assert.equal(selfControl.status, "unsupported");
  assert.equal(selfControl.calculatedPoints, null);
  assert.equal(selfControl.diagnostics[0].field, "selfControl");
  assert.equal(frequency.status, "unsupported");
  assert.equal(frequency.calculatedPoints, null);
  assert.equal(frequency.diagnostics[0].field, "frequency");
});

test("keeps operational adjustment uncertainty separate from point cost", () => {
  const trait = fixedTrait({
    selfControl: { roll: 12, adjustment: "campaign_specific" },
  });
  const result = evaluateTraitFinalCost(trait);

  assert.equal(result.status, "ready");
  assert.equal(result.selfControl.adjustment.status, "unsupported");
  assert.equal(result.selfControlMultiplier, 1);
  assert.equal(result.calculatedPoints, 10);
});

test("propagates incomplete and conflicting modifier inputs", () => {
  const incomplete = fixedTrait({
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 5,
    },
  });
  const conflict = fixedTrait({
    pointValue: {
      mode: "total",
      declaredPoints: 10,
      importedPoints: 12,
    },
  });

  assert.equal(evaluateTraitFinalCost(incomplete).status, "incomplete");
  assert.equal(evaluateTraitFinalCost(conflict).status, "conflict");
});

test("returns a deeply frozen, serializable and self-validating evaluation", () => {
  const result = evaluateTraitFinalCost(fixedTrait({
    selfControl: 9,
    frequency: 15,
    modifiers: [{ id: "enhancement", cost_adj: "+10%" }],
  }));
  const serialized = serializeTraitFinalCost(result);

  assert.equal(validateTraitFinalCost(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.modifierCost), true);
  assert.equal(Object.isFrozen(result.selfControl), true);
  assert.deepEqual(serialized, result);
  assert.notEqual(serialized, result);
});

test("rejects unknown percentage policies", () => {
  assert.throws(
    () => evaluateTraitFinalCost(fixedTrait(), { percentageMode: "invented" }),
    /percentage mode is invalid/,
  );
});
