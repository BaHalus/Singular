import assert from "node:assert/strict";
import test from "node:test";

import { calculatePricing } from "./PricingEngine.js";
import { createPricingRule } from "./ModifierFrameworkModel.js";

const rule = (id, kind, options = {}) => createPricingRule({
  id,
  rule: kind,
  scope: kind === "alternative-ability" ? "trait-group" : "trait",
  enabled: options.enabled,
  source: options.source ?? null,
});

test("keeps normalCost and rounds one-use inside its own mechanism", () => {
  const result = calculatePricing({
    traits: [{ id: "ability", normalCost: 11, rules: [rule("once", "one-use")] }],
  });
  const ability = result.traits[0];

  assert.equal(ability.normalCost, 11);
  assert.equal(ability.preAlternativeBasis, 3);
  assert.equal(ability.paidCost, 3);
  assert.equal(ability.breakdown.normalCost, 11);
  assert.equal(ability.breakdown.paidCost, 3);
  const step = ability.breakdown.steps.find(item => item.ruleId === "once");
  assert.deepEqual(step.rounding, { policy: "ceil", mechanism: "one-use" });
  assert.equal(step.source.unroundedValue, 2.2);
});

test("rounds character-point activation inside its own mechanism", () => {
  const result = calculatePricing({
    traits: [{
      id: "activated",
      normalCost: 6,
      rules: [rule("activation", "character-point-activation")],
    }],
  });

  assert.equal(result.traits[0].paidCost, 2);
  assert.deepEqual(
    result.traits[0].breakdown.steps[1].rounding,
    { policy: "ceil", mechanism: "character-point-activation" },
  );
});

test("applies pre-alternative mechanisms in canonical deterministic order", () => {
  const result = calculatePricing({
    traits: [{
      id: "combined",
      normalCost: 26,
      rules: [
        rule("activation", "character-point-activation"),
        rule("once", "one-use"),
      ],
    }],
  });

  assert.equal(result.traits[0].preAlternativeBasis, 2);
  assert.deepEqual(
    result.traits[0].breakdown.steps.slice(1, 3).map(item => item.ruleId),
    ["once", "activation"],
  );
  assert.deepEqual(
    result.traits[0].breakdown.steps.slice(1, 3).map(item => item.outputValue),
    [6, 2],
  );
});

test("selects the Alternative Ability primary from the reduced basis", () => {
  const result = calculatePricing({
    traits: [
      { id: "expensive-normal", normalCost: 100, rules: [rule("once", "one-use")] },
      { id: "expensive-reduced", normalCost: 30, rules: [] },
    ],
    groupRules: [rule("alternatives", "alternative-ability")],
  });

  assert.equal(result.primaryTraitId, "expensive-reduced");
  assert.deepEqual(
    result.traits.map(item => ({
      id: item.id,
      basis: item.preAlternativeBasis,
      role: item.groupRole,
      paid: item.paidCost,
    })),
    [
      { id: "expensive-normal", basis: 20, role: "alternative", paid: 4 },
      { id: "expensive-reduced", basis: 30, role: "primary", paid: 30 },
    ],
  );
  assert.equal(result.traits[0].normalCost, 100);
  assert.deepEqual(
    result.traits[0].breakdown.steps.find(item => item.ruleId === "alternatives").rounding,
    { policy: "ceil", mechanism: "alternative-ability" },
  );
});

test("rounds again inside Alternative Ability after the prior reduction", () => {
  const result = calculatePricing({
    traits: [
      { id: "primary", normalCost: 30, rules: [] },
      { id: "alternative", normalCost: 26, rules: [rule("once", "one-use")] },
    ],
    groupRules: [rule("alternatives", "alternative-ability")],
  });
  const alternative = result.traits.find(item => item.id === "alternative");

  assert.equal(alternative.preAlternativeBasis, 6);
  assert.equal(alternative.paidCost, 2);
  assert.deepEqual(
    alternative.breakdown.steps
      .filter(step => step.rounding.policy === "ceil")
      .map(step => [step.rounding.mechanism, step.inputValue, step.outputValue]),
    [["one-use", 26, 6], ["alternative-ability", 6, 2]],
  );
});

test("breaks equal reduced-basis ties by lexicographically lowest trait id", () => {
  const result = calculatePricing({
    traits: [
      { id: "zeta", normalCost: 20 },
      { id: "alpha", normalCost: 20 },
    ],
    groupRules: [rule("alternatives", "alternative-ability")],
  });

  assert.equal(result.primaryTraitId, "alpha");
  assert.equal(result.diagnostics[0].tieBreak, "lexicographically-lowest-trait-id");
});

test("honors one explicit primary only when tied for maximum reduced basis", () => {
  const ready = calculatePricing({
    traits: [
      { id: "zeta", normalCost: 20, isPrimaryAlternative: true },
      { id: "alpha", normalCost: 20 },
    ],
    groupRules: [rule("alternatives", "alternative-ability")],
  });
  assert.equal(ready.primaryTraitId, "zeta");

  assert.throws(() => calculatePricing({
    traits: [
      { id: "cheap", normalCost: 10, isPrimaryAlternative: true },
      { id: "expensive", normalCost: 20 },
    ],
    groupRules: [rule("alternatives", "alternative-ability")],
  }), /primary must have maximum reduced basis/);
});

test("records disabled rules without silently applying them", () => {
  const result = calculatePricing({
    traits: [{ id: "ability", normalCost: 12, rules: [rule("once", "one-use", { enabled: false })] }],
  });
  const step = result.traits[0].breakdown.steps.find(item => item.ruleId === "once");

  assert.equal(result.traits[0].paidCost, 12);
  assert.equal(step.applied, false);
  assert.equal(step.reason, "rule-disabled");
  assert.deepEqual(step.rounding, { policy: "none", mechanism: null });
  assert.equal(result.traits[0].diagnostics[0].code, "PRICING_RULE_DISABLED");
});

test("rejects invalid groups, duplicate mechanisms, and negative costs", () => {
  assert.throws(() => calculatePricing({
    traits: [{ id: "solo", normalCost: 10 }],
    groupRules: [rule("alternatives", "alternative-ability")],
  }), /requires at least two traits/);
  assert.throws(() => calculatePricing({
    traits: [{
      id: "duplicate",
      normalCost: 10,
      rules: [rule("one", "one-use"), rule("two", "one-use")],
    }],
  }), /only one one-use rule/);
  assert.throws(
    () => calculatePricing({ traits: [{ id: "negative", normalCost: -1 }] }),
    /must be non-negative/,
  );
});

test("returns a frozen portable result with pricing-only breakdown", () => {
  const result = calculatePricing({
    traits: [{
      id: "portable",
      normalCost: 10,
      rules: [rule("once", "one-use", { source: { book: "Power-Ups" } })],
    }],
  });

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.traits[0].breakdown), true);
  assert.ok(result.traits[0].breakdown.steps.every(step => step.stage === "pricing"));
  assert.doesNotThrow(() => JSON.stringify(result));
});
