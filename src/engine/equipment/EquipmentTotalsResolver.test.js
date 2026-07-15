import test from "node:test";
import assert from "node:assert/strict";

import { createEquipment } from "../../domain/character/Equipment.js";
import { createEquipmentModifierList } from "../../domain/character/EquipmentModifiers.js";
import {
  resolveEquipmentTotals,
  serializeEquipmentTotalsReport,
  validateEquipmentTotalsReport,
} from "./EquipmentTotalsResolver.js";

test("resolves empty equipment totals", () => {
  const report = resolveEquipmentTotals([]);

  assert.equal(report.status, "resolved");
  assert.equal(report.totals.itemCount, 0);
  assert.equal(report.totals.quantity, 0);
  assert.equal(report.totals.cost, 0);
  assert.equal(report.totals.weightKg, 0);
  assert.equal(report.totals.loadWeightKg, 0);
  assert.deepEqual(report.entries, []);
  assert.deepEqual(report.diagnostics, []);
});

test("totals quantity, unit cost and unit weight deterministically", () => {
  const equipment = createEquipment([
    {
      id: "eq-sword",
      name: "Espada Larga",
      quantity: 2,
      cost: 500,
      weightKg: 1.5,
      state: "carried",
    },
    {
      id: "eq-shield",
      name: "Escudo",
      quantity: 1,
      cost: 60,
      weightKg: 4,
      state: "equipped",
    },
  ]);

  const report = resolveEquipmentTotals(equipment);

  assert.equal(report.status, "resolved");
  assert.equal(report.totals.itemCount, 2);
  assert.equal(report.totals.quantity, 3);
  assert.equal(report.totals.cost, 1060);
  assert.equal(report.totals.weightKg, 7);
  assert.equal(report.totals.loadWeightKg, 7);
  assert.equal(report.totals.byState.carried.cost, 1000);
  assert.equal(report.totals.byState.equipped.weightKg, 4);
});

test("keeps dropped equipment in inventory totals but outside load", () => {
  const equipment = createEquipment([
    {
      id: "eq-pack",
      name: "Pacote largado",
      quantity: 1,
      cost: 40,
      weightKg: 8,
      state: "dropped",
    },
  ]);

  const report = resolveEquipmentTotals(equipment);

  assert.equal(report.totals.itemCount, 1);
  assert.equal(report.totals.cost, 40);
  assert.equal(report.totals.weightKg, 8);
  assert.equal(report.totals.loadWeightKg, 0);
  assert.equal(report.totals.byState.dropped.weightKg, 8);
});

test("excludes ignored group containers from counted totals while counting children", () => {
  const equipment = createEquipment([
    {
      id: "eq-group",
      kind: "container",
      containerKind: "group",
      name: "Grupo visual",
      children: [
        {
          id: "eq-bandage",
          name: "Bandagem",
          quantity: 3,
          cost: 2,
          weightKg: 0.1,
          state: "stored",
        },
      ],
    },
  ]);

  const report = resolveEquipmentTotals(equipment);

  assert.equal(report.totals.itemCount, 1);
  assert.equal(report.totals.quantity, 3);
  assert.equal(report.totals.cost, 6);
  assert.equal(report.totals.weightKg, 0.3);
  assert.equal(report.totals.loadWeightKg, 0.3);
  assert.equal(report.entries[0].selfTotals.itemCount, 0);
  assert.equal(report.entries[0].totals.itemCount, 1);
});

test("preserves nested entry reports", () => {
  const equipment = createEquipment([
    {
      id: "eq-bag",
      kind: "container",
      containerKind: "physical",
      name: "Mochila",
      cost: 100,
      weightKg: 1,
      children: [
        {
          id: "eq-ration",
          name: "Ração",
          quantity: 5,
          cost: 3,
          weightKg: 0.5,
        },
      ],
    },
  ]);

  const report = resolveEquipmentTotals(equipment);

  assert.equal(report.entries[0].id, "eq-bag");
  assert.equal(report.entries[0].selfTotals.weightKg, 1);
  assert.equal(report.entries[0].children[0].id, "eq-ration");
  assert.equal(report.entries[0].children[0].selfTotals.weightKg, 2.5);
  assert.equal(report.entries[0].totals.weightKg, 3.5);
});

test("returns blocked diagnostics without throwing for structurally invalid totals input", () => {
  const report = resolveEquipmentTotals([
    {
      id: "eq-bad",
      name: "Item ruim",
      quantity: Number.NaN,
      cost: 10,
      weightKg: 1,
      state: "carried",
      children: [],
    },
  ]);

  assert.equal(report.status, "blocked");
  assert.equal(report.entries[0].status, "blocked");
  assert.equal(report.entries[0].selfTotals.weightKg, 0);
  assert.equal(report.diagnostics[0].code, "equipment.quantity.invalid");
});

test("detects duplicate ids in report diagnostics", () => {
  const report = resolveEquipmentTotals([
    {
      id: "eq-dup",
      name: "Primeiro",
      quantity: 1,
      cost: 0,
      weightKg: 0,
      state: "carried",
      children: [],
    },
    {
      id: "eq-dup",
      name: "Segundo",
      quantity: 1,
      cost: 0,
      weightKg: 0,
      state: "carried",
      children: [],
    },
  ]);

  assert.equal(report.status, "blocked");
  assert.equal(report.entries[0].status, "resolved");
  assert.equal(report.entries[1].status, "blocked");
  assert.equal(report.diagnostics[0].code, "equipment.item.duplicateId");
});

test("validates, serializes and freezes reports", () => {
  const report = resolveEquipmentTotals(createEquipment([
    { id: "eq-coin", name: "Moeda", quantity: 10, cost: 1, weightKg: 0 },
  ]));

  assert.equal(validateEquipmentTotalsReport(report), true);
  assert.deepEqual(serializeEquipmentTotalsReport(report), report);
  assert.throws(() => {
    report.totals.cost = 999;
  }, TypeError);
});


function createModifierRows(rows) {
  return createEquipmentModifierList({
    type: "eqp_modifier_list",
    id: "equipment-modifiers-e1-2",
    version: 2,
    rows,
  }).rows;
}

test("applies ordered cost and weight adjustments in separate pipelines", () => {
  const modifiers = createModifierRows([
    {
      type: "eqp_modifier_container",
      id: "quality",
      name: "Qualidade",
      children: [
        {
          type: "eqp_modifier",
          id: "cost-x2",
          name: "Custo x2",
          cost_type: "to_base_cost",
          cost: "x2",
        },
        {
          type: "eqp_modifier",
          id: "weight-plus-5",
          name: "Peso +5",
          weight_type: "to_base_weight",
          weight: "5",
        },
        {
          type: "eqp_modifier",
          id: "cost-plus-10",
          name: "Custo +10",
          cost_type: "to_base_cost",
          cost: "10",
        },
      ],
    },
  ]);
  const report = resolveEquipmentTotals(createEquipment([
    {
      id: "eq-ordered",
      name: "Equipamento ajustado",
      quantity: 2,
      cost: 100,
      weightKg: 10,
      modifiers,
    },
  ]));

  const entry = report.entries[0];
  assert.equal(report.status, "resolved");
  assert.equal(entry.selfTotals.cost, 420);
  assert.equal(entry.selfTotals.weightKg, 30);
  assert.equal(entry.adjustmentBreakdown.cost.baseTotal, 200);
  assert.equal(entry.adjustmentBreakdown.cost.finalTotal, 420);
  assert.deepEqual(
    entry.adjustmentBreakdown.cost.steps.map(step => [step.modifierId, step.before, step.after]),
    [["cost-x2", 100, 200], ["cost-plus-10", 200, 210]],
  );
  assert.equal(entry.adjustmentBreakdown.weight.baseTotal, 20);
  assert.equal(entry.adjustmentBreakdown.weight.finalTotal, 30);
});

test("uses the item-owned canonical modifier list as the totals source", () => {
  const modifierList = createEquipmentModifierList({
    id: "eq-linked:modifiers",
    rows: [{
      type: "eqp_modifier",
      id: "linked-cost-x2",
      name: "Custo x2",
      cost_type: "to_base_cost",
      cost: "x2",
    }],
  });
  const conflictingCompatibilityRows = createModifierRows([{
    type: "eqp_modifier",
    id: "compatibility-cost-x10",
    name: "Custo x10",
    cost_type: "to_base_cost",
    cost: "x10",
  }]);

  const report = resolveEquipmentTotals([{
    id: "eq-linked",
    name: "Item vinculado",
    quantity: 1,
    cost: 100,
    weightKg: 1,
    state: "carried",
    modifierList,
    modifiers: conflictingCompatibilityRows,
    children: [],
  }]);

  assert.equal(report.status, "resolved");
  assert.equal(report.totals.cost, 200);
  assert.deepEqual(
    report.entries[0].adjustmentBreakdown.cost.steps.map(step => step.modifierId),
    ["linked-cost-x2"],
  );
});

test("ignores disabled containers and non-applicable weapon modifiers", () => {
  const modifiers = createModifierRows([
    {
      type: "eqp_modifier_container",
      id: "disabled-container",
      name: "Desabilitado",
      disabled: true,
      children: [
        {
          type: "eqp_modifier",
          id: "disabled-cost",
          name: "Custo x10",
          cost_type: "to_base_cost",
          cost: "x10",
        },
      ],
    },
    {
      type: "eqp_modifier",
      id: "weapon-only",
      name: "Somente arma",
      cost_type: "to_base_cost",
      cost: "x3",
      applicability: { selectionType: "this_weapon", notes: null },
    },
  ]);
  const report = resolveEquipmentTotals(createEquipment([
    {
      id: "eq-non-weapon",
      name: "Item comum",
      cost: 100,
      weightKg: 1,
      modifiers,
    },
  ]));

  const steps = report.entries[0].adjustmentBreakdown.cost.steps;
  assert.equal(report.totals.cost, 100);
  assert.deepEqual(
    steps.map(step => [step.modifierId, step.applied, step.reason]),
    [
      ["disabled-cost", false, "disabled"],
      ["weapon-only", false, "notApplicable"],
    ],
  );
});

test("applies equipment percentages without the trait minus eighty percent floor", () => {
  const modifiers = createModifierRows([
    {
      type: "eqp_modifier",
      id: "free-equipment",
      name: "Sem custo",
      cost_type: "to_base_cost",
      cost: "-100%",
    },
  ]);
  const report = resolveEquipmentTotals(createEquipment([
    {
      id: "eq-free",
      name: "Equipamento gratuito",
      cost: 100,
      weightKg: 1,
      modifiers,
    },
  ]));

  assert.equal(report.totals.cost, 0);
  assert.equal(report.entries[0].adjustmentBreakdown.cost.finalUnitValue, 0);
  assert.equal(report.entries[0].adjustmentBreakdown.cost.steps[0].applied, true);
});

test("normalizes imported raw equipment modifiers before resolving totals", () => {
  const report = resolveEquipmentTotals(createEquipment([
    {
      id: "eq-imported-sword",
      name: "Espada importada",
      quantity: 1,
      cost: 100,
      weightKg: 2,
      weapons: [{ type: "melee_weapon" }],
      modifiers: [
        {
          type: "eqp_modifier_container",
          id: "quality-container",
          name: "Qualidade",
          children: [
            {
              type: "eqp_modifier",
              id: "fine",
              name: "Superior",
              cost_type: "to_base_cost",
              cost: "x4",
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
      ],
    },
  ]));

  assert.equal(report.status, "resolved");
  assert.deepEqual(report.diagnostics, []);
  assert.equal(report.totals.cost, 400);
  assert.equal(report.totals.weightKg, 1);
  assert.deepEqual(
    report.entries[0].adjustmentBreakdown.cost.steps.map(step => [
      step.modifierId,
      step.applied,
      step.before,
      step.after,
    ]),
    [["fine", true, 100, 400]],
  );
  assert.deepEqual(
    report.entries[0].adjustmentBreakdown.weight.steps.map(step => [
      step.modifierId,
      step.applied,
      step.before,
      step.after,
    ]),
    [["light", true, 2, 1]],
  );
});

test("applies declared this-weapon bonuses and records their modifier origin", () => {
  const report = resolveEquipmentTotals(createEquipment([{
    id: "eq-fine-sword",
    name: "Espada superior",
    quantity: 1,
    cost: 500,
    weightKg: 1.5,
    weapons: [
      { type: "melee_weapon", usage: "Balanço" },
      { type: "melee_weapon", usage: "Estocada" },
    ],
    modifierList: {
      type: "eqp_modifier_list",
      id: "eq-fine-sword:modifiers",
      rows: [{
        type: "eqp_modifier",
        id: "fine-quality",
        name: "Qualidade superior",
        features: [{
          type: "weapon_bonus",
          amount: 1,
          selection_type: "this_weapon",
        }, {
          type: "future_feature",
          amount: 99,
          selection_type: "this_weapon",
        }],
      }, {
        type: "eqp_modifier",
        id: "poor-balance",
        name: "Equilíbrio ruim",
        features: [{
          type: "weapon_bonus",
          amount: -2,
          selection_type: "this_weapon",
        }],
      }],
    },
  }]));

  const features = report.entries[0].adjustmentBreakdown.features;
  assert.deepEqual(features.weaponBonuses, [
    { weaponIndex: 0, modifierBonus: -1 },
    { weaponIndex: 1, modifierBonus: -1 },
  ]);
  assert.deepEqual(
    features.steps.map(step => ({
      modifierId: step.modifierId,
      type: step.type,
      applied: step.applied,
      reason: step.reason,
      before: step.before,
      after: step.after,
    })),
    [{
      modifierId: "fine-quality",
      type: "weapon_bonus",
      applied: true,
      reason: null,
      before: [0, 0],
      after: [1, 1],
    }, {
      modifierId: "fine-quality",
      type: "future_feature",
      applied: false,
      reason: "unsupported",
      before: [1, 1],
      after: [1, 1],
    }, {
      modifierId: "poor-balance",
      type: "weapon_bonus",
      applied: true,
      reason: null,
      before: [1, 1],
      after: [-1, -1],
    }],
  );
  assert.equal(report.totals.cost, 500);
  assert.equal(report.totals.weightKg, 1.5);
});

test("keeps disabled and non-applicable weapon features auditable", () => {
  const report = resolveEquipmentTotals(createEquipment([{
    id: "eq-tool",
    name: "Ferramenta",
    quantity: 1,
    cost: 20,
    weightKg: 1,
    modifierList: {
      type: "eqp_modifier_list",
      id: "eq-tool:modifiers",
      rows: [{
        type: "eqp_modifier_container",
        id: "disabled-features",
        name: "Desabilitado",
        disabled: true,
        children: [{
          type: "eqp_modifier",
          id: "disabled-bonus",
          name: "Bônus desabilitado",
          features: [{
            type: "weapon_bonus",
            amount: 2,
            selection_type: "this_weapon",
          }],
        }],
      }, {
        type: "eqp_modifier",
        id: "non-applicable-bonus",
        name: "Bônus sem arma",
        features: [{
          type: "weapon_bonus",
          amount: 1,
          selection_type: "this_weapon",
        }],
      }],
    },
  }]));

  const features = report.entries[0].adjustmentBreakdown.features;
  assert.deepEqual(features.weaponBonuses, []);
  assert.deepEqual(
    features.steps.map(step => [step.modifierId, step.applied, step.reason]),
    [
      ["disabled-bonus", false, "disabled"],
      ["non-applicable-bonus", false, "notApplicable"],
    ],
  );
  assert.equal(report.status, "resolved");
  assert.equal(report.totals.cost, 20);
});

test("keeps predicated weapon bonuses unsupported instead of applying them to every usage", () => {
  const report = resolveEquipmentTotals(createEquipment([{
    id: "eq-predicated-sword",
    name: "Espada versátil",
    quantity: 1,
    cost: 500,
    weightKg: 1.5,
    weapons: [
      { type: "melee_weapon", usage: "Balanço" },
      { type: "melee_weapon", usage: "Estocada" },
    ],
    modifierList: {
      type: "eqp_modifier_list",
      id: "eq-predicated-sword:modifiers",
      rows: [{
        type: "eqp_modifier",
        id: "balanced-swing",
        name: "Balanceada para balanço",
        features: [{
          type: "weapon_bonus",
          amount: 2,
          selection_type: "this_weapon",
          name: "Balanço",
        }],
      }],
    },
  }]));

  const features = report.entries[0].adjustmentBreakdown.features;
  assert.deepEqual(features.weaponBonuses, [
    { weaponIndex: 0, modifierBonus: 0 },
    { weaponIndex: 1, modifierBonus: 0 },
  ]);
  assert.deepEqual(
    features.steps.map(step => [step.modifierId, step.applied, step.reason]),
    [["balanced-swing", false, "unsupportedPredicate"]],
  );
  assert.equal(report.totals.cost, 500);
  assert.equal(report.totals.weightKg, 1.5);
});

test("does not corrupt totals for malformed supported feature amounts", () => {
  const report = resolveEquipmentTotals(createEquipment([{
    id: "eq-invalid-bonus",
    name: "Arma com bônus inválido",
    quantity: 2,
    cost: 100,
    weightKg: 3,
    weapons: [{ type: "melee_weapon" }],
    modifierList: {
      type: "eqp_modifier_list",
      id: "eq-invalid-bonus:modifiers",
      rows: [{
        type: "eqp_modifier",
        id: "invalid-bonus",
        name: "Bônus inválido",
        features: [{
          type: "weapon_bonus",
          amount: "one",
          selection_type: "this_weapon",
        }],
      }],
    },
  }]));

  const features = report.entries[0].adjustmentBreakdown.features;
  assert.deepEqual(features.weaponBonuses, [
    { weaponIndex: 0, modifierBonus: 0 },
  ]);
  assert.deepEqual(
    features.steps.map(step => [step.modifierId, step.applied, step.reason]),
    [["invalid-bonus", false, "invalidAmount"]],
  );
  assert.equal(report.status, "resolved");
  assert.equal(report.totals.cost, 200);
  assert.equal(report.totals.weightKg, 6);
});
