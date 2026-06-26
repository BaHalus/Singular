import test from "node:test";
import assert from "node:assert/strict";

import {
  createEquipment,
  serializeEquipment,
  validateEquipment,
} from "./Equipment.js";
import {
  addChildEquipment,
  moveEquipment,
  setEquipmentQuantity,
  setEquipmentState,
} from "./EquipmentOperations.js";
import { calculateEquipmentTotals } from "./EquipmentTotals.js";

function sampleEquipment() {
  return createEquipment([
    {
      id: "eq-sword",
      name: "Sword",
      quantity: 1,
      weightKg: 1.5,
      cost: 500,
      state: "equipped",
    },
    {
      id: "eq-bag",
      kind: "container",
      containerKind: "physical",
      name: "Bag",
      quantity: 1,
      weightKg: 0.5,
      cost: 60,
      state: "carried",
      children: [
        {
          id: "eq-ration",
          name: "Ration",
          quantity: 3,
          weightKg: 0.1,
          cost: 0.2,
          state: "carried",
        },
      ],
    },
  ]);
}

test("serializes nested equipment as an independent portable snapshot", () => {
  const equipment = createEquipment([{
    id: "eq-bag",
    kind: "container",
    containerKind: "physical",
    name: "Bag",
    externalIds: { gcs: "gcs-bag" },
    features: [{ type: "bonus", amount: 1 }],
    raw: { type: "equipment_container" },
    children: [{ id: "eq-rope", name: "Rope" }],
  }]);

  const serialized = serializeEquipment(equipment);
  assert.deepEqual(serialized, equipment);
  serialized[0].externalIds.gcs = "changed";
  serialized[0].features[0].amount = 2;
  serialized[0].children[0].name = "Changed";

  assert.equal(equipment[0].externalIds.gcs, "gcs-bag");
  assert.equal(equipment[0].features[0].amount, 1);
  assert.equal(equipment[0].children[0].name, "Rope");
  assert.doesNotThrow(() => JSON.stringify(serialized));
});

test("rejects duplicate ids, cyclic input and non-portable metadata", () => {
  assert.throws(
    () => createEquipment([
      { id: "eq-duplicate", name: "One" },
      {
        id: "eq-container",
        kind: "container",
        children: [{ id: "eq-duplicate", name: "Two" }],
      },
    ]),
    /ids must be unique/,
  );

  const cyclic = { id: "eq-cycle", kind: "container", children: [] };
  cyclic.children.push(cyclic);
  assert.throws(() => createEquipment([cyclic]), /must not contain cycles/);

  assert.throws(
    () => createEquipment([{ id: "eq-invalid", raw: { value: undefined } }]),
    /must be JSON portable/,
  );
});

test("rejects non-finite numeric values", () => {
  assert.throws(
    () => createEquipment([{ id: "eq-infinite", cost: Infinity }]),
    /cost must be non-negative finite number/,
  );
  assert.throws(
    () => createEquipment([{ id: "eq-nan", quantity: Number.NaN }]),
    /quantity must be non-negative finite number/,
  );
  assert.throws(
    () => setEquipmentQuantity(sampleEquipment(), "eq-sword", Infinity),
    /quantity must be non-negative finite number/,
  );
});

test("calculates deterministic unit totals through nested containers", () => {
  const totals = calculateEquipmentTotals(sampleEquipment());

  assert.deepEqual(totals, {
    quantity: 5,
    weightKg: 2.3,
    cost: 560.6,
  });
  assert.equal(Object.isFrozen(totals), true);
});

test("preserves all four Alpha operational states", () => {
  let equipment = sampleEquipment();
  for (const state of ["equipped", "carried", "stored", "dropped"]) {
    equipment = setEquipmentState(equipment, "eq-sword", state);
    assert.equal(equipment[0].state, state);
  }
  assert.throws(
    () => setEquipmentState(equipment, "eq-sword", "lost"),
    /state is invalid/,
  );
});

test("validates container targets and rejects containment cycles", () => {
  const equipment = createEquipment([
    {
      id: "eq-outer",
      kind: "container",
      containerKind: "physical",
      name: "Outer",
      children: [{
        id: "eq-inner",
        kind: "container",
        containerKind: "physical",
        name: "Inner",
      }],
    },
    { id: "eq-rope", name: "Rope" },
  ]);

  assert.throws(
    () => addChildEquipment(equipment, "missing", { id: "eq-new", name: "New" }),
    /container not found/,
  );
  assert.throws(
    () => moveEquipment(equipment, "eq-outer", "eq-inner"),
    /must not create containment cycle/,
  );
  assert.equal(validateEquipment(equipment), true);
});
