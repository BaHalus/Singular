import test from "node:test";
import assert from "node:assert/strict";

import { createEquipmentModifierReadProjection } from "./EquipmentModifierReadProjection.js";

test("projects canonical equipment modifier trees, adjusted totals and breakdown", () => {
  const [projection] = createEquipmentModifierReadProjection([{
    id: "fine-sword",
    name: "Espada superior",
    kind: "item",
    quantity: 2,
    cost: 500,
    weightKg: 1.5,
    state: "carried",
    children: [],
    modifierList: {
      type: "eqp_modifier_list",
      id: "fine-sword:modifiers",
      rows: [{
        type: "eqp_modifier_container",
        id: "quality",
        name: "Qualidade",
        children: [{
          type: "eqp_modifier",
          id: "fine",
          name: "Superior",
          cost_type: "to_base_cost",
          cost: "x2",
          weight_type: "to_base_weight",
          weight: "-20%",
        }],
      }],
    },
  }]);

  assert.equal(projection.authority, "engine.equipment");
  assert.equal(projection.baseUnitCost, 500);
  assert.equal(projection.adjustedUnitCost, 1000);
  assert.equal(projection.baseUnitWeightKg, 1.5);
  assert.equal(projection.adjustedUnitWeightKg, 1.2);
  assert.equal(projection.selfTotals.cost, 2000);
  assert.equal(projection.selfTotals.weightKg, 2.4);
  assert.deepEqual(
    projection.modifiers.map(item => [item.id, item.depth, item.effectiveEnabled]),
    [["quality", 0, true], ["fine", 1, true]],
  );
  assert.equal(projection.breakdown.cost.steps[0].modifierId, "fine");
  assert.equal(projection.breakdown.weight.steps[0].modifierId, "fine");
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.breakdown), true);
});

test("keeps disabled modifier state and unsupported effects explicit", () => {
  const [projection] = createEquipmentModifierReadProjection([{
    id: "opaque-item",
    name: "Item importado",
    kind: "item",
    quantity: 1,
    cost: 10,
    weightKg: 1,
    state: "carried",
    children: [],
    modifierList: {
      type: "eqp_modifier_list",
      id: "opaque-item:modifiers",
      rows: [{
        type: "eqp_modifier",
        id: "opaque",
        name: "Fórmula futura",
        disabled: true,
        cost_type: "special",
        cost: "varies",
      }],
    },
  }]);

  assert.equal(projection.modifiers[0].effectiveEnabled, false);
  assert.equal(projection.modifiers[0].costAdjustment.kind, "unsupported");
  assert.equal(projection.breakdown.cost.steps[0].applied, false);
  assert.equal(projection.breakdown.cost.steps[0].reason, "disabled");
  assert.equal(projection.adjustedUnitCost, 10);
});
