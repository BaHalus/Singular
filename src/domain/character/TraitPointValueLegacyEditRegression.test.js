import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";

test("legacy point edit reinfers total mode", () => {
  const original = createCharacter({
    traits: [{
      id: "trait-legacy-mode-reinfer",
      role: "advantage",
      name: "Sem custo inicial",
      points: null,
      pointValue: { mode: "unknown" },
    }],
  });

  const edited = createCharacter({
    ...original,
    advantages: original.advantages.map(item => ({ ...item, points: 5 })),
  });

  assert.equal(edited.traits[0].pointValue.mode, "total");
  assert.equal(edited.traits[0].pointValue.declaredPoints, 5);
  assert.equal(edited.traits[0].pointValue.complete, true);
  assert.equal(edited.traits[0].pointValue.reconciliation.status, "declared-only");
});
