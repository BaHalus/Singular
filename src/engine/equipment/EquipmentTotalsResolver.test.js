import test from "node:test";
import assert from "node:assert/strict";

import { createEquipment } from "../../domain/character/Equipment.js";
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
