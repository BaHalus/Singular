import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";

test("imports carried and stored equipment into character", () => {
  const source = {
    id: "char-001",
    profile: { name: "Equipment Hero" },
    equipment: [
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
            id: "kit-001",
            description: "Kit Médico",
            quantity: 1,
            value: "50",
            weight: "2 lb",
            uses: 3,
            max_uses: 5,
          },
        ],
      },
      {
        type: "equipment",
        id: "cape-001",
        description: "Capa Protetora",
        value: "200",
        weight: "4 lb",
        equipped: true,
        features: [{ type: "dr_bonus", amount: 1, location: "torso" }],
      },
    ],
    other_equipment: [
      {
        type: "equipment",
        id: "chest-001",
        description: "Baú de Reserva",
        value: "80",
        weight: "20 lb",
      },
    ],
  };

  const snapshot = createSnapshotFromGcs(source);

  assert.equal(snapshot.equipment.length, 3);
  assert.equal(snapshot.unknownEquipmentNodes.length, 0);
  assert.equal(snapshot.equipment[0].containerKind, "physical");
  assert.equal(snapshot.equipment[0].children[0].uses, 3);
  assert.equal(snapshot.equipment[1].state, "equipped");
  assert.equal(snapshot.equipment[2].state, "stored");

  const character = importCharacter(source);

  assert.equal(character.equipment.length, 3);
  assert.equal(character.equipment[0].name, "Mochila");
  assert.equal(character.equipment[0].weightKg, 5);
  assert.equal(character.equipment[0].children[0].name, "Kit Médico");
  assert.equal(character.equipment[0].children[0].weightKg, 1);
  assert.equal(character.equipment[1].features.length, 1);
  assert.equal(character.equipment[2].state, "stored");
});

test("preserves semantic equipment groups", () => {
  const character = importCharacter({
    id: "char-001",
    profile: { name: "Grouped Equipment Hero" },
    equipment: [
      {
        type: "equipment_container",
        id: "group-001",
        description: "Poções",
        value: "0",
        weight: "0 lb",
        children: [
          {
            type: "equipment",
            id: "potion-001",
            description: "Poção Restauradora",
            value: "100",
            weight: "0.5 lb",
          },
        ],
      },
    ],
  });

  assert.equal(character.equipment.length, 1);
  assert.equal(character.equipment[0].containerKind, "group");
  assert.equal(character.equipment[0].state, "ignored");
  assert.equal(character.equipment[0].children[0].state, "carried");
});

test("preserves unknown equipment nodes in snapshot", () => {
  const snapshot = createSnapshotFromGcs({
    id: "char-001",
    profile: { name: "Unknown Equipment Hero" },
    equipment: [
      {
        type: "unknown_equipment_node",
        id: "unknown-001",
      },
    ],
  });

  assert.deepEqual(snapshot.equipment, []);
  assert.equal(snapshot.unknownEquipmentNodes.length, 1);
  assert.equal(snapshot.unknownEquipmentNodes[0].id, "unknown-001");
});
