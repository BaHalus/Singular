import test from "node:test";
import assert from "node:assert/strict";

import { evaluateTraitBaseCost } from "./TraitBaseCost.js";
import {
  applyTraitCostBasisCommands,
  getTraitCostBasisCommandTypes,
  setTraitBasePoints,
  setTraitCostBasisLevels,
  setTraitCostBasisMode,
  setTraitPointsPerLevel,
} from "./TraitCostBasisCommands.js";
import { evaluateTraitModifierCost } from "./TraitModifierCost.js";
import { createTrait, serializeTrait } from "./Traits.js";

function createSource(overrides = {}) {
  return createTrait({
    id: "trait-cost-basis-commands",
    role: "advantage",
    name: "Base explícita",
    notes: "metadata preservada",
    tags: ["cost-basis"],
    source: {
      kind: "embedded",
      provider: "fixture",
      format: "json",
      reference: "test",
      version: 1,
    },
    raw: { original: true },
    importMeta: { source: "fixture", marker: true },
    modifiers: [{
      id: "enhancement",
      name: "Ampliação",
      kind: "enhancement",
      valueType: "percentage",
      value: 50,
    }],
    pointValue: {
      mode: "total",
      basePoints: 10,
      calculatedPoints: 10,
      customMetadata: { preserved: true },
    },
    ...overrides,
  });
}

test("declares explicit trait cost basis command types", () => {
  assert.deepEqual(getTraitCostBasisCommandTypes(), [
    "set-mode",
    "set-base-points",
    "set-points-per-level",
    "set-levels",
  ]);
});

test("updates total base points without mutating the source", () => {
  const source = createSource();
  const result = setTraitBasePoints(source, 25);

  assert.equal(result.pointValue.mode, "total");
  assert.equal(result.pointValue.basePoints, 25);
  assert.equal(result.pointValue.calculatedPoints, null);
  assert.equal(evaluateTraitBaseCost(result).calculatedPoints, 25);
  assert.equal(evaluateTraitModifierCost(result).calculatedPoints, 38);
  assert.equal(source.pointValue.basePoints, 10);
  assert.equal(source.pointValue.calculatedPoints, 10);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.pointValue), true);
});

test("clears stale final cost authority when invalidating calculated points", () => {
  const authority = {
    characterId: "character-with-authority",
    traitId: "trait-cost-basis-commands",
    contributionPoints: 10,
  };
  const source = createSource({
    pointValue: {
      mode: "total",
      basePoints: 10,
      calculatedPoints: 10,
      finalCostAuthority: authority,
    },
  });

  const result = setTraitBasePoints(source, 20);

  assert.equal(result.pointValue.calculatedPoints, null);
  assert.equal(result.pointValue.finalCostAuthority, null);
  assert.deepEqual(source.pointValue.finalCostAuthority, authority);
});

test("transitions atomically from total to per-level cost", () => {
  const source = createSource();
  const result = applyTraitCostBasisCommands(source, [
    { type: "set-mode", mode: "per-level" },
    { type: "set-points-per-level", value: 4 },
    { type: "set-levels", value: 3 },
  ]);
  const calculation = evaluateTraitBaseCost(result);

  assert.equal(result.pointValue.mode, "per-level");
  assert.equal(result.pointValue.pointsPerLevel, 4);
  assert.equal(result.pointValue.levels, 3);
  assert.equal(calculation.formula, "per-level");
  assert.equal(calculation.calculatedPoints, 12);
  assert.equal(evaluateTraitModifierCost(result).calculatedPoints, 18);
});

test("supports base-plus-levels through canonical evaluators", () => {
  const source = createSource();
  const result = applyTraitCostBasisCommands(source, [
    { type: "set-mode", mode: "base-plus-levels" },
    { type: "set-base-points", value: 5 },
    { type: "set-points-per-level", value: 2.5 },
    { type: "set-levels", value: 2 },
  ]);
  const base = evaluateTraitBaseCost(result);
  const modified = evaluateTraitModifierCost(result);

  assert.equal(base.formula, "base-plus-levels");
  assert.equal(base.calculatedPoints, 10);
  assert.equal(modified.calculatedPoints, 15);
  assert.equal(modified.baseCost.calculatedPoints, base.calculatedPoints);
});

test("individual helpers update only their explicit cost basis field", () => {
  const source = createSource({
    pointValue: {
      mode: "base-plus-levels",
      basePoints: 5,
      pointsPerLevel: 2,
      levels: 3,
    },
  });

  const mode = setTraitCostBasisMode(source, "per-level");
  const perLevel = setTraitPointsPerLevel(source, 4);
  const levels = setTraitCostBasisLevels(source, 6);

  assert.equal(mode.pointValue.mode, "per-level");
  assert.equal(mode.pointValue.basePoints, 5);
  assert.equal(perLevel.pointValue.pointsPerLevel, 4);
  assert.equal(perLevel.pointValue.levels, 3);
  assert.equal(levels.pointValue.levels, 6);
  assert.equal(levels.pointValue.pointsPerLevel, 2);
});

test("preserves identity, modifiers, source, raw and metadata", () => {
  const source = createSource();
  const result = setTraitBasePoints(source, 20);
  const before = serializeTrait(source);
  const after = serializeTrait(result);

  for (const field of [
    "id",
    "role",
    "name",
    "notes",
    "tags",
    "source",
    "raw",
    "importMeta",
    "modifiers",
  ]) {
    assert.deepEqual(after[field], before[field]);
  }
  assert.deepEqual(
    after.pointValue.customMetadata,
    before.pointValue.customMetadata,
  );
});

test("allows explicit missing fields and reports incomplete canonical cost", () => {
  const source = createSource({
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 3,
      levels: 2,
    },
  });
  const result = setTraitCostBasisLevels(source, null);
  const calculation = evaluateTraitBaseCost(result);

  assert.equal(result.pointValue.levels, null);
  assert.equal(calculation.status, "incomplete");
  assert.deepEqual(calculation.missingFields, ["levels"]);
});

test("rejects invalid batches without changing any part of the source", () => {
  const source = createSource();
  const before = serializeTrait(source);

  assert.throws(
    () => applyTraitCostBasisCommands(source, [
      { type: "set-base-points", value: 30 },
      { type: "set-levels", value: Number.POSITIVE_INFINITY },
    ]),
    /finite number or null/,
  );
  assert.deepEqual(serializeTrait(source), before);
});

test("rejects unsupported modes, malformed commands and non-arrays", () => {
  const source = createSource();

  assert.throws(
    () => setTraitCostBasisMode(source, "unknown"),
    /mode is invalid/,
  );
  assert.throws(
    () => applyTraitCostBasisCommands(source, [{ type: "invented" }]),
    /command type is invalid/,
  );
  assert.throws(
    () => applyTraitCostBasisCommands(source, "set-mode"),
    /must be array/,
  );
});
