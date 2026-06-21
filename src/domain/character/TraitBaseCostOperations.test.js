import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import { createTrait } from "./Traits.js";
import {
  recalculateTraitBaseCost,
  withTraitBaseCostCalculation,
} from "./TraitBaseCostOperations.js";

test("stores a validated base cost calculation on the Trait", () => {
  const trait = createTrait({
    id: "trait-costed",
    role: "advantage",
    name: "Trait calculado",
    pointValue: {
      mode: "base-plus-levels",
      basePoints: 5,
      pointsPerLevel: 10,
      levels: 2,
    },
  });
  const result = withTraitBaseCostCalculation(trait);

  assert.equal(result.trait.pointValue.calculatedPoints, 25);
  assert.equal(
    result.trait.pointValue.baseCostCalculation.calculatedPoints,
    25,
  );
  assert.equal(result.trait.pointValue.reconciliation.status, "calculated-only");
  assert.equal(trait.pointValue.calculatedPoints, null);
});

test("recalculates atomically and survives Character save/load", () => {
  const character = createCharacter({
    identity: {
      id: "character-base-cost",
      name: "Base Cost",
      concept: "",
      playerId: null,
      campaignId: null,
    },
    traits: [{
      id: "trait-character-cost",
      role: "advantage",
      name: "Por nível",
      pointValue: {
        mode: "per-level",
        pointsPerLevel: 5,
        levels: 3,
      },
    }],
  });
  const result = recalculateTraitBaseCost(
    character,
    "trait-character-cost",
    {
      now: "2026-06-21T21:00:00.000Z",
      operationId: "operation-trait-base-cost",
    },
  );
  const restored = createCharacter(serializeCharacter(result.character));

  assert.equal(result.receipt.calculatedPoints, 15);
  assert.equal(result.character.advantages[0].points, null);
  assert.equal(restored.traits[0].pointValue.calculatedPoints, 15);
  assert.equal(
    restored.traits[0].pointValue.baseCostCalculation.inputFingerprint,
    result.calculation.inputFingerprint,
  );
  assert.equal(character.traits[0].pointValue.calculatedPoints, null);
});
