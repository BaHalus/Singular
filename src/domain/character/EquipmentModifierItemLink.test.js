import test from "node:test";
import assert from "node:assert/strict";

import {
  createEquipment,
  createEquipmentItem,
  serializeEquipment,
  validateEquipmentItem,
} from "./Equipment.js";
import { createEquipmentModifierList } from "./EquipmentModifiers.js";
import { updateEquipment } from "./EquipmentOperations.js";

function modifierList(id = "eq-sword:modifiers", factor = 2) {
  return createEquipmentModifierList({
    id,
    version: 3,
    source: {
      type: "eqp_modifier_list",
      version: 3,
      costType: null,
      costExpression: null,
      weightType: null,
      weightExpression: null,
    },
    raw: { type: "eqp_modifier_list", imported: true },
    rows: [
      {
        type: "eqp_modifier_container",
        id: `${id}:quality`,
        name: "Qualidade",
        children: [
          {
            type: "eqp_modifier",
            id: `${id}:cost`,
            name: `Custo x${factor}`,
            cost_type: "to_base_cost",
            cost: `x${factor}`,
          },
        ],
      },
    ],
  });
}

test("attaches a canonical modifier tree to its equipment item", () => {
  const list = modifierList();
  const item = createEquipmentItem({
    id: "eq-sword",
    name: "Espada",
    modifierList: list,
  });

  assert.equal(item.modifierList.id, "eq-sword:modifiers");
  assert.equal(item.modifierList.source.type, "eqp_modifier_list");
  assert.deepEqual(item.modifierList.raw, list.raw);
  assert.deepEqual(item.modifiers, item.modifierList.rows);
  assert.equal(validateEquipmentItem(item), true);
  assert.notEqual(item.modifierList, list);
});

test("does not infer canonical ownership from legacy rows", () => {
  const rows = modifierList("imported-list", 4).rows;
  const item = createEquipmentItem({
    id: "eq-imported",
    modifiers: rows,
  });

  assert.equal(item.modifierList, null);
  assert.deepEqual(item.modifiers, rows);
});

test("preserves noncanonical legacy modifier records without inventing a tree", () => {
  const legacyModifiers = [{ type: "equipment_modifier", name: "Compacto" }];
  const item = createEquipmentItem({
    id: "eq-legacy",
    modifiers: legacyModifiers,
  });

  assert.equal(item.modifierList, null);
  assert.deepEqual(item.modifiers, legacyModifiers);
  assert.equal(validateEquipmentItem(item), true);
});

test("rejects divergent compatibility rows when a canonical list is explicit", () => {
  assert.throws(
    () => createEquipmentItem({
      id: "eq-divergent",
      modifierList: modifierList("eq-divergent:modifiers", 2),
      modifiers: modifierList("other-list", 3).rows,
    }),
    /modifiers must match modifierList rows/,
  );
});

test("updates either modifier surface without retaining a stale counterpart", () => {
  const equipment = createEquipment([{
    id: "eq-updated",
    modifierList: modifierList("eq-updated:modifiers", 2),
  }]);

  const replacedList = updateEquipment(equipment, "eq-updated", {
    modifierList: modifierList("eq-updated:replacement", 3),
  });
  assert.equal(replacedList[0].modifierList.id, "eq-updated:replacement");
  assert.deepEqual(replacedList[0].modifiers, replacedList[0].modifierList.rows);

  const replacedRows = updateEquipment(replacedList, "eq-updated", {
    modifiers: modifierList("temporary", 5).rows,
  });
  assert.equal(replacedRows[0].modifierList, null);
  assert.equal(replacedRows[0].modifiers[0].children[0].costAdjustment.factor, 5);
  assert.equal(
    replacedList[0].modifierList.rows[0].children[0].costAdjustment.factor,
    3,
  );
});

test("serializes the canonical link as a portable snapshot", () => {
  const equipment = createEquipment([{
    id: "eq-serialized",
    name: "Armadura",
    modifierList: modifierList("eq-serialized:modifiers", 2),
  }]);

  const snapshot = serializeEquipment(equipment);
  assert.deepEqual(snapshot[0].modifierList, equipment[0].modifierList);
  assert.deepEqual(snapshot[0].modifiers, snapshot[0].modifierList.rows);
  assert.notEqual(snapshot[0].modifierList, equipment[0].modifierList);
});
