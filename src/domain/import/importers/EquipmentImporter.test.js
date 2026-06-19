import test from "node:test";
import assert from "node:assert/strict";

import { importEquipment } from "./EquipmentImporter.js";

test("imports GCS equipment item with metric normalization", () => {
  const source = {
    type: "equipment_list",
    rows: [
      {
        type: "equipment",
        id: "eq-001",
        quantity: 1,
        description: "Kit de Campo",
        tech_level: "8",
        legality_class: "4",
        value: "900",
        weight: "7.3 lb",
        reference: "B288",
        calc: {
          extended_value: "900",
          extended_weight: "7.3 lb",
        },
        categories: ["Equipamento de Viagem"],
      },
    ],
  };

  const result = importEquipment(source);
  const item = result.equipment[0];

  assert.equal(result.equipment.length, 1);
  assert.equal(item.id, "eq-001");
  assert.equal(item.externalIds.gcs, "eq-001");
  assert.equal(item.kind, "item");
  assert.equal(item.containerKind, null);
  assert.equal(item.name, "Kit de Campo");
  assert.equal(item.techLevel, "8");
  assert.equal(item.legalityClass, "4");
  assert.equal(item.cost, 900);
  assert.equal(item.weightKg, 3.65);
  assert.equal(item.state, "carried");
  assert.deepEqual(item.calc, source.rows[0].calc);
  assert.ok(item.tags.includes("import:gcs"));
  assert.ok(item.tags.includes("node:item"));
  assert.equal(item.raw, source.rows[0]);
});

test("recognizes physical equipment container", () => {
  const result = importEquipment({
    rows: [
      {
        type: "equipment_container",
        id: "bag-001",
        description: "Mochila",
        value: "100",
        weight: "10 lb",
        prereqs: {
          type: "prereq_list",
          all: true,
          prereqs: [
            {
              type: "contained_weight_prereq",
              has: true,
              qualifier: {
                compare: "at_most",
                qualifier: "100 lb",
              },
            },
          ],
        },
        children: [
          {
            type: "equipment",
            id: "bandage-001",
            description: "Bandagens",
            value: "10",
            weight: "2 lb",
          },
        ],
      },
    ],
  });

  const container = result.equipment[0];

  assert.equal(container.kind, "container");
  assert.equal(container.containerKind, "physical");
  assert.equal(container.weightKg, 5);
  assert.equal(container.state, "carried");
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].name, "Bandagens");
  assert.equal(container.children[0].weightKg, 1);
  assert.deepEqual(container.children[0].importMeta.containerIds, ["bag-001"]);
});

test("recognizes semantic group container", () => {
  const result = importEquipment({
    rows: [
      {
        type: "equipment_container",
        id: "group-001",
        description: "Unguentos",
        value: "0",
        weight: "0 lb",
        children: [
          {
            type: "equipment",
            id: "ointment-001",
            description: "Unguento Medicinal",
            value: "825",
            weight: "0.2 lb",
          },
        ],
      },
    ],
  });

  const group = result.equipment[0];

  assert.equal(group.containerKind, "group");
  assert.equal(group.state, "ignored");
  assert.equal(group.children[0].state, "carried");
  assert.ok(group.tags.includes("container:group"));
});

test("maps carried, equipped and stored sections", () => {
  const result = importEquipment({
    equipment: [
      {
        type: "equipment",
        id: "eq-equipped",
        description: "Capa Protetora",
        value: "500",
        weight: "20 lb",
        equipped: true,
      },
      {
        type: "equipment",
        id: "eq-carried",
        description: "Corda",
        value: "10",
        weight: "5 lb",
      },
    ],
    other_equipment: [
      {
        type: "equipment",
        id: "eq-stored",
        description: "Baú",
        value: "100",
        weight: "50 lb",
      },
    ],
  });

  assert.equal(result.equipment[0].state, "equipped");
  assert.equal(result.equipment[1].state, "carried");
  assert.equal(result.equipment[2].state, "stored");
  assert.ok(result.equipment[2].tags.includes("section:otherEquipment"));
});

test("preserves consumable and feature data", () => {
  const raw = {
    type: "equipment",
    id: "eq-001",
    description: "Botas Reforçadas",
    value: "150",
    weight: "3 lb",
    uses: 6,
    max_uses: 10,
    features: [{ type: "dr_bonus", amount: 2, location: "foot" }],
    modifiers: [{ type: "equipment_modifier", name: "Reforçado" }],
    prereqs: { type: "prereq_list", all: true, prereqs: [] },
  };

  const result = importEquipment([raw]);
  const item = result.equipment[0];

  assert.equal(item.uses, 6);
  assert.equal(item.maxUses, 10);
  assert.equal(item.features.length, 1);
  assert.equal(item.modifiers.length, 1);
  assert.deepEqual(item.prereqs, raw.prereqs);
  assert.equal(item.raw, raw);
});

test("preserves unknown equipment nodes separately", () => {
  const result = importEquipment({
    rows: [
      {
        type: "unknown_equipment_node",
        id: "unknown-001",
      },
    ],
  });

  assert.deepEqual(result.equipment, []);
  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.unknownNodes[0].id, "unknown-001");
});

test("rejects invalid equipment source", () => {
  assert.throws(() => {
    importEquipment("equipment");
  });
});

test("rejects invalid equipment node", () => {
  assert.throws(() => {
    importEquipment(["equipment"]);
  });
});

test("rejects invalid weight", () => {
  assert.throws(() => {
    importEquipment([
      {
        type: "equipment",
        description: "Objeto",
        weight: "pesado",
      },
    ]);
  });
});
