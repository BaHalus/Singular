import assert from "node:assert/strict";
import test from "node:test";

import {
  createConstructionModifier,
  createModifierBreakdown,
  createModifierBreakdownStep,
  createModifierFrameworkContract,
  createPricingRule,
  getModifierFrameworkSchemaVersion,
  serializeConstructionModifier,
  serializePricingRule,
  validateModifierBreakdownStep,
  validateModifierFrameworkContract,
  validatePricingRule,
} from "./ModifierFrameworkModel.js";

test("publishes the versioned Construction/Pricing contract in canonical order", () => {
  const contract = createModifierFrameworkContract();

  assert.equal(getModifierFrameworkSchemaVersion(), 1);
  assert.deepEqual(contract.construction.phases, [
    "base-and-levels",
    "additive",
    "own-factor",
    "percentage",
    "normal-cost",
  ]);
  assert.deepEqual(contract.pricing.phases, [
    "normal-cost",
    "pre-alternative",
    "alternative-group",
    "paid-cost",
  ]);
  assert.equal(contract.construction.output, "normalCost");
  assert.equal(contract.pricing.input, "normalCost");
  assert.equal(contract.pricing.output, "paidCost");
  assert.equal(
    contract.pricing.primarySelectionBasis,
    "post-pre-alternative-pricing",
  );
  assert.equal(contract.pricing.globalRoundingAllowed, false);
  assert.equal(validateModifierFrameworkContract(contract), true);
  assert.equal(Object.isFrozen(contract), true);
});

test("declares intrinsic additions, own factors and percentages without pricing", () => {
  const inputs = [
    { id: "add", operation: "addition", target: "base", value: -2 },
    { id: "divide", operation: "divisor", target: "levels", value: 2 },
    { id: "percent", operation: "percentage", target: "total", value: -20 },
  ];

  const modifiers = inputs.map(createConstructionModifier);
  assert.deepEqual(
    modifiers.map(modifier => modifier.operation),
    ["addition", "divisor", "percentage"],
  );
  assert.deepEqual(
    modifiers.map(serializeConstructionModifier),
    modifiers,
  );
  assert.throws(
    () => createConstructionModifier({
      id: "invalid",
      operation: "alternative-ability",
      target: "total",
      value: 5,
    }),
    /operation is invalid/,
  );
  assert.throws(
    () => createConstructionModifier({
      id: "zero-divisor",
      operation: "divisor",
      target: "total",
      value: 0,
    }),
    /must be positive/,
  );
});

test("keeps each structural pricing mechanism local and trait-only", () => {
  const oneUse = createPricingRule({
    id: "one-use",
    rule: "one-use",
    scope: "trait",
  });
  const cpActivation = createPricingRule({
    id: "cp",
    rule: "character-point-activation",
    scope: "trait",
  });
  const alternative = createPricingRule({
    id: "alternative",
    rule: "alternative-ability",
    scope: "trait-group",
  });

  for (const rule of [oneUse, cpActivation, alternative]) {
    assert.equal(rule.divisor, 5);
    assert.equal(rule.rounding, "ceil");
    assert.deepEqual(serializePricingRule(rule), rule);
  }
  assert.throws(
    () => createPricingRule({
      id: "equipment",
      rule: "one-use",
      scope: "trait",
      domain: "equipment",
    }),
    /Equipment cannot use character-point pricing/,
  );
  assert.throws(
    () => createPricingRule({
      id: "unknown-domain",
      rule: "one-use",
      scope: "trait",
      domain: "spell",
    }),
    /Pricing rule domain must be trait/,
  );
  assert.throws(
    () => createPricingRule({
      id: "wrong-alternative-scope",
      rule: "alternative-ability",
      scope: "trait",
    }),
    /requires scope trait-group/,
  );
  assert.throws(
    () => validatePricingRule({
      schemaVersion: 1,
      id: "wrong-one-use-scope",
      rule: "one-use",
      scope: "trait-group",
      domain: "trait",
      divisor: 5,
      rounding: "ceil",
      enabled: true,
      source: null,
    }),
    /requires scope trait/,
  );
  assert.throws(
    () => createPricingRule({
      id: "global-rounder",
      rule: "one-use",
      scope: "trait",
      rounding: "none",
    }),
    /round up inside its mechanism/,
  );
});

test("breakdown identifies every transformation and local rounding owner", () => {
  const construction = createModifierBreakdownStep({
    sequence: 0,
    stage: "construction",
    phase: "additive",
    ruleId: "trait:add",
    inputValue: 10,
    outputValue: 12,
  });
  const preAlternative = createModifierBreakdownStep({
    sequence: 1,
    stage: "pricing",
    phase: "pre-alternative",
    ruleId: "trait:one-use",
    inputValue: 12,
    outputValue: 3,
    rounding: { policy: "ceil", mechanism: "one-use" },
  });
  const alternative = createModifierBreakdownStep({
    sequence: 2,
    stage: "pricing",
    phase: "alternative-group",
    ruleId: "group:alternate",
    inputValue: 3,
    outputValue: 1,
    rounding: { policy: "ceil", mechanism: "alternative-ability" },
  });

  const breakdown = createModifierBreakdown({
    normalCost: 12,
    paidCost: 1,
    steps: [construction, preAlternative, alternative],
    diagnostics: [],
  });

  assert.deepEqual(
    breakdown.steps.map(step => [step.sequence, step.stage, step.phase]),
    [
      [0, "construction", "additive"],
      [1, "pricing", "pre-alternative"],
      [2, "pricing", "alternative-group"],
    ],
  );
  assert.equal(breakdown.steps[1].rounding.mechanism, "one-use");
  assert.equal(breakdown.steps[2].rounding.mechanism, "alternative-ability");
  assert.equal(Object.isFrozen(breakdown), true);
});

test("rejects noncanonical stage and phase ordering in breakdowns", () => {
  const step = (sequence, stage, phase) => ({
    sequence,
    stage,
    phase,
    ruleId: `${stage}:${phase}`,
    inputValue: 10,
    outputValue: 10,
  });

  assert.throws(
    () => createModifierBreakdown({
      normalCost: 10,
      paidCost: 10,
      steps: [
        step(0, "pricing", "normal-cost"),
        step(1, "construction", "normal-cost"),
      ],
    }),
    /stages must preserve canonical order/,
  );
  assert.throws(
    () => createModifierBreakdown({
      normalCost: 10,
      paidCost: null,
      steps: [
        step(0, "construction", "percentage"),
        step(1, "construction", "additive"),
      ],
    }),
    /phases must preserve canonical order/,
  );
});

test("requires a reason whenever a breakdown step is not applied", () => {
  assert.throws(
    () => createModifierBreakdownStep({
      sequence: 0,
      stage: "construction",
      phase: "additive",
      ruleId: "skipped",
      inputValue: 10,
      outputValue: 10,
      applied: false,
    }),
    /must include a non-empty reason/,
  );
  assert.throws(
    () => validateModifierBreakdownStep({
      schemaVersion: 1,
      sequence: 0,
      stage: "construction",
      phase: "additive",
      ruleId: "skipped",
      inputValue: 10,
      outputValue: 10,
      applied: false,
      reason: "   ",
      rounding: { policy: "none", mechanism: null },
      source: null,
    }),
    /must be non-empty string/,
  );
});

test("rejects global, unknown or misplaced structural rounding", () => {
  assert.throws(
    () => createModifierBreakdownStep({
      sequence: 0,
      stage: "construction",
      phase: "normal-cost",
      ruleId: "global-round",
      inputValue: 2.2,
      outputValue: 3,
      rounding: { policy: "ceil", mechanism: "global" },
    }),
    /Construction breakdown cannot apply structural rounding/,
  );
  assert.throws(
    () => createModifierBreakdownStep({
      sequence: 0,
      stage: "pricing",
      phase: "paid-cost",
      ruleId: "anonymous-round",
      inputValue: 2.2,
      outputValue: 3,
      rounding: { policy: "ceil", mechanism: null },
    }),
    /must identify its mechanism/,
  );
  assert.throws(
    () => createModifierBreakdownStep({
      sequence: 0,
      stage: "pricing",
      phase: "pre-alternative",
      ruleId: "unknown-round",
      inputValue: 2.2,
      outputValue: 3,
      rounding: { policy: "ceil", mechanism: "global" },
    }),
    /Pricing rounding mechanism is invalid/,
  );
  assert.throws(
    () => createModifierBreakdownStep({
      sequence: 0,
      stage: "pricing",
      phase: "alternative-group",
      ruleId: "misplaced-one-use",
      inputValue: 2.2,
      outputValue: 3,
      rounding: { policy: "ceil", mechanism: "one-use" },
    }),
    /requires phase pre-alternative/,
  );
  assert.throws(
    () => validateModifierBreakdownStep({
      schemaVersion: 1,
      sequence: 0,
      stage: "pricing",
      phase: "pre-alternative",
      ruleId: "misplaced-alternative",
      inputValue: 2.2,
      outputValue: 3,
      applied: true,
      reason: null,
      rounding: { policy: "ceil", mechanism: "alternative-ability" },
      source: null,
    }),
    /requires phase alternative-group/,
  );
});

test("requires dense deterministic breakdown sequence and portable values", () => {
  assert.throws(
    () => createModifierBreakdown({
      normalCost: 10,
      paidCost: null,
      steps: [{
        sequence: 1,
        stage: "construction",
        phase: "base-and-levels",
        ruleId: "base",
        inputValue: 0,
        outputValue: 10,
      }],
    }),
    /sequence must be dense and ordered/,
  );

  const cycle = {};
  cycle.self = cycle;
  assert.throws(
    () => createConstructionModifier({
      id: "cycle",
      operation: "addition",
      target: "total",
      value: 1,
      source: cycle,
    }),
    /must not contain cycles/,
  );
  assert.throws(
    () => createPricingRule({
      id: "infinite",
      rule: "one-use",
      scope: "trait",
      source: { value: Number.POSITIVE_INFINITY },
    }),
    /JSON portable/,
  );
});
