import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { recalculateTraitBaseCost } from "./TraitBaseCostOperations.js";

test("legacy points edit invalidates a derived base-cost snapshot and permits recalculation", () => {
  const original = createCharacter({
    advantages: [{
      id: "adv-legacy-points-edit",
      name: "Custo fixo editável",
      points: 5,
    }],
  });
  const costed = recalculateTraitBaseCost(
    original,
    "adv-legacy-points-edit",
    {
      now: "2026-06-21T12:50:00.000Z",
      operationId: "cost-before-legacy-points-edit",
    },
  ).character;

  const edited = createCharacter({
    ...costed,
    advantages: costed.advantages.map(item => (
      item.id === "adv-legacy-points-edit"
        ? { ...item, points: 10 }
        : item
    )),
  });
  const pointValue = edited.traits[0].pointValue;

  assert.equal(pointValue.legacyPoints, 10);
  assert.equal(pointValue.declaredPoints, 10);
  assert.equal(pointValue.baseCostCalculation, null);
  assert.equal(pointValue.calculatedPoints, null);
  assert.equal(pointValue.reconciliation.status, "declared-only");

  const recalculated = recalculateTraitBaseCost(
    edited,
    "adv-legacy-points-edit",
    {
      now: "2026-06-21T12:51:00.000Z",
      operationId: "cost-after-legacy-points-edit",
    },
  );

  assert.equal(recalculated.receipt.calculatedPoints, 10);
  assert.equal(
    recalculated.character.traits[0].pointValue.baseCostCalculation.calculatedPoints,
    10,
  );
});

test("legacy levels edit invalidates a per-level snapshot and permits recalculation", () => {
  const original = createCharacter({
    traits: [{
      id: "adv-legacy-levels-edit",
      role: "advantage",
      name: "Custo por nível editável",
      levels: 2,
      pointValue: {
        mode: "per-level",
        pointsPerLevel: 5,
        levels: 2,
      },
    }],
  });
  const costed = recalculateTraitBaseCost(
    original,
    "adv-legacy-levels-edit",
    {
      now: "2026-06-21T12:52:00.000Z",
      operationId: "cost-before-legacy-levels-edit",
    },
  ).character;

  const edited = createCharacter({
    ...costed,
    advantages: costed.advantages.map(item => (
      item.id === "adv-legacy-levels-edit"
        ? { ...item, levels: 3 }
        : item
    )),
  });
  const pointValue = edited.traits[0].pointValue;

  assert.equal(pointValue.levels, 3);
  assert.equal(pointValue.baseCostCalculation, null);
  assert.equal(pointValue.calculatedPoints, null);
  assert.equal(pointValue.reconciliation.status, "unknown");

  const recalculated = recalculateTraitBaseCost(
    edited,
    "adv-legacy-levels-edit",
    {
      now: "2026-06-21T12:53:00.000Z",
      operationId: "cost-after-legacy-levels-edit",
    },
  );

  assert.equal(recalculated.receipt.calculatedPoints, 15);
});

test("unrelated legacy edits preserve a current base-cost snapshot", () => {
  const original = createCharacter({
    advantages: [{
      id: "adv-legacy-name-edit",
      name: "Nome original",
      points: 5,
    }],
  });
  const costed = recalculateTraitBaseCost(
    original,
    "adv-legacy-name-edit",
    {
      now: "2026-06-21T12:54:00.000Z",
      operationId: "cost-before-legacy-name-edit",
    },
  ).character;
  const originalFingerprint = costed.traits[0]
    .pointValue.baseCostCalculation.inputFingerprint;

  const edited = createCharacter({
    ...costed,
    advantages: costed.advantages.map(item => (
      item.id === "adv-legacy-name-edit"
        ? { ...item, name: "Nome alterado" }
        : item
    )),
  });

  assert.equal(edited.traits[0].name, "Nome alterado");
  assert.equal(edited.traits[0].pointValue.calculatedPoints, 5);
  assert.equal(
    edited.traits[0].pointValue.baseCostCalculation.inputFingerprint,
    originalFingerprint,
  );
});
