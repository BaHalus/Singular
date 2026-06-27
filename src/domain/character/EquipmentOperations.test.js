import test from "node:test";
import assert from "node:assert/strict";

import { createEquipment } from "./Equipment.js";

import {
  addEquipment,
  removeEquipment,
  renameEquipment,
  updateEquipment,
  reorderEquipment,
  findEquipmentItemIndex,
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
    cost: 0,
    weightKg: 0,
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

test("updates allowed portable equipment fields without mutating original", () => {
  const equipment = createEquipment([
    item("eq-001", "Velho"),
  ]);

  const updated = updateEquipment(equipment, "eq-001", {
    name: "Kit de escalada",
    quantity: 2,
    reference: "B288",
    notes: "Atualizado manualmente",
  });

  assert.equal(equipment[0].name, "Velho");
  assert.equal(updated[0].name, "Kit de escalada");
  assert.equal(updated[0].quantity, 2);
  assert.equal(updated[0].reference, "B288");
  assert.equal(updated[0].notes, "Atualizado manualmente");
});

test("does not allow structural identity changes through equipment patch", () => {
  const equipment = createEquipment([
    item("eq-001", "Espada"),
  ]);

  assert.throws(() => {
    updateEquipment(equipment, "eq-001", { id: "eq-002" });
  }, /unsupported fields/);
});

test("reorders root and nested equipment within the same collection", () => {
  const equipment = createEquipment([
    item("eq-root-a", "A"),
    item("eq-root-b", "B"),
    {
      ...container("eq-bag", "Mochila"),
      children: [
        item("eq-child-a", "CA"),
        item("eq-child-b", "CB"),
      ],
    },
  ]);

  const rootReordered = reorderEquipment(equipment, "eq-root-b", 0);
  const childReordered = reorderEquipment(equipment, "eq-child-b", 0);

  assert.deepEqual(rootReordered.map(entry => entry.id), [
    "eq-root-b",
    "eq-root-a",
    "eq-bag",
  ]);
  assert.deepEqual(childReordered[2].children.map(entry => entry.id), [
    "eq-child-b",
    "eq-child-a",
  ]);
  assert.deepEqual(equipment.map(entry => entry.id), [
    "eq-root-a",
    "eq-root-b",
    "eq-bag",
  ]);
});

test("reorder no-op returns original collection", () => {
  const equipment = createEquipment([
    item("eq-root-a", "A"),
    item("eq-root-b", "B"),
  ]);

  assert.equal(reorderEquipment(equipment, "eq-root-a", 0), equipment);
});

test("finds equipment item index in its own collection", () => {
  const equipment = createEquipment([
    item("eq-root-a", "A"),
    {
      ...container("eq-bag", "Mochila"),
      children: [item("eq-child-a", "CA")],
    },
  ]);

  assert.equal(findEquipmentItemIndex(equipment, "eq-root-a"), 0);
  assert.equal(findEquipmentItemIndex(equipment, "eq-child-a"), 0);
  assert.equal(findEquipmentItemIndex(equipment, "missing"), -1);
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

test("moving equipment to its current container is a real no-op", () => {
  const equipment = createEquipment([
    {
      ...container("eq-bag", "Mochila"),
      children: [
        item("eq-rope", "Corda"),
        item("eq-bandage", "Bandagens"),
      ],
    },
  ]);

  const updated = moveEquipment(equipment, "eq-bandage", "eq-bag");

  assert.equal(updated, equipment);
  assert.deepEqual(equipment[0].children.map(entry => entry.id), [
    "eq-rope",
    "eq-bandage",
  ]);
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
