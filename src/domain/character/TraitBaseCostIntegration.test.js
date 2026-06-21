import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";
import { serializeTrait } from "./Traits.js";
import { withTraitCalculatedBaseCost } from "./TraitBaseCost.js";

test("Character save and load preserve applied base cost", () => {
  const original = createCharacter({
    traits: [{
      id: "trait-base-cost-roundtrip",
      role: "advantage",
      points: 12,
      source: {
        kind: "imported",
        provider: "gcs",
        format: "gcs",
        reference: null,
        version: 2,
      },
      pointValue: {
        mode: "per-level",
        pointsPerLevel: 5,
        levels: 2,
      },
    }],
  });
  const applied = withTraitCalculatedBaseCost(original.traits[0]);
  const updated = createCharacter({
    ...serializeCharacter(original),
    traits: [serializeTrait(applied.trait)],
  });
  const serialized = serializeCharacter(updated);
  const restored = createCharacter(structuredClone(serialized));

  assert.equal(restored.traits[0].pointValue.calculatedPoints, 10);
  assert.equal(restored.traits[0].pointValue.reconciliation.status, "divergent");
  assert.deepEqual(serializeCharacter(restored), serialized);
});
