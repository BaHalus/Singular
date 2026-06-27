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

test("exposes seven immutable equipment command entries", () => {
  const entries = createEquipmentCommandHandlerEntries();
  assert.equal(Object.isFrozen(entries), true);
  assert.deepEqual(entries.map(entry => entry.type), [
    "equipment.add",
    "equipment.add-child",
    "equipment.rename",
    "equipment.quantity.set",
    "equipment.state.set",
    "equipment.remove",
    "equipment.move",
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
  const renamed = executeCommand(
    childAdded.session,
    command(
      EQUIPMENT_COMMAND_TYPES.RENAME,
      2,
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
      3,
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
      4,
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
      5,
      { itemId: "torch", targetContainerId: "pack" },
      "move-torch",
    ),
    appRegistry,
    appRuntime,
  );
  const removed = executeCommand(
    moved.session,
    command(
      EQUIPMENT_COMMAND_TYPES.REMOVE,
      6,
      { itemId: "rope" },
      "remove-rope",
    ),
    appRegistry,
    appRuntime,
  );

  assert.equal(added.status, "applied");
  assert.equal(renamed.session.character.equipment[2].name, "Tocha acesa");
  assert.equal(quantified.session.character.equipment[0].children[1].quantity, 3);
  assert.equal(stored.session.character.equipment[1].state, "stored");
  assert.deepEqual(
    moved.session.character.equipment[0].children.map(entry => entry.id),
    ["rope", "ration", "torch"],
  );
  assert.deepEqual(
    removed.session.character.equipment[0].children.map(entry => entry.id),
    ["ration", "torch"],
  );
  assert.equal(removed.session.revision, 7);
  assert.equal(removed.session.history.length, 7);
  assert.equal(removed.receipt.domainReceipt.previousContainerId, "pack");
});
