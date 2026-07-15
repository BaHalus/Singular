import test from "node:test";
import assert from "node:assert/strict";

import { createTraitModifierReadProjection } from "./TraitModifierReadProjection.js";

test("projects canonical Trait modifier costs and breakdown without UI calculation", () => {
  const [projection] = createTraitModifierReadProjection([{
    id: "trait-flight",
    name: "Voo",
    role: "advantage",
    pointValue: { basePoints: 40 },
    modifiers: [
      {
        id: "enhanced-speed",
        name: "Velocidade Ampliada",
        kind: "enhancement",
        valueType: "percentage",
        value: 20,
        source: null,
        notes: "",
      },
      {
        id: "winged",
        name: "Alado",
        kind: "limitation",
        valueType: "percentage",
        value: 25,
        source: null,
        notes: "",
      },
    ],
  }]);

  assert.equal(projection.status, "ready");
  assert.deepEqual(projection.baseCost, { status: "ready", points: 40 });
  assert.deepEqual(projection.finalCost, { status: "ready", points: 38 });
  assert.deepEqual(
    projection.modifiers.map(item => [item.id, item.value, item.enabled]),
    [["enhanced-speed", 20, true], ["winged", -25, true]],
  );
  assert.equal(projection.breakdown.enhancementsPercent, 20);
  assert.equal(projection.breakdown.limitationsGrossPercent, -25);
  assert.equal(projection.breakdown.netModifierPercent, -5);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.breakdown), true);
});

test("keeps unsupported modifier state explicit and auditable", () => {
  const [projection] = createTraitModifierReadProjection([{
    id: "trait-imported",
    name: "Importado",
    role: "advantage",
    points: 10,
    modifiers: [{ id: "opaque", name: "Sem fórmula", cost_adj: "varies" }],
  }]);

  assert.equal(projection.status, "unsupported");
  assert.equal(projection.finalCost.points, null);
  assert.equal(projection.breakdown, null);
  assert.equal(projection.modifiers[0].id, "opaque");
  assert.equal(projection.modifiers[0].sourceFormat, "gcs-cost-adj");
});
