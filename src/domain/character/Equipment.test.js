import test from "node:test";
import assert from "node:assert/strict";

import {
  createEquipment,
  createEquipmentItem,
  validateEquipment,
  serializeEquipment,
} from "./Equipment.js";

test("creates empty equipment list", () => {
  const equipment = createEquipment();

  assert.deepEqual(equipment, []);
});

test("creates equipment item with defaults", () => {
  const item = createEquipmentItem();

  assert.ok(item.id);
  assert.deepEqual(item.externalIds, {});
  assert.equal(item.kind, "item");
  assert.equal(item.containerKind, null);
  assert.equal(item.name, "");
  assert.equal(item.quantity, 1);
  assert.equal(item.value, "0");
  assert.equal(item.weight, "0 lb");
  assert.equal(item.state, "carried");
  assert.deepEqual(item.children, []);
});

test("creates equipment item from GCS-style input", () => {
  const item = createEquipmentItem({
    id: "eq-001",
    externalIds: { gcs: "gcs-eq-001" },
    type: "equipment",
    description: "Espada Larga",
    quantity: 1,
    tech_level: "2",
    legality_class: "3",
    value: "500",
    weight: "3 lb",
    reference: "B271",
    categories: ["Arma de Combate Corpo a Corpo"],
    weapons: [{ type: "melee_weapon" }],
  });

  assert.equal(item.id, "eq-001");
  assert.equal(item.externalIds.gcs, "gcs-eq-001");
  assert.equal(item.kind, "item");
  assert.equal(item.name, "Espada Larga");
  assert.equal(item.techLevel, "2");
  assert.equal(item.legalityClass, "3");
  assert.equal(item.reference, "B271");
  assert.deepEqual(item.categories, ["Arma de Combate Corpo a Corpo"]);
  assert.equal(item.weapons.length, 1);
});

test("creates physical container", () => {
  const item = createEquipmentItem({
    id: "eq-001",
    kind: "container",
    containerKind: "physical",
    name: "Mochila",
    value: "100",
    weight: "10 lb",
  });

  assert.equal(item.kind, "container");
  assert.equal(item.containerKind, "physical");
  assert.equal(item.state, "carried");
});

test("creates group container as ignored by default", () => {
  const item = createEquipmentItem({
    id: "eq-001",
    kind: "container",
    containerKind: "group",
    name: "Unguentos",
    value: "0",
    weight: "0 lb",
  });

  assert.equal(item.kind, "container");
  assert.equal(item.containerKind, "group");
  assert.equal(item.state, "ignored");
});

test("creates nested equipment", () => {
  const equipment = createEquipment([
    {
      id: "eq-container",
      kind: "container",
      containerKind: "physical",
      name: "Mochila",
      children: [
        {
          id: "eq-child",
          name: "Bandagens",
          weight: "2 lb",
        },
      ],
    },
  ]);

  assert.equal(equipment.length, 1);
  assert.equal(equipment[0].children.length, 1);
  assert.equal(equipment[0].children[0].name, "Bandagens");
});

test("validates valid equipment", () => {
  const equipment = createEquipment();

  assert.equal(validateEquipment(equipment), true);
});

test("serializes equipment", () => {
  const equipment = createEquipment([
    {
      id: "eq-001",
      externalIds: { gcs: "gcs-eq-001" },
      name: "Espada Larga",
      value: "500",
      weight: "3 lb",
      weapons: [{ type: "melee_weapon" }],
    },
  ]);

  const json = serializeEquipment(equipment);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "eq-001");
  assert.equal(json[0].externalIds.gcs, "gcs-eq-001");
  assert.equal(json[0].name, "Espada Larga");
  assert.equal(json[0].weapons.length, 1);
});

test("throws when equipment is not array", () => {
  assert.throws(() => {
    createEquipment("Espada Larga");
  });
});

test("throws when externalIds is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", externalIds: "gcs-eq-001" }]);
  });
});

test("throws when kind is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", kind: "weapon" }]);
  });
});

test("throws when item has containerKind", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", kind: "item", containerKind: "physical" }]);
  });
});

test("throws when quantity is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", quantity: -1 }]);
  });
});

test("throws when value is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", value: 500 }]);
  });
});

test("throws when weight is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", weight: 3 }]);
  });
});

test("throws when state is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", state: "lost" }]);
  });
});

test("throws when categories is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", categories: "weapon" }]);
  });
});

test("throws when weapons is invalid", () => {
  assert.throws(() => {
    createEquipment([{ id: "eq-001", weapons: "melee" }]);
  });
});
