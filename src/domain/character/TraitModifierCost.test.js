import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  evaluateTraitModifierCost,
  projectTraitCostModifiers,
  serializeTraitModifierCost,
  validateTraitModifierCost,
} from "./TraitModifierCost.js";

function fixedTrait({ points = 100, modifiers = [], pointValue = null } = {}) {
  return createTrait({
    id: "trait-modifier-cost",
    role: "advantage",
    name: "Trait com modificadores",
    pointValue: pointValue ?? { basePoints: points },
    modifiers,
  });
}

test("evaluates canonical enhancement and limitation with an auditable breakdown", () => {
  const trait = fixedTrait({
    modifiers: [
      {
        id: "canonical-enhancement",
        name: "Ampliação",
        kind: "enhancement",
        valueType: "percentage",
        value: 50,
      },
      {
        id: "canonical-limitation",
        name: "Limitação",
        kind: "limitation",
        valueType: "percentage",
        value: 20,
      },
    ],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.modifiers.map(modifier => ({
      kind: modifier.kind,
      value: modifier.value,
      sourceFormat: modifier.sourceFormat,
    })),
    [
      {
        kind: "percentage",
        value: 50,
        sourceFormat: "canonical-percentage",
      },
      {
        kind: "percentage",
        value: -20,
        sourceFormat: "canonical-percentage",
      },
    ],
  );
  assert.deepEqual(result.calculationBreakdown, {
    basePoints: 100,
    percentageMode: "additive",
    enhancementsPercent: 50,
    limitationsGrossPercent: -20,
    limitationsEffectivePercent: -20,
    netModifierPercent: 30,
    beforeRounding: 130,
    rounding: {
      policy: "up",
      applied: false,
      input: 130,
      output: 130,
      difference: 0,
    },
    finalPoints: 130,
  });
});

test("caps the canonical net modifier at -80 percent and exposes effective limitation", () => {
  const trait = fixedTrait({
    modifiers: [
      {
        id: "canonical-enhancement",
        name: "Ampliação",
        kind: "enhancement",
        valueType: "percentage",
        value: 50,
      },
      {
        id: "canonical-limitation",
        name: "Limitação extrema",
        kind: "limitation",
        valueType: "percentage",
        value: 200,
      },
    ],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.calculationBreakdown.limitationsGrossPercent, -200);
  assert.equal(result.calculationBreakdown.limitationsEffectivePercent, -130);
  assert.equal(result.calculationBreakdown.netModifierPercent, -80);
  assert.equal(result.calculationBreakdown.finalPoints, 20);
});

test("rounds canonical percentage cost upward to the next integer", () => {
  const trait = fixedTrait({
    points: 10,
    modifiers: [{
      id: "canonical-limitation",
      name: "Limitação",
      kind: "limitation",
      valueType: "percentage",
      value: 25,
    }],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.calculationBreakdown.beforeRounding, 7.5);
  assert.equal(result.calculationBreakdown.rounding.policy, "up");
  assert.equal(result.calculationBreakdown.rounding.applied, true);
  assert.equal(result.calculationBreakdown.finalPoints, 8);
});

test("applies additive percentages and caps total limitations at -80 percent", () => {
  const trait = fixedTrait({
    modifiers: [
      { id: "enhancement", cost_adj: "+50%" },
      { id: "limitation", cost_adj: "-200%" },
    ],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.status, "ready");
  assert.equal(result.components.base.enhancementPercent, 50);
  assert.equal(result.components.base.limitationPercent, -200);
  assert.equal(result.components.base.appliedPercent, -80);
  assert.equal(result.calculatedPoints, 20);
});

test("keeps base-only and levels-only adjustments separated", () => {
  const trait = fixedTrait({
    pointValue: {
      mode: "base-plus-levels",
      basePoints: 10,
      pointsPerLevel: 5,
      levels: 2,
    },
    modifiers: [
      { id: "base-flat", cost_adj: "+5", affects: "base_only" },
      { id: "level-flat", cost_adj: "+2", affects: "levels_only" },
      { id: "base-percent", cost_adj: "+20%", affects: "base_only" },
      { id: "level-percent", cost_adj: "-50%", affects: "levels_only" },
    ],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.components.base.beforePercentage, 15);
  assert.equal(result.components.base.afterPercentage, 18);
  assert.equal(result.components.levels.beforePercentage, 14);
  assert.equal(result.components.levels.afterPercentage, 7);
  assert.equal(result.calculatedPoints, 25);
});

test("applies multipliers after percentage adjustments", () => {
  const trait = fixedTrait({
    modifiers: [
      { id: "enhancement", cost_adj: "+20%" },
      { id: "double", cost_adj: "x2" },
      { id: "half", cost_adj: "x50%" },
    ],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.beforeMultiplier, 120);
  assert.equal(result.multiplier, 1);
  assert.equal(result.calculatedPoints, 120);
});

test("supports additive and multiplicative percentage policies explicitly", () => {
  const trait = fixedTrait({
    modifiers: [
      { id: "enhancement", cost_adj: "+50%" },
      { id: "limitation", cost_adj: "-20%" },
    ],
  });

  const additive = evaluateTraitModifierCost(trait);
  const multiplicative = evaluateTraitModifierCost(trait, {
    percentageMode: "multiplicative",
  });

  assert.equal(additive.calculatedPoints, 130);
  assert.equal(additive.calculationBreakdown.percentageMode, "additive");
  assert.equal(additive.calculationBreakdown.netModifierPercent, 30);
  assert.equal(multiplicative.calculatedPoints, 120);
  assert.equal(multiplicative.components.base.appliedPercent, 20);
  assert.equal(
    multiplicative.calculationBreakdown.percentageMode,
    "multiplicative",
  );
  assert.equal(multiplicative.calculationBreakdown.netModifierPercent, 20);
});

test("rounds final positive and negative costs according to the declared policy", () => {
  const positive = fixedTrait({
    points: 6,
    modifiers: [{ id: "positive-fraction", cost_adj: "+20%" }],
  });
  const negative = fixedTrait({
    points: -6,
    modifiers: [{ id: "negative-fraction", cost_adj: "+20%" }],
  });

  assert.equal(evaluateTraitModifierCost(positive).rawPoints, 7.2);
  assert.equal(evaluateTraitModifierCost(positive).calculatedPoints, 8);
  assert.equal(
    evaluateTraitModifierCost(positive, { rounding: "down" }).calculatedPoints,
    7,
  );
  assert.equal(
    evaluateTraitModifierCost(positive, { rounding: "none" }).calculatedPoints,
    7.2,
  );

  assert.equal(evaluateTraitModifierCost(negative).rawPoints, -7.2);
  assert.equal(evaluateTraitModifierCost(negative).calculatedPoints, -7);
  assert.equal(
    evaluateTraitModifierCost(negative, { rounding: "down" }).calculatedPoints,
    -8,
  );
});

test("parses current GCS cost_adj data and modifier level multipliers", () => {
  const trait = fixedTrait({
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 10,
      levels: 3,
    },
    modifiers: [
      {
        id: "per-trait-level",
        cost_adj: "+5%",
        use_level_from_trait: true,
      },
      {
        id: "own-levels",
        cost_adj: "+1",
        levels: 2,
        affects: "levels_only",
      },
    ],
  });

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.equal(projected[0].kind, "percentage");
  assert.equal(projected[0].levelMultiplier, 3);
  assert.equal(projected[1].kind, "addition");
  assert.equal(projected[1].levelMultiplier, 2);
  assert.equal(result.components.levels.beforePercentage, 36);
  assert.equal(result.components.levels.appliedPercent, 15);
  assert.equal(result.calculatedPoints, 42);
});

test("parses legacy cost and cost_type modifier data", () => {
  const trait = fixedTrait({
    points: 10,
    modifiers: [
      { id: "legacy-points", cost: 2, cost_type: "points" },
      { id: "legacy-percent", cost: 50, cost_type: "percentage" },
      { id: "legacy-multiplier", cost: 2, cost_type: "multiplier" },
    ],
  });

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.deepEqual(projected.map(item => item.kind), [
    "addition",
    "percentage",
    "multiplier",
  ]);
  assert.equal(result.calculatedPoints, 36);
});

test("ignores disabled and textual modifiers mechanically while preserving them", () => {
  const trait = fixedTrait({
    points: 10,
    modifiers: [
      { id: "disabled", cost_adj: "+100%", disabled: true },
      { id: "text", name: "Somente descrição", notes: "Sem efeito mecânico" },
      { id: "text-annotation", name: "Anotação textual" },
    ],
  });

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.equal(projected[0].enabled, false);
  assert.equal(projected[1].kind, "textual");
  assert.equal(projected[2].kind, "textual");
  assert.equal(result.calculatedPoints, 10);
});

test("flattens modifier containers without making them a second authority", () => {
  const trait = fixedTrait({
    points: 10,
    modifiers: [{
      id: "container",
      name: "Pacote",
      children: [
        { id: "child-a", cost_adj: "+20%" },
        { id: "child-b", cost_adj: "+5" },
      ],
    }],
  });

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.deepEqual(projected.map(item => item.kind), [
    "container",
    "percentage",
    "addition",
  ]);
  assert.equal(result.calculatedPoints, 18);
});

test("blocks enabled unsupported cost expressions instead of guessing", () => {
  const trait = fixedTrait({
    modifiers: [{ id: "unknown", cost_adj: "special formula" }],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.status, "unsupported");
  assert.equal(result.complete, false);
  assert.equal(result.calculatedPoints, null);
  assert.equal(result.diagnostics[0].modifierId, "unknown");
});

test("does not let a disabled unsupported modifier block calculation", () => {
  const trait = fixedTrait({
    points: 10,
    modifiers: [{
      id: "disabled-unknown",
      cost_adj: "special formula",
      disabled: true,
    }],
  });

  const result = evaluateTraitModifierCost(trait);

  assert.equal(result.status, "ready");
  assert.equal(result.calculatedPoints, 10);
});

test("propagates incomplete and conflicting base-cost states", () => {
  const incomplete = createTrait({
    id: "trait-incomplete-base",
    role: "advantage",
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 5,
    },
    modifiers: [{ id: "enhancement", cost_adj: "+10%" }],
  });
  const conflict = createTrait({
    id: "trait-conflicting-base",
    role: "advantage",
    pointValue: {
      mode: "total",
      declaredPoints: 10,
      importedPoints: 12,
    },
  });

  assert.equal(evaluateTraitModifierCost(incomplete).status, "incomplete");
  assert.equal(evaluateTraitModifierCost(conflict).status, "conflict");
});

test("returns a deeply frozen, serializable evaluation without freezing caller data", () => {
  const sourceModifier = {
    id: "immutability",
    cost_adj: "+10%",
    metadata: { external: true },
  };
  const trait = fixedTrait({ modifiers: [sourceModifier] });
  const result = evaluateTraitModifierCost(trait);
  const serialized = serializeTraitModifierCost(result);

  assert.equal(validateTraitModifierCost(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.modifiers), true);
  assert.equal(Object.isFrozen(result.modifiers[0].raw), true);
  assert.equal(Object.isFrozen(sourceModifier), false);
  assert.deepEqual(serialized, result);
  assert.notEqual(serialized, result);
});

test("rejects invalid policies", () => {
  const trait = fixedTrait();

  assert.throws(
    () => evaluateTraitModifierCost(trait, { percentageMode: "invented" }),
    /percentage mode is invalid/,
  );
  assert.throws(
    () => evaluateTraitModifierCost(trait, { rounding: "nearest" }),
    /rounding policy is invalid/,
  );
});
