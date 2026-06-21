import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "../../character/Traits.js";
import { importTraits } from "./TraitsImporter.js";

test("imports GCS self-control, frequency, rounding and replacements declarations", () => {
  const result = importTraits({
    rows: [{
      id: "disadv-control-import",
      name: "Compulsão",
      base_points: -10,
      tags: ["Desvantagem"],
      cr: 9,
      cr_adj: "reaction_penalty",
      frequency: 12,
      round_down: true,
      replacements: {
        Vicio: "Jogos",
      },
    }],
  });
  const imported = result.disadvantages[0];
  const trait = createTrait({
    ...imported,
    role: "disadvantage",
  });

  assert.deepEqual(imported.selfControl, {
    roll: 9,
    adjustment: "reaction_penalty",
    raw: {
      cr: 9,
      cr_adj: "reaction_penalty",
    },
  });
  assert.deepEqual(imported.frequency, {
    roll: 12,
    raw: 12,
  });
  assert.equal(imported.roundCostDown, true);
  assert.deepEqual(imported.choices, { Vicio: "Jogos" });
  assert.equal(trait.selfControl.multiplier, 1.5);
  assert.equal(trait.frequency.multiplier, 2);
  assert.equal(trait.choices[0].key, "Vicio");
  assert.equal(trait.choices[0].value, "Jogos");
});

test("does not fabricate optional controls when the GCS payload omits them", () => {
  const result = importTraits({
    rows: [{
      id: "adv-no-controls",
      name: "Reflexos em Combate",
      base_points: 15,
      tags: ["Vantagem"],
    }],
  });
  const imported = result.advantages[0];

  assert.equal(imported.selfControl, null);
  assert.equal(imported.frequency, null);
  assert.equal(imported.roundCostDown, false);
  assert.equal(imported.choices, null);
});
