import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateBasicLiftKg,
  calculateEquipmentWeights,
  calculateEncumbrance,
  calculateEquipmentLoad,
} from "./EquipmentLoadCalculator.js";

function item(id, weightKg, state = "carried", quantity = 1) {
  return {
    id,
    kind: "item",
    containerKind: null,
    quantity,
    weightKg,
    state,
    children: [],
  };
}

function container(id, weightKg, state = "carried", children = []) {
  return {
    id,
    kind: "container",
    containerKind: "physical",
    quantity: 1,
    weightKg,
    state,
    children,
  };
}

function group(id, children = []) {
  return {
    id,
    kind: "container",
    containerKind: "group",
    quantity: 1,
    weightKg: 0,
    state: "ignored",
    children,
  };
}

test("calculates basic lift in kilograms with metric rounding", () => {
  assert.deepEqual(calculateBasicLiftKg({ ST: 7 }), {
    effectiveLiftingST: 7,
    rawBasicLiftKg: 4.9,
    basicLiftKg: 4.9,
  });

  assert.equal(calculateBasicLiftKg({ ST: 8 }).basicLiftKg, 6);
  assert.equal(calculateBasicLiftKg({ ST: 10 }).basicLiftKg, 10);
  assert.equal(calculateBasicLiftKg({ ST: 11 }).basicLiftKg, 12);
  assert.equal(calculateBasicLiftKg({ ST: 12 }).basicLiftKg, 14);
  assert.equal(calculateBasicLiftKg({ ST: 13 }).basicLiftKg, 17);
  assert.equal(calculateBasicLiftKg({ ST: 14 }).basicLiftKg, 20);
  assert.equal(calculateBasicLiftKg({ ST: 15 }).basicLiftKg, 23);
});

test("uses lifting ST bonus for basic lift", () => {
  const result = calculateBasicLiftKg({ ST: 10, liftingSTBonus: 2 });

  assert.equal(result.effectiveLiftingST, 12);
  assert.equal(result.basicLiftKg, 14);
});

test("calculates weights by equipment state", () => {
  const result = calculateEquipmentWeights([
    item("sword", 1.5, "equipped"),
    item("rope", 5, "carried"),
    item("chest", 10, "stored"),
    item("rock", 2, "dropped"),
    item("library-group", 0, "ignored"),
  ]);

  assert.equal(result.equippedWeightKg, 1.5);
  assert.equal(result.carriedWeightKg, 5);
  assert.equal(result.storedWeightKg, 10);
  assert.equal(result.droppedWeightKg, 2);
  assert.equal(result.ignoredWeightKg, 0);
  assert.equal(result.loadWeightKg, 6.5);
});

test("counts physical container contents when container is carried", () => {
  const result = calculateEquipmentWeights([
    container("backpack", 1, "carried", [
      item("rope", 5, "stored"),
      item("food", 3, "ignored"),
      item("water", 2, "dropped"),
    ]),
  ]);

  assert.equal(result.carriedWeightKg, 11);
  assert.equal(result.loadWeightKg, 11);
});

test("counts physical container contents when container is equipped", () => {
  const result = calculateEquipmentWeights([
    container("backpack", 1, "equipped", [
      item("rope", 5, "stored"),
    ]),
  ]);

  assert.equal(result.equippedWeightKg, 6);
  assert.equal(result.loadWeightKg, 6);
});

test("does not count physical container contents when container is stored", () => {
  const result = calculateEquipmentWeights([
    container("backpack", 1, "stored", [
      item("rope", 5, "stored"),
    ]),
  ]);

  assert.equal(result.storedWeightKg, 6);
  assert.equal(result.loadWeightKg, 0);
});

test("group containers do not propagate load state", () => {
  const result = calculateEquipmentWeights([
    group("unguentos", [
      item("ointment", 1, "carried"),
    ]),
  ]);

  assert.equal(result.carriedWeightKg, 1);
  assert.equal(result.loadWeightKg, 1);
});

test("applies quantity to own weight", () => {
  const result = calculateEquipmentWeights([
    item("arrows", 0.05, "carried", 20),
  ]);

  assert.equal(result.carriedWeightKg, 1);
  assert.equal(result.loadWeightKg, 1);
});

test("calculates encumbrance thresholds and level", () => {
  assert.equal(calculateEncumbrance(10, 10).encumbranceName, "none");
  assert.equal(calculateEncumbrance(20, 10).encumbranceName, "light");
  assert.equal(calculateEncumbrance(30, 10).encumbranceName, "medium");
  assert.equal(calculateEncumbrance(60, 10).encumbranceName, "heavy");
  assert.equal(calculateEncumbrance(100, 10).encumbranceName, "extra-heavy");
  assert.equal(calculateEncumbrance(101, 10).encumbranceName, "overloaded");
});

test("calculates full equipment load", () => {
  const result = calculateEquipmentLoad({
    ST: 10,
    liftingSTBonus: 2,
    equipment: [
      container("backpack", 1, "carried", [
        item("rope", 5, "stored"),
        item("food", 3, "ignored"),
      ]),
    ],
  });

  assert.equal(result.effectiveLiftingST, 12);
  assert.equal(result.basicLiftKg, 14);
  assert.equal(result.loadWeightKg, 9);
  assert.equal(result.encumbranceName, "none");
});

test("rejects invalid ST", () => {
  assert.throws(() => {
    calculateBasicLiftKg({ ST: "10" });
  });
});

test("rejects invalid equipment", () => {
  assert.throws(() => {
    calculateEquipmentWeights("equipment");
  });
});

test("rejects invalid equipment state", () => {
  assert.throws(() => {
    calculateEquipmentWeights([
      item("sword", 1.5, "lost"),
    ]);
  });
});

test("rejects invalid weightKg", () => {
  assert.throws(() => {
    calculateEquipmentWeights([
      item("sword", "1.5", "carried"),
    ]);
  });
});
