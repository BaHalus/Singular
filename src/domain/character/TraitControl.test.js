import test from "node:test";
import assert from "node:assert/strict";

import {
  createTraitFrequency,
  createTraitSelfControl,
  getKnownFrequencyRolls,
  getKnownSelfControlAdjustmentTypes,
  getKnownSelfControlRolls,
  serializeTraitFrequency,
  serializeTraitSelfControl,
  validateTraitFrequency,
  validateTraitSelfControl,
} from "./TraitControl.js";

test("maps every supported self-control roll to the GCS multiplier and penalty", () => {
  const expected = new Map([
    [0, [1, 0, "none"]],
    [1, [2.5, -5, "ready"]],
    [6, [2, -4, "ready"]],
    [7, [1.83, -4, "ready"]],
    [8, [1.67, -3, "ready"]],
    [9, [1.5, -3, "ready"]],
    [10, [1.33, -3, "ready"]],
    [11, [1.17, -2, "ready"]],
    [12, [1, -2, "ready"]],
    [13, [0.83, -2, "ready"]],
    [14, [0.67, -1, "ready"]],
    [15, [0.5, -1, "ready"]],
  ]);

  assert.deepEqual(getKnownSelfControlRolls(), [...expected.keys()]);
  for (const [roll, [multiplier, penalty, status]] of expected) {
    const result = createTraitSelfControl(roll);
    assert.equal(result.status, status);
    assert.equal(result.multiplier, multiplier);
    assert.equal(result.penalty, penalty);
  }
});

test("maps every supported frequency roll to its cost multiplier", () => {
  const expected = new Map([
    [0, 1],
    [6, 0.5],
    [9, 1],
    [12, 2],
    [15, 3],
    [18, 4],
  ]);

  assert.deepEqual(getKnownFrequencyRolls(), [...expected.keys()]);
  for (const [roll, multiplier] of expected) {
    const result = createTraitFrequency(roll);
    assert.equal(result.status, roll === 0 ? "none" : "ready");
    assert.equal(result.multiplier, multiplier);
  }
});

test("derives operational self-control adjustments without changing cost multipliers", () => {
  const cases = [
    ["action_penalty", -4],
    ["reaction_penalty", -4],
    ["fright_check_penalty", -4],
    ["fright_check_bonus", 4],
    ["minor_cost_of_living_increase", 20],
    ["major_cost_of_living_increase", 80],
  ];

  for (const [adjustment, value] of cases) {
    const result = createTraitSelfControl({ roll: 6, adjustment });
    assert.equal(result.multiplier, 2);
    assert.equal(result.adjustment.status, "ready");
    assert.equal(result.adjustment.value, value);
  }

  assert.ok(getKnownSelfControlAdjustmentTypes().includes("action-penalty"));
});

test("preserves unsupported rolls and adjustments without inventing mechanics", () => {
  const unsupportedRoll = createTraitSelfControl({
    roll: 5,
    adjustment: "action_penalty",
  });
  const unsupportedAdjustment = createTraitSelfControl({
    roll: 12,
    adjustment: "campaign_specific",
  });
  const unsupportedFrequency = createTraitFrequency(10);

  assert.equal(unsupportedRoll.status, "unsupported");
  assert.equal(unsupportedRoll.multiplier, null);
  assert.equal(unsupportedRoll.adjustment.status, "unsupported");
  assert.equal(unsupportedAdjustment.status, "ready");
  assert.equal(unsupportedAdjustment.adjustment.type, "unknown");
  assert.equal(unsupportedAdjustment.adjustment.status, "unsupported");
  assert.equal(unsupportedFrequency.status, "unsupported");
  assert.equal(unsupportedFrequency.multiplier, null);
});

test("accepts GCS aliases and returns deeply frozen serializable values", () => {
  const selfControl = createTraitSelfControl({
    cr: 9,
    cr_adj: "fright_check_bonus",
    metadata: { imported: true },
  });
  const frequency = createTraitFrequency({
    frequency: 15,
    metadata: { imported: true },
  });
  const serializedSelfControl = serializeTraitSelfControl(selfControl);
  const serializedFrequency = serializeTraitFrequency(frequency);

  assert.equal(validateTraitSelfControl(selfControl), true);
  assert.equal(validateTraitFrequency(frequency), true);
  assert.equal(selfControl.roll, 9);
  assert.equal(selfControl.adjustment.type, "fright-check-bonus");
  assert.equal(frequency.roll, 15);
  assert.equal(Object.isFrozen(selfControl), true);
  assert.equal(Object.isFrozen(selfControl.raw), true);
  assert.equal(Object.isFrozen(frequency), true);
  assert.deepEqual(serializedSelfControl, selfControl);
  assert.deepEqual(serializedFrequency, frequency);
  assert.notEqual(serializedSelfControl, selfControl);
  assert.notEqual(serializedFrequency, frequency);
});
