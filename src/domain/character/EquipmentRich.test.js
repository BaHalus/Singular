import test from "node:test";
import assert from "node:assert/strict";

import {
  createEquipment,
  serializeEquipment,
} from "./Equipment.js";

test("preserves rich imported equipment fields", () => {
  const raw = { id: "eq-001", description: "Kit de Campo" };

  const equipment = createEquipment([
    {
      id: "eq-001",
      externalIds: { gcs: "gcs-eq-001" },
      name: "Kit de Campo",
      quantity: 1,
      cost: 100,
      weightKg: 2,
      state: "carried",
      uses: 4,
      maxUses: 10,
      categories: ["Viagem"],
      tags: ["import:gcs"],
      features: [{ type: "skill_bonus", amount: 1 }],
      modifiers: [{ type: "equipment_modifier", name: "Compacto" }],
      prereqs: { type: "prereq_list", all: true, prereqs: [] },
      calc: { extended_value: "100", extended_weight: "4 lb" },
      importMeta: {
        source: "gcs",
        section: "equipment",
        containerIds: [],
      },
      raw,
    },
  ]);

  const item = equipment[0];

  assert.equal(item.uses, 4);
  assert.equal(item.maxUses, 10);
  assert.equal(item.features.length, 1);
  assert.equal(item.modifiers.length, 1);
  assert.deepEqual(item.prereqs, { type: "prereq_list", all: true, prereqs: [] });
  assert.deepEqual(item.importMeta, {
    source: "gcs",
    section: "equipment",
    containerIds: [],
  });
  assert.equal(item.raw, raw);
});

test("serializes rich imported equipment fields", () => {
  const equipment = createEquipment([
    {
      id: "eq-001",
      name: "Kit de Campo",
      cost: 100,
      weightKg: 2,
      uses: 4,
      maxUses: 10,
      importMeta: { source: "gcs" },
      raw: { id: "eq-001" },
    },
  ]);

  const json = serializeEquipment(equipment);

  assert.equal(json[0].uses, 4);
  assert.equal(json[0].maxUses, 10);
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { id: "eq-001" });
});

test("accepts numeric strings for uses", () => {
  const equipment = createEquipment([
    {
      id: "eq-001",
      name: "Kit de Campo",
      uses: "3",
      max_uses: "5",
    },
  ]);

  assert.equal(equipment[0].uses, 3);
  assert.equal(equipment[0].maxUses, 5);
});

test("rejects invalid rich equipment fields", () => {
  assert.throws(() => {
    createEquipment([
      {
        id: "eq-001",
        name: "Kit de Campo",
        uses: -1,
      },
    ]);
  });

  assert.throws(() => {
    createEquipment([
      {
        id: "eq-001",
        name: "Kit de Campo",
        importMeta: [],
      },
    ]);
  });
});
