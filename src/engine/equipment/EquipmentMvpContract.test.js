import test from "node:test";
import assert from "node:assert/strict";

import { createEquipment } from "../../domain/character/Equipment.js";
import { resolveEquipmentTotals } from "./EquipmentTotalsResolver.js";
import {
  createEquipmentMvpProjection,
  getEquipmentMvpContract,
  validateEquipmentMvpProjection,
} from "./EquipmentMvpContract.js";

test("exposes the minimum equipment MVP contract for application consumers", () => {
  const contract = getEquipmentMvpContract();

  assert.equal(contract.schemaVersion, 1);
  assert.deepEqual(contract.states.known, [
    "equipped",
    "carried",
    "stored",
    "dropped",
    "ignored",
  ]);
  assert.deepEqual(contract.states.counted, [
    "equipped",
    "carried",
    "stored",
    "dropped",
  ]);
  assert.deepEqual(contract.states.loadBearing, ["equipped", "carried", "stored"]);
  assert.ok(contract.entryFields.includes("children"));
  assert.ok(contract.entryFields.includes("diagnostics"));
  assert.ok(contract.totalFields.includes("loadWeightKg"));

  assert.throws(() => {
    contract.states.known.push("hidden");
  }, TypeError);
});

test("projects resolved equipment totals into a portable nested contract", () => {
  const equipment = createEquipment([
    {
      id: "eq-pack",
      kind: "container",
      containerKind: "physical",
      name: "Mochila",
      quantity: 1,
      cost: 100,
      weightKg: 1,
      state: "carried",
      children: [
        {
          id: "eq-ration",
          name: "Ração",
          quantity: 5,
          cost: 3,
          weightKg: 0.5,
          state: "stored",
        },
      ],
    },
    {
      id: "eq-spear",
      name: "Lança largada",
      quantity: 1,
      cost: 40,
      weightKg: 2,
      state: "dropped",
    },
  ]);

  const report = resolveEquipmentTotals(equipment);
  const projection = createEquipmentMvpProjection(report);

  assert.equal(validateEquipmentMvpProjection(projection), true);
  assert.equal(projection.status, "resolved");
  assert.equal(projection.totals.cost, 155);
  assert.equal(projection.totals.weightKg, 5.5);
  assert.equal(projection.totals.loadWeightKg, 3.5);
  assert.equal(projection.entries[0].id, "eq-pack");
  assert.equal(projection.entries[0].children[0].id, "eq-ration");
  assert.equal(projection.entries[1].state, "dropped");
  assert.equal(projection.entries[1].selfTotals.loadWeightKg, 0);
});

test("rejects a projection that advertises a divergent contract vocabulary", () => {
  const projection = createEquipmentMvpProjection(resolveEquipmentTotals([]));
  const forged = JSON.parse(JSON.stringify(projection));

  forged.contract.states.known = ["foo"];
  assert.throws(
    () => validateEquipmentMvpProjection(forged),
    /states\.known must match the canonical contract/,
  );

  const missingField = JSON.parse(JSON.stringify(projection));
  missingField.contract.entryFields = missingField.contract.entryFields.slice(1);
  assert.throws(
    () => validateEquipmentMvpProjection(missingField),
    /entryFields must match the canonical contract/,
  );
});

test("preserves blocking diagnostics for later application/UI rendering", () => {
  const report = resolveEquipmentTotals([
    {
      id: "eq-bad",
      name: "Peso inválido",
      quantity: 1,
      cost: 10,
      weightKg: Number.NaN,
      state: "carried",
      children: [],
    },
  ]);

  const projection = createEquipmentMvpProjection(report);

  assert.equal(projection.status, "blocked");
  assert.equal(projection.entries[0].status, "blocked");
  assert.equal(projection.diagnostics[0].code, "equipment.weight.invalid");
  assert.deepEqual(projection.diagnostics[0].path, ["0"]);
});
