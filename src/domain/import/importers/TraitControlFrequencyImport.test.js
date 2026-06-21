import test from "node:test";
import assert from "node:assert/strict";

import { createTrait, serializeTrait } from "../../character/Traits.js";
import { evaluateTraitControlFrequencyCost } from "../../character/TraitControlFrequencyCost.js";
import { importTraits } from "./TraitsImporter.js";

test("projects GCS cr, cr_adj, frequency and round_down into canonical Trait fields", () => {
  const imported = importTraits({
    rows: [{
      id: "disadv-control-001",
      name: "Compulsão",
      base_points: -7,
      cr: 10,
      cr_adj: "reaction_penalty",
      frequency: 6,
      round_down: true,
    }],
  });

  assert.equal(imported.disadvantages.length, 1);
  const projected = imported.disadvantages[0];
  assert.equal(projected.selfControl.roll, 10);
  assert.equal(projected.selfControl.adjustment, "reaction_penalty");
  assert.equal(projected.frequency.roll, 6);
  assert.equal(projected.roundCostDown, true);

  const trait = createTrait(projected, "disadvantage");
  const result = evaluateTraitControlFrequencyCost(trait);
  const serialized = serializeTrait(trait);

  assert.equal(trait.selfControl.roll, 10);
  assert.equal(trait.selfControl.multiplier, 1.33);
  assert.equal(trait.selfControl.adjustment.type, "reaction-penalty");
  assert.equal(trait.frequency.roll, 6);
  assert.equal(trait.frequency.multiplier, 0.5);
  assert.equal(result.conditionalMultiplier, 0.665);
  assert.equal(result.rawPoints, -4.655);
  assert.equal(result.calculatedPoints, -5);
  assert.equal(result.rounding.policy, "down");
  assert.equal(serialized.selfControl.roll, 10);
  assert.equal(serialized.frequency.roll, 6);
  assert.equal(serialized.roundCostDown, true);
});

test("keeps omitted GCS control fields mechanically neutral", () => {
  const imported = importTraits({
    rows: [{
      id: "adv-neutral-001",
      name: "Vantagem Neutra",
      base_points: 5,
      tags: ["Vantagem"],
    }],
  });
  const trait = createTrait(imported.advantages[0], "advantage");
  const result = evaluateTraitControlFrequencyCost(trait);

  assert.equal(trait.selfControl.status, "none");
  assert.equal(trait.frequency.status, "none");
  assert.equal(result.conditionalMultiplier, 1);
  assert.equal(result.calculatedPoints, 5);
});
