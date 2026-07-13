import test from "node:test";
import assert from "node:assert/strict";

import {
  createEquipmentModifier,
  createEquipmentModifierList,
  getEquipmentModifierNodeKinds,
  getEquipmentModifierSchemaVersion,
  serializeEquipmentModifier,
  serializeEquipmentModifierList,
  validateEquipmentModifier,
  validateEquipmentModifierList,
} from "./EquipmentModifiers.js";

function sampleModifierList() {
  return {
    type: "eqp_modifier_list",
    version: 2,
    id: "945608e7-f7f1-4355-a8cf-02d292e7ab82",
    rows: [
      {
        type: "eqp_modifier_container",
        id: "04f61624-9ebc-4ce9-ac6f-b381e359f3ac",
        disabled: true,
        name: "Qualidade da Arma",
        open: true,
        children: [
          {
            type: "eqp_modifier",
            id: "41229252-0fe2-4b85-97b8-bfcc440808d6",
            name: "Qualidade Superior",
            reference: "B274",
            cost_type: "to_base_cost",
            cost: "x4",
            features: [
              {
                type: "weapon_bonus",
                amount: 1,
                selection_type: "this_weapon",
              },
            ],
            notes: "-1 no teste de quebra; somente lâminas",
          },
        ],
      },
      {
        type: "eqp_modifier",
        id: "14b76b22-60e4-42ff-94c2-d3ae2d0fb1b9",
        name: "Prata",
        reference: "B275",
        cost_type: "to_base_cost",
        cost: "x19",
        notes: "+2 no teste de quebra",
      },
    ],
  };
}

test("declares equipment modifier contract metadata", () => {
  assert.equal(getEquipmentModifierSchemaVersion(), 1);
  assert.deepEqual(getEquipmentModifierNodeKinds(), ["modifier", "container"]);
});

test("creates canonical equipment modifier list from EQM data", () => {
  const list = createEquipmentModifierList(sampleModifierList());

  assert.equal(list.schemaVersion, 1);
  assert.equal(list.id, "945608e7-f7f1-4355-a8cf-02d292e7ab82");
  assert.equal(list.version, 2);
  assert.equal(list.source.type, "eqp_modifier_list");
  assert.equal(list.rows.length, 2);

  const [container, silver] = list.rows;
  assert.equal(container.kind, "container");
  assert.equal(container.enabled, false);
  assert.equal(container.open, true);
  assert.equal(container.children.length, 1);

  assert.equal(silver.kind, "modifier");
  assert.equal(silver.enabled, true);
  assert.deepEqual(silver.costAdjustment, {
    kind: "multiplier",
    target: "baseCost",
    type: "to_base_cost",
    expression: "x19",
    factor: 19,
    amount: null,
    percent: null,
  });
  assert.equal(silver.weightAdjustment, null);
});

test("preserves features, applicability and source without trait point semantics", () => {
  const list = createEquipmentModifierList(sampleModifierList());
  const modifier = list.rows[0].children[0];

  assert.equal(modifier.kind, "modifier");
  assert.deepEqual(modifier.features, [
    {
      type: "weapon_bonus",
      amount: 1,
      selection_type: "this_weapon",
    },
  ]);
  assert.deepEqual(modifier.applicability, {
    selectionType: "this_weapon",
    notes: null,
  });
  assert.equal(modifier.costAdjustment.kind, "multiplier");
  assert.equal(modifier.costAdjustment.target, "baseCost");
  assert.equal(modifier.costAdjustment.factor, 4);
  assert.equal(modifier.source.costType, "to_base_cost");
  assert.equal(modifier.source.costExpression, "x4");
});

test("creates and validates standalone equipment modifier", () => {
  const modifier = createEquipmentModifier({
    type: "eqp_modifier",
    id: "c49a7edd-1c86-4e0f-962b-c4e1b083060c",
    name: "Balas de Prata",
    reference: "B275",
    cost_type: "to_base_cost",
    cost: "x49",
  });

  assert.equal(validateEquipmentModifier(modifier), true);
  assert.equal(modifier.costAdjustment.factor, 49);
  assert.equal(modifier.applicability.selectionType, null);
});

test("declares weight adjustments separately when present", () => {
  const modifier = createEquipmentModifier({
    type: "eqp_modifier",
    id: "lightweight",
    name: "Leve",
    weight_type: "to_base_weight",
    weight: "x0.5",
  });

  assert.equal(modifier.costAdjustment, null);
  assert.deepEqual(modifier.weightAdjustment, {
    kind: "multiplier",
    target: "baseWeight",
    type: "to_base_weight",
    expression: "x0.5",
    factor: 0.5,
    amount: null,
    percent: null,
  });
});

test("preserves unsupported adjustment expressions instead of guessing", () => {
  const modifier = createEquipmentModifier({
    type: "eqp_modifier",
    id: "special",
    name: "Especial",
    cost_type: "to_base_cost",
    cost: "special formula",
  });

  assert.equal(modifier.costAdjustment.kind, "unsupported");
  assert.equal(modifier.costAdjustment.factor, null);
  assert.equal(modifier.costAdjustment.expression, "special formula");
});

test("serializes equipment modifier lists as independent portable clones", () => {
  const list = createEquipmentModifierList(sampleModifierList());
  const serialized = serializeEquipmentModifierList(list);

  assert.equal(validateEquipmentModifierList(list), true);
  assert.deepEqual(serialized, list);
  assert.notEqual(serialized, list);
  assert.notEqual(serialized.rows, list.rows);
  assert.equal(Object.isFrozen(list), true);
  assert.equal(Object.isFrozen(list.rows[0].children[0].features), true);
});

test("serializes standalone equipment modifier", () => {
  const modifier = createEquipmentModifier({
    type: "eqp_modifier",
    id: "d94a64f0-47ba-48e6-9cb1-285dd5d0c780",
    name: "Revestidas de Prata",
    reference: "B275",
    cost_type: "to_base_cost",
    cost: "x2",
  });

  const serialized = serializeEquipmentModifier(modifier);

  assert.deepEqual(serialized, modifier);
  assert.notEqual(serialized, modifier);
});

test("rejects duplicate ids across containers and children", () => {
  assert.throws(
    () => createEquipmentModifierList({
      type: "eqp_modifier_list",
      id: "duplicate-list",
      rows: [
        {
          type: "eqp_modifier_container",
          id: "same",
          children: [{ type: "eqp_modifier", id: "same" }],
        },
      ],
    }),
    /ids must be unique/,
  );
});

test("rejects non-portable feature values", () => {
  assert.throws(
    () => createEquipmentModifier({
      type: "eqp_modifier",
      id: "bad-feature",
      features: [{ type: "bad", amount: Number.NaN }],
    }),
    /must be JSON portable/,
  );
});
