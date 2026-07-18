import assert from "node:assert/strict";
import test from "node:test";

import { calculateConstructionCost } from "./ConstructionEngine.js";
import { createConstructionModifier } from "./ModifierFrameworkModel.js";

const modifier = (id, operation, value, options = {}) =>
  createConstructionModifier({
    id,
    operation,
    value,
    target: options.target ?? "total",
    enabled: options.enabled,
    source: options.source ?? null,
  });

test("constructs normalCost in canonical phase order", () => {
  const result = calculateConstructionCost({
    baseCost: 10,
    levelCost: 5,
    levels: 2,
    modifiers: [
      modifier("percent", "percentage", -20),
      modifier("multiply", "multiplier", 2),
      modifier("add", "addition", 5),
      modifier("divide", "divisor", 2),
    ],
  });

  assert.equal(result.normalCost, 20);
  assert.deepEqual(
    result.breakdown.steps.map(step => step.phase),
    [
      "base-and-levels",
      "additive",
      "own-factor",
      "own-factor",
      "percentage",
      "normal-cost",
    ],
  );
  assert.deepEqual(
    result.breakdown.steps.slice(1, -1).map(step => step.ruleId),
    ["add", "multiply", "divide", "percent"],
  );
  assert.equal(result.breakdown.paidCost, null);
});

test("preserves declaration order inside the same canonical phase", () => {
  const result = calculateConstructionCost({
    baseCost: 10,
    modifiers: [
      modifier("multiply-first", "multiplier", 3),
      modifier("divide-second", "divisor", 2),
      modifier("add-first", "addition", 4),
      modifier("add-second", "addition", -1),
    ],
  });

  assert.equal(result.normalCost, 19.5);
  assert.deepEqual(
    result.breakdown.steps.slice(1, -1).map(step => step.ruleId),
    ["add-first", "add-second", "multiply-first", "divide-second"],
  );
});

test("records disabled and nonmatching modifiers without applying them", () => {
  const result = calculateConstructionCost({
    baseCost: 20,
    target: "baseCost",
    modifiers: [
      modifier("disabled", "addition", 10, { enabled: false }),
      modifier("weight-only", "multiplier", 3, { target: "baseWeight" }),
      modifier("shared", "percentage", -50, { target: "total" }),
    ],
  });

  assert.equal(result.normalCost, 10);
  const [disabled, mismatch, shared] = result.breakdown.steps.slice(1, -1);
  assert.equal(disabled.applied, false);
  assert.equal(disabled.reason, "modifier-disabled");
  assert.equal(mismatch.applied, false);
  assert.equal(mismatch.reason, "target-mismatch:baseWeight->baseCost");
  assert.equal(shared.applied, true);
  assert.deepEqual(
    result.diagnostics.map(item => item.code),
    ["CONSTRUCTION_MODIFIER_DISABLED", "CONSTRUCTION_TARGET_MISMATCH"],
  );
});

test("keeps structural pricing and structural rounding outside construction", () => {
  const result = calculateConstructionCost({
    baseCost: 15,
    modifiers: [modifier("intrinsic-divisor", "divisor", 3)],
  });

  assert.equal(result.normalCost, 5);
  assert.ok(result.breakdown.steps.every(step =>
    step.stage === "construction" &&
    step.rounding.policy === "none" &&
    step.rounding.mechanism === null
  ));
});

test("is deterministic for repeated inputs and cross-phase declaration order", () => {
  const inputs = {
    baseCost: 12,
    levelCost: 2,
    levels: 4,
    modifiers: [
      modifier("percent", "percentage", 25),
      modifier("add", "addition", 4),
      modifier("factor", "multiplier", 1.5),
    ],
  };
  const reordered = {
    ...inputs,
    modifiers: [inputs.modifiers[1], inputs.modifiers[2], inputs.modifiers[0]],
  };

  assert.deepEqual(calculateConstructionCost(inputs), calculateConstructionCost(inputs));
  assert.equal(
    calculateConstructionCost(inputs).normalCost,
    calculateConstructionCost(reordered).normalCost,
  );
});

test("rejects duplicate modifier ids and malformed numeric input", () => {
  assert.throws(
    () => calculateConstructionCost({
      baseCost: 10,
      modifiers: [
        modifier("duplicate", "addition", 1),
        modifier("duplicate", "percentage", 10),
      ],
    }),
    /id must be unique/,
  );
  assert.throws(
    () => calculateConstructionCost({ baseCost: Number.NaN }),
    /baseCost must be finite number/,
  );
  assert.throws(
    () => calculateConstructionCost({ baseCost: 10, levels: -1 }),
    /levels must be non-negative integer/,
  );
  assert.throws(
    () => calculateConstructionCost({ baseCost: 10, target: "paidCost" }),
    /target is invalid/,
  );
});

test("returns a frozen portable result with full provenance", () => {
  const result = calculateConstructionCost({
    baseCost: 8,
    modifiers: [
      modifier("source", "addition", 2, {
        source: { list: "advantages", externalId: "example" },
      }),
    ],
  });

  assert.equal(result.schemaVersion, 1);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.breakdown), true);
  assert.deepEqual(
    result.breakdown.steps[1].source.declaredSource,
    { list: "advantages", externalId: "example" },
  );
  assert.doesNotThrow(() => JSON.stringify(result));
});
