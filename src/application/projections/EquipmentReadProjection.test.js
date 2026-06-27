import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createEquipmentReadProjection,
  getEquipmentReadProjectionSchemaVersion,
  serializeEquipmentReadProjection,
  validateEquipmentReadProjection,
} from "./EquipmentReadProjection.js";

function character() {
  return createCharacter({
    identity: { id: "character-equipment-projection", name: "Cargueiro" },
    equipment: [
      {
        id: "pack",
        name: "Mochila",
        kind: "container",
        containerKind: "physical",
        quantity: 1,
        weightKg: 1.2,
        cost: 60,
        state: "carried",
        children: [
          {
            id: "rope",
            name: "Corda",
            quantity: 2,
            weightKg: 1.5,
            cost: 10,
            state: "carried",
          },
        ],
      },
      {
        id: "sword",
        name: "Espada",
        quantity: 1,
        weightKg: 1.5,
        cost: 500,
        state: "equipped",
      },
    ],
  });
}

test("creates a portable equipment projection with canonical totals", () => {
  const projection = createEquipmentReadProjection(character());

  assert.equal(projection.schemaVersion, 1);
  assert.equal(projection.characterId, "character-equipment-projection");
  assert.deepEqual(projection.equipment.map(item => item.id), ["pack", "sword"]);
  assert.deepEqual(projection.equipment[0].children.map(item => item.id), ["rope"]);
  assert.deepEqual(projection.totals, {
    quantity: 4,
    weightKg: 5.7,
    cost: 580,
  });
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.equipment[0].children[0]), true);
});

test("serializes as a detached portable value", () => {
  const projection = createEquipmentReadProjection(character());
  const serialized = serializeEquipmentReadProjection(projection);

  assert.notEqual(serialized, projection);
  assert.notEqual(serialized.equipment, projection.equipment);
  serialized.equipment[0].name = "Alterado fora da projeção";
  assert.equal(projection.equipment[0].name, "Mochila");
});

test("rejects malformed equipment projection values", () => {
  const projection = serializeEquipmentReadProjection(
    createEquipmentReadProjection(character()),
  );

  assert.throws(() => {
    validateEquipmentReadProjection({
      ...projection,
      extra: true,
    });
  }, /unsupported properties/);

  assert.throws(() => {
    validateEquipmentReadProjection({
      ...projection,
      totals: {
        ...projection.totals,
        weightKg: Infinity,
      },
    });
  }, /finite number/);
});

test("exposes equipment projection schema version", () => {
  assert.equal(getEquipmentReadProjectionSchemaVersion(), 1);
});
