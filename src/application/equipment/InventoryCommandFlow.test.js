import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import { createSequentialIdGenerator } from "../../infrastructure/runtime/SequentialIdGenerator.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  EQUIPMENT_COMMAND_TYPES,
  createEquipmentCommandHandlerEntries,
} from "./EquipmentCommandHandlers.js";

function item(id, overrides = {}) {
  return {
    id,
    name: `Item ${id}`,
    quantity: 1,
    cost: 10,
    weightKg: 0.5,
    state: "carried",
    ...overrides,
  };
}

function container(id, children = []) {
  return item(id, {
    kind: "container",
    containerKind: "physical",
    children,
  });
}

function session() {
  return createApplicationSession({
    id: "session-app-equipment",
    character: createCharacter({
      identity: { id: "character-app-equipment", name: "Inventário" },
      equipment: [
        container("pack", [item("rope")]),
        item("sword", { state: "equipped" }),
      ],
    }),
  });
}

function registry() {
  return createCommandRegistry(createEquipmentCommandHandlerEntries());
}

function runtime() {
  return {
    clock: createFixedClock("2026-06-26T23:10:00.000Z"),
    idGenerator: createSequentialIdGenerator({ initialValue: 0, width: 3 }),
  };
}

function command(type, expectedRevision, payload, id) {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: "2026-06-26T23:05:00.000Z",
    payload,
  };
}

test("exposes nine immutable equipment command entries", () => {
  const entries = createEquipmentCommandHandlerEntries();
  assert.equal(Object.isFrozen(entries), true);
  assert.deepEqual(entries.map(entry => entry.type), [
    "equipment.add",
    "equipment.add-child",
    "equipment.update",
    "equipment.rename",
    "equipment.quantity.set",
    "equipment.state.set",
    "equipment.remove",
    "equipment.move",
    "equipment.reorder",
  ]);
  assert.equal(entries.every(entry => Object.isFrozen(entry)), true);
});

test("applies structural inventory commands through CommandExecutor", () => {
  const appRegistry = registry();
  const appRuntime = runtime();
  const added = executeCommand(
    session(),
    command(EQUIPMENT_COMMAND_TYPES.ADD, 0, { item: item("torch") }, "add-torch"),
    appRegistry,
    appRuntime,
  );
  const childAdded = executeCommand(
    added.session,
    command(
      EQUIPMENT_COMMAND_TYPES.ADD_CHILD,
      1,
      { containerId: "pack", item: item("ration") },
      "add-ration",
    ),
    appRegistry,
    appRuntime,
  );
  const updated = executeCommand(
    childAdded.session,
    command(
      EQUIPMENT_COMMAND_TYPES.UPDATE,
      2,
      {
        itemId: "torch",
        patch: {
          name: "Tocha oleada",
          notes: "Preparada para uso em mesa",
          reference: "B288",
        },
      },
      "update-torch",
    ),
    appRegistry,
    appRuntime,
  );
  const renamed = executeCommand(
    updated.session,
    command(
      EQUIPMENT_COMMAND_TYPES.RENAME,
      3,
      { itemId: "torch", name: "Tocha acesa" },
      "rename-torch",
    ),
    appRegistry,
    appRuntime,
  );
  const quantified = executeCommand(
    renamed.session,
    command(
      EQUIPMENT_COMMAND_TYPES.SET_QUANTITY,
      4,
      { itemId: "ration", quantity: 3 },
      "quantity-ration",
    ),
    appRegistry,
    appRuntime,
  );
  const stored = executeCommand(
    quantified.session,
    command(
      EQUIPMENT_COMMAND_TYPES.SET_STATE,
      5,
      { itemId: "sword", state: "stored" },
      "store-sword",
    ),
    appRegistry,
    appRuntime,
  );
  const moved = executeCommand(
    stored.session,
    command(
      EQUIPMENT_COMMAND_TYPES.MOVE,
      6,
      { itemId: "torch", targetContainerId: "pack" },
      "move-torch",
    ),
    appRegistry,
    appRuntime,
  );
  const reordered = executeCommand(
    moved.session,
    command(
      EQUIPMENT_COMMAND_TYPES.REORDER,
      7,
      { itemId: "torch", targetIndex: 0 },
      "reorder-torch",
    ),
    appRegistry,
    appRuntime,
  );
  const removed = executeCommand(
    reordered.session,
    command(
      EQUIPMENT_COMMAND_TYPES.REMOVE,
      8,
      { itemId: "rope" },
      "remove-rope",
    ),
    appRegistry,
    appRuntime,
  );

  assert.equal(added.status, "applied");
  assert.equal(updated.session.character.equipment[2].notes, "Preparada para uso em mesa");
  assert.equal(renamed.session.character.equipment[2].name, "Tocha acesa");
  assert.equal(quantified.session.character.equipment[0].children[1].quantity, 3);
  assert.equal(stored.session.character.equipment[1].state, "stored");
  assert.deepEqual(
    moved.session.character.equipment[0].children.map(entry => entry.id),
    ["rope", "ration", "torch"],
  );
  assert.deepEqual(
    reordered.session.character.equipment[0].children.map(entry => entry.id),
    ["torch", "rope", "ration"],
  );
  assert.deepEqual(
    removed.session.character.equipment[0].children.map(entry => entry.id),
    ["torch", "ration"],
  );
  assert.equal(removed.session.revision, 9);
  assert.equal(removed.session.history.length, 9);
  assert.equal(removed.receipt.domainReceipt.previousContainerId, "pack");
});
