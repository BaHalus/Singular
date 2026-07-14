import test from "node:test";
import assert from "node:assert/strict";

import { createEquipment } from "./Equipment.js";
import {
  applyEquipmentModifierCommands,
  getEquipmentModifierCommandTypes,
} from "./EquipmentModifierCommands.js";
import { createEquipmentModifierList } from "./EquipmentModifiers.js";
import { resolveEquipmentTotals } from "../../engine/equipment/EquipmentTotalsResolver.js";

function sampleList() {
  return createEquipmentModifierList({
    type: "eqp_modifier_list",
    id: "equipment-command-list",
    version: 2,
    rows: [
      {
        type: "eqp_modifier_container",
        id: "quality",
        name: "Qualidade",
        reference: "B274",
        children: [
          {
            type: "eqp_modifier",
            id: "fine",
            name: "Superior",
            cost_type: "to_base_cost",
            cost: "x4",
            features: [{
              type: "weapon_bonus",
              amount: 1,
              selection_type: "this_weapon",
            }],
          },
          {
            type: "eqp_modifier",
            id: "light",
            name: "Leve",
            weight_type: "to_base_weight",
            weight: "x0.5",
          },
        ],
      },
      {
        type: "eqp_modifier_container",
        id: "materials",
        name: "Materiais",
        children: [],
      },
    ],
  });
}

test("declares canonical equipment tree command types", () => {
  assert.deepEqual(getEquipmentModifierCommandTypes(), [
    "add",
    "edit",
    "remove",
    "reorder",
    "set-enabled",
  ]);
});

test("adds modifiers and containers at explicit parent positions", () => {
  const result = applyEquipmentModifierCommands(sampleList(), [
    {
      type: "add",
      parentId: "materials",
      index: 0,
      node: {
        type: "eqp_modifier",
        id: "silver",
        name: "Prata",
        cost_type: "to_base_cost",
        cost: "x19",
      },
    },
    {
      type: "add",
      parentId: null,
      index: 1,
      node: {
        type: "eqp_modifier_container",
        id: "craft",
        name: "Fabricação",
        children: [],
      },
    },
  ]);

  assert.deepEqual(result.rows.map(node => node.id), [
    "quality",
    "craft",
    "materials",
  ]);
  assert.equal(result.rows[2].children[0].id, "silver");
  assert.equal(result.rows[2].children[0].costAdjustment.factor, 19);
});

test("edits leaf and container metadata without changing identity or hierarchy", () => {
  const original = sampleList();
  const result = applyEquipmentModifierCommands(original, [
    { type: "edit", id: "quality", patch: { name: "Qualidade da Arma" } },
    {
      type: "edit",
      id: "fine",
      patch: {
        notes: "Teste de quebra melhorado",
        applicability: { selectionType: "this_weapon", notes: "lâminas" },
      },
    },
  ]);

  assert.equal(result.rows[0].id, "quality");
  assert.equal(result.rows[0].name, "Qualidade da Arma");
  assert.deepEqual(result.rows[0].children.map(node => node.id), ["fine", "light"]);
  assert.equal(result.rows[0].children[0].notes, "Teste de quebra melhorado");
  assert.deepEqual(result.rows[0].children[0].features, original.rows[0].children[0].features);
  assert.equal(original.rows[0].name, "Qualidade");
});

test("removes a container with its subtree", () => {
  const result = applyEquipmentModifierCommands(sampleList(), [
    { type: "remove", id: "quality" },
  ]);

  assert.deepEqual(result.rows.map(node => node.id), ["materials"]);
});

test("reorders within a parent and moves nodes across containers", () => {
  const result = applyEquipmentModifierCommands(sampleList(), [
    {
      type: "reorder",
      id: "light",
      parentId: "quality",
      toIndex: 0,
    },
    {
      type: "reorder",
      id: "fine",
      parentId: "materials",
      toIndex: 0,
    },
  ]);

  assert.deepEqual(result.rows[0].children.map(node => node.id), ["light"]);
  assert.deepEqual(result.rows[1].children.map(node => node.id), ["fine"]);
  assert.equal(result.rows[1].children[0].costAdjustment.factor, 4);
  assert.equal(result.rows[1].children[0].source.costExpression, "x4");
});

test("sets enabled state for modifiers and containers", () => {
  const result = applyEquipmentModifierCommands(sampleList(), [
    { type: "set-enabled", id: "fine", enabled: false },
    { type: "set-enabled", id: "materials", enabled: false },
  ]);

  assert.equal(result.rows[0].children[0].enabled, false);
  assert.equal(result.rows[1].enabled, false);
});

test("rejects invalid batches atomically without mutating the source", () => {
  const original = sampleList();
  const before = structuredClone(original);

  assert.throws(
    () => applyEquipmentModifierCommands(original, [
      { type: "edit", id: "fine", patch: { name: "Alterado" } },
      {
        type: "add",
        parentId: "quality",
        index: 2,
        node: { type: "eqp_modifier", id: "light", name: "Duplicado" },
      },
    ]),
    /ids must be unique/,
  );

  assert.deepEqual(original, before);
  assert.equal(original.rows[0].children[0].name, "Superior");
});

test("rejects missing parents, modifier parents and invalid positions", () => {
  const list = sampleList();
  assert.throws(
    () => applyEquipmentModifierCommands(list, [{
      type: "add",
      parentId: "missing",
      index: 0,
      node: { type: "eqp_modifier", id: "new", name: "Novo" },
    }]),
    /id not found: missing/,
  );
  assert.throws(
    () => applyEquipmentModifierCommands(list, [{
      type: "add",
      parentId: "fine",
      index: 0,
      node: { type: "eqp_modifier", id: "new", name: "Novo" },
    }]),
    /parent must be container/,
  );
  assert.throws(
    () => applyEquipmentModifierCommands(list, [{
      type: "reorder",
      id: "fine",
      parentId: "quality",
      toIndex: 2,
    }]),
    /insertion index is invalid/,
  );
});

test("rejects cycles and structural type changes", () => {
  const nested = applyEquipmentModifierCommands(sampleList(), [{
    type: "add",
    parentId: "quality",
    index: 2,
    node: {
      type: "eqp_modifier_container",
      id: "nested",
      name: "Aninhado",
      children: [],
    },
  }]);

  assert.throws(
    () => applyEquipmentModifierCommands(nested, [{
      type: "reorder",
      id: "quality",
      parentId: "nested",
      toIndex: 0,
    }]),
    /must not create cycle/,
  );
  assert.throws(
    () => applyEquipmentModifierCommands(nested, [{
      type: "edit",
      id: "fine",
      patch: { type: "eqp_modifier_container" },
    }]),
    /cannot change type/,
  );
  assert.throws(
    () => applyEquipmentModifierCommands(nested, [{
      type: "edit",
      id: "fine",
      patch: { kind: "container" },
    }]),
    /cannot change kind/,
  );
  assert.throws(
    () => applyEquipmentModifierCommands(nested, [{
      type: "edit",
      id: "quality",
      patch: { children: [] },
    }]),
    /cannot change children/,
  );
  assert.throws(
    () => applyEquipmentModifierCommands(nested, [{
      type: "add",
      parentId: null,
      index: 0,
      node: { kind: "unknown", id: "invalid", name: "Inválido" },
    }]),
    /add node type is invalid/,
  );
  assert.throws(
    () => applyEquipmentModifierCommands(nested, [{
      type: "add",
      parentId: null,
      index: 0,
      node: {
        type: "eqp_modifier",
        id: "invalid-leaf",
        children: [],
      },
    }]),
    /leaf must not declare children/,
  );
});

test("returns deeply frozen canonical lists and preserves portable metadata", () => {
  const original = sampleList();
  const result = applyEquipmentModifierCommands(original, []);
  const fine = result.rows[0].children[0];

  assert.notEqual(result, original);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.rows), true);
  assert.equal(Object.isFrozen(fine.features), true);
  assert.deepEqual(fine.raw, original.rows[0].children[0].raw);
  assert.deepEqual(fine.source, original.rows[0].children[0].source);
  assert.deepEqual(fine.applicability, original.rows[0].children[0].applicability);
});

test("reorder is totals-neutral while enable-disable changes resolver output", () => {
  const original = sampleList();
  const reordered = applyEquipmentModifierCommands(original, [{
    type: "reorder",
    id: "quality",
    parentId: null,
    toIndex: 1,
  }]);
  const disabled = applyEquipmentModifierCommands(reordered, [{
    type: "set-enabled",
    id: "quality",
    enabled: false,
  }]);

  function totalCost(list) {
    return resolveEquipmentTotals(createEquipment([{
      id: "sword",
      name: "Espada",
      cost: 100,
      weightKg: 2,
      weapons: [{ type: "melee_weapon" }],
      modifiers: list.rows,
    }])).totals.cost;
  }

  assert.equal(totalCost(original), 400);
  assert.equal(totalCost(reordered), 400);
  assert.equal(totalCost(disabled), 100);
});
