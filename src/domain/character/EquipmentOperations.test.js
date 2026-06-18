import test from "node:test";
import assert from "node:assert/strict";

import { createEquipment } from "./Equipment.js";

import {
  addEquipment,
  removeEquipment,
  renameEquipment,
  setEquipmentQuantity,
  setEquipmentState,
  equipEquipment,
  carryEquipment,
  storeEquipment,
  dropEquipment,
  ignoreEquipment,
  addChildEquipment,
  removeChildEquipment,
  moveEquipment,
  findEquipmentItem,
} from "./EquipmentOperations.js";

function item(id, name) {
  return {
    id,
    externalIds: {},
    kind: "item",
    containerKind: null,
    name,
    quantity: 1,
    techLevel: null,
    legalityClass: null,
    reference: null,
    value: "0",
    weight: "0 lb",
    state: "carried",
    categories: [],
    notes: "",
    tags: [],
    weapons: [],
    features: [],
    modifiers: [],
    prereqs: null,
    calc: null,
    children: [],
    raw: null,
  };
}

function container(id, name) {
  return {
    ...item(id, name),
    kind: "container",
    containerKind: "physical",
  };
}

test("adds equipment without mutating original", () => {
  const equipment = createEquipment();

  const updated = addEquipment(equipment, item("eq-001", "Espada"));

  assert.equal(equipment.length, 0);
  assert.equal(updated.length, 1);
});

test("removes root equipment without mutating original", () => {
  const equipment = createEquipment([
    item("eq-001", "Espada"),
  ]);

  const updated = removeEquipment(equipment, "eq-001");

  assert.equal(equipment.length, 1);
  assert.equal(updated.length, 0);
});

test("removes nested equipment", () => {
  const equipment = createEquipment([
    {
      ...container("eq-bag", "Mochila"),
      children: [item("eq-bandage", "Bandagens")],
    },
  ]);

  const updated = removeEquipment(equipment, "eq-bandage");

  assert.equal(equipment[0].children.length, 1);
  assert.equal(updated[0].children.length, 0);
});

test("renames equipment without mutating original", () => {
  const equipment = createEquipment([
    item("eq-001", "Velho"),
  ]);

  const updated = renameEquipment(equipment, "eq-001", "Espada");

  assert.equal(equipment[0].name, "Velho");
  assert.equal(updated[0].name, "Espada");
});

test("sets equipment quantity without mutating original", () => {
  const equipment = createEquipment([
    item("eq-001", "Flecha"),
  ]);

  const updated = setEquipmentQuantity(equipment, "eq-001", 12);

  assert.equal(equipment[0].quantity, 1);
  assert.equal(updated[0].quantity, 12);
});

test("throws on invalid quantity", () => {
  const equipment = createEquipment();

  assert.throws(() => {
    setEquipmentQuantity(equipment, "eq-001", -1);
  });
});

test("sets equipment state", () => {
  const equipment = createEquipment([
    item("eq-001", "Espada"),
  ]);

  const updated = setEquipmentState(equipment, "eq-001", "equipped");

  assert.equal(updated[0].state, "equipped");
});

test("state helper operations set expected states", () => {
  const equipment = createEquipment([
    item("eq-001", "Espada"),
  ]);

  assert.equal(equipEquipment(equipment, "eq-001")[0].state, "equipped");
  assert.equal(carryEquipment(equipment, "eq-001")[0].state, "carried");
  assert.equal(storeEquipment(equipment, "eq-001")[0].state, "stored");
  assert.equal(dropEquipment(equipment, "eq-001")[0].state, "dropped");
  assert.equal(ignoreEquipment(equipment, "eq-001")[0].state, "ignored");
});

test("adds child equipment to container without mutating original", () => {
  const equipment = createEquipment([
    container("eq-bag", "Mochila"),
  ]);

  const updated = addChildEquipment(
    equipment,
    "eq-bag",
    item("eq-bandage", "Bandagens")
  );

  assert.equal(equipment[0].children.length, 0);
  assert.equal(updated[0].children.length, 1);
  assert.equal(updated[0].children[0].name, "Bandagens");
});

test("throws when adding child to non-container", () => {
  const equipment = createEquipment([
    item("eq-001", "Espada"),
  ]);

  assert.throws(() => {
    addChildEquipment(equipment, "eq-001", item("eq-002", "Bandagens"));
  });
});

test("removes child equipment", () => {
  const equipment = createEquipment([
    {
      ...container("eq-bag", "Mochila"),
      children: [item("eq-bandage", "Bandagens")],
    },
  ]);

  const updated = removeChildEquipment(equipment, "eq-bandage");

  assert.equal(updated[0].children.length, 0);
});

test("moves root equipment into container", () => {
  const equipment = createEquipment([
    container("eq-bag", "Mochila"),
    item("eq-bandage", "Bandagens"),
  ]);

  const updated = moveEquipment(equipment, "eq-bandage", "eq-bag");

  assert.equal(updated.length, 1);
  assert.equal(updated[0].children.length, 1);
  assert.equal(updated[0].children[0].id, "eq-bandage");
});

test("moves nested equipment to root", () => {
  const equipment = createEquipment([
    {
      ...container("eq-bag", "Mochila"),
      children: [item("eq-bandage", "Bandagens")],
    },
  ]);

  const updated = moveEquipment(equipment, "eq-bandage", null);

  assert.equal(updated.length, 2);
  assert.equal(updated[0].children.length, 0);
  assert.equal(updated[1].id, "eq-bandage");
});

test("throws when moving unknown equipment", () => {
  const equipment = createEquipment();

  assert.throws(() => {
    moveEquipment(equipment, "missing", null);
  });
});

test("finds nested equipment", () => {
  const equipment = createEquipment([
    {
      ...container("eq-bag", "Mochila"),
      children: [item("eq-bandage", "Bandagens")],
    },
  ]);

  const found = findEquipmentItem(equipment, "eq-bandage");

  assert.equal(found.name, "Bandagens");
});

test("returns null when equipment is not found", () => {
  const equipment = createEquipment();

  assert.equal(findEquipmentItem(equipment, "missing"), null);
});
