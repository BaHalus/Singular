import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  createTraitFrequency,
  createTraitSelfControl,
  serializeTraitFrequency,
  serializeTraitSelfControl,
} from "./TraitControl.js";
import {
  evaluateTraitControlFrequencyCost,
  serializeTraitControlFrequencyCost,
  validateTraitControlFrequencyCost,
} from "./TraitControlFrequencyCost.js";

function fixedTrait({
  points = 10,
  selfControl = null,
  frequency = null,
  roundCostDown = false,
  modifiers = [],
  pointValue = null,
} = {}) {
  return createTrait({
    id: `trait-control-${points}`,
    role: points < 0 ? "disadvantage" : "advantage",
    name: "Trait com controle e frequência",
    pointValue: pointValue ?? { basePoints: points },
    selfControl,
    frequency,
    roundCostDown,
    modifiers,
  });
}

test("normalizes the official self-control rolls and multipliers", () => {
  const expected = new Map([
    [0, 1],
    [1, 2.5],
    [6, 2],
    [7, 1.83],
    [8, 1.67],
    [9, 1.5],
    [10, 1.33],
    [11, 1.17],
    [12, 1],
    [13, 0.83],
    [14, 0.67],
    [15, 0.5],
  ]);

  for (const [roll, multiplier] of expected) {
    const selfControl = createTraitSelfControl(roll);
    assert.equal(selfControl.roll, roll);
    assert.equal(selfControl.multiplier, multiplier);
    assert.equal(selfControl.status, roll === 0 ? "none" : "ready");
  }
});

test("normalizes the official frequency rolls and multipliers", () => {
  const expected = new Map([
    [0, 1],
    [6, 0.5],
    [9, 1],
    [12, 2],
    [15, 3],
    [18, 4],
  ]);

  for (const [roll, multiplier] of expected) {
    const frequency = createTraitFrequency(roll);
    assert.equal(frequency.roll, roll);
    assert.equal(frequency.multiplier, multiplier);
    assert.equal(frequency.status, roll === 0 ? "none" : "ready");
  }
});

test("derives self-control adjustment values without changing point cost", () => {
  const selfControl = createTraitSelfControl({
    roll: 9,
    adjustment: "minor_cost_of_living_increase",
  });
  const trait = fixedTrait({
    points: -10,
    selfControl,
  });
  const result = evaluateTraitControlFrequencyCost(trait, {
    rounding: "none",
  });

  assert.equal(selfControl.penalty, -3);
  assert.equal(selfControl.adjustment.type, "minor-cost-of-living-increase");
  assert.equal(selfControl.adjustment.value, 15);
  assert.equal(result.rawPoints, -15);
  assert.equal(result.diagnostics.length, 0);
});

test("applies self-control and frequency after modifiers and rounds once", () => {
  const trait = fixedTrait({
    points: 2,
    selfControl: 9,
    modifiers: [{ id: "enhancement", cost_adj: "+10%" }],
  });

  const result = evaluateTraitControlFrequencyCost(trait);

  assert.equal(result.modifierCost.rawPoints, 2.2);
  assert.equal(result.modifierCost.calculatedPoints, 2.2);
  assert.equal(result.conditionalMultiplier, 1.5);
  assert.equal(result.rawPoints, 3.3);
  assert.equal(result.calculatedPoints, 4);
  assert.equal(result.rounding.applied, true);
});

test("combines self-control and frequency multipliers deterministically", () => {
  const trait = fixedTrait({
    points: 10,
    selfControl: 7,
    frequency: 12,
  });

  const result = evaluateTraitControlFrequencyCost(trait, {
    rounding: "none",
  });

  assert.equal(result.conditionalMultiplier, 3.66);
  assert.equal(result.rawPoints, 36.6);
  assert.equal(result.calculatedPoints, 36.6);
});

test("uses the Trait round-down declaration and supports an explicit override", () => {
  const positive = fixedTrait({
    points: 2,
    selfControl: 9,
    modifiers: [{ id: "enhancement", cost_adj: "+10%" }],
    roundCostDown: true,
  });
  const negative = fixedTrait({
    points: -2,
    selfControl: 9,
    modifiers: [{ id: "enhancement", cost_adj: "+10%" }],
    roundCostDown: true,
  });

  const positiveResult = evaluateTraitControlFrequencyCost(positive);
  const negativeResult = evaluateTraitControlFrequencyCost(negative);
  const override = evaluateTraitControlFrequencyCost(positive, {
    rounding: "up",
  });

  assert.equal(positiveResult.rawPoints, 3.3);
  assert.equal(positiveResult.calculatedPoints, 3);
  assert.equal(positiveResult.rounding.source, "trait");
  assert.equal(negativeResult.rawPoints, -3.3);
  assert.equal(negativeResult.calculatedPoints, -4);
  assert.equal(override.calculatedPoints, 4);
  assert.equal(override.rounding.source, "option");
});

test("blocks unsupported mechanical rolls without inventing multipliers", () => {
  const unsupportedSelfControl = evaluateTraitControlFrequencyCost(
    fixedTrait({ selfControl: 5 }),
  );
  const unsupportedFrequency = evaluateTraitControlFrequencyCost(
    fixedTrait({ frequency: 17 }),
  );

  assert.equal(unsupportedSelfControl.status, "unsupported");
  assert.equal(unsupportedSelfControl.selfControl.multiplier, null);
  assert.equal(unsupportedSelfControl.calculatedPoints, null);
  assert.equal(unsupportedFrequency.status, "unsupported");
  assert.equal(unsupportedFrequency.frequency.multiplier, null);
  assert.equal(unsupportedFrequency.calculatedPoints, null);
});

test("preserves unknown operational adjustments as warnings without blocking cost", () => {
  const trait = fixedTrait({
    selfControl: {
      roll: 12,
      adjustment: "future_adjustment",
    },
  });

  const result = evaluateTraitControlFrequencyCost(trait);

  assert.equal(result.status, "ready");
  assert.equal(result.calculatedPoints, 10);
  assert.equal(result.selfControl.adjustment.status, "unsupported");
  assert.deepEqual(result.diagnostics.map(item => item.code), [
    "trait-self-control-adjustment-unsupported",
  ]);
});

test("propagates incomplete modifier cost without exposing a partial total", () => {
  const trait = fixedTrait({
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 5,
      levels: null,
    },
    selfControl: 9,
  });

  const result = evaluateTraitControlFrequencyCost(trait);

  assert.equal(result.status, "incomplete");
  assert.equal(result.complete, false);
  assert.equal(result.rawPoints, null);
  assert.equal(result.calculatedPoints, null);
});

test("rehydrates serialized control declarations and returns immutable evaluations", () => {
  const selfControl = createTraitSelfControl({
    roll: 10,
    adjustment: "reaction_penalty",
  });
  const frequency = createTraitFrequency({ roll: 15 });
  const rehydratedSelfControl = createTraitSelfControl(
    serializeTraitSelfControl(selfControl),
  );
  const rehydratedFrequency = createTraitFrequency(
    serializeTraitFrequency(frequency),
  );
  const trait = fixedTrait({
    selfControl: rehydratedSelfControl,
    frequency: rehydratedFrequency,
  });
  const result = evaluateTraitControlFrequencyCost(trait);
  const serialized = serializeTraitControlFrequencyCost(result);

  assert.equal(rehydratedSelfControl.adjustment.type, "reaction-penalty");
  assert.equal(rehydratedFrequency.roll, 15);
  assert.equal(validateTraitControlFrequencyCost(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.selfControl), true);
  assert.deepEqual(serialized, result);
  assert.notEqual(serialized, result);
});
