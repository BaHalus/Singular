import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import {
  createSequentialIdGenerator,
} from "../../infrastructure/runtime/SequentialIdGenerator.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import {
  redoApplicationSession,
  undoApplicationSession,
} from "../history/ApplicationHistoryOperations.js";
import {
  createInMemorySessionRepository,
} from "../persistence/InMemorySessionRepository.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createEquipmentCommandHandlerEntries,
  EQUIPMENT_COMMAND_TYPES,
} from "./EquipmentCommandHandlers.js";

function makeSession(input = {}) {
  return createApplicationSession({
    id: "session-app-equipment",
    character: createCharacter({
      identity: {
        id: "character-app-equipment",
        name: "Inventarista",
      },
    }),
    ...input,
  });
}

function makeRegistry() {
  return createCommandRegistry(createEquipmentCommandHandlerEntries());
}

function makeRuntime() {
  return {
    clock: createFixedClock("2026-06-26T23:05:00.000Z"),
    idGenerator: createSequentialIdGenerator({ initialValue: 0, width: 3 }),
  };
}

function command(type, expectedRevision, payload, id = "command-app-equipment") {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: "2026-06-26T23:00:00.000Z",
    payload,
  };
}

function itemInput(id = "equipment-rope") {
  return {
    id,
    name: "Corda",
    quantity: 1,
    cost: 10,
    weightKg: 2,
    state: "carried",
    notes: "Declarado manualmente.",
  };
}

function containerInput(id = "equipment-backpack") {
  return {
    id,
    kind: "container",
    containerKind: "physical",
    name: "Mochila",
    quantity: 1,
    cost: 60,
    weightKg: 1,
    state: "carried",
    children: [],
  };
}

test("exposes seven immutable equipment command entries", () => {
  const entries = createEquipmentCommandHandlerEntries();

  assert.equal(Object.isFrozen(entries), true);
  assert.deepEqual(entries.map(entry => entry.type), [
    "equipment.add",
    "equipment.update",
    "equipment.remove",
    "equipment.reorder",
    "equipment.quantity.set",
    "equipment.state.set",
    "equipment.move",
  ]);
  assert.equal(entries.every(entry => Object.isFrozen(entry)), true);
});

test("adds a declared equipment item through CommandExecutor", () => {
  const initial = makeSession();
  const result = executeCommand(
    initial,
    command(
      EQUIPMENT_COMMAND_TYPES.ADD,
      0,
      { item: itemInput() },
      "command-add-equipment",
    ),
    makeRegistry(),
    makeRuntime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(initial.character.equipment.length, 0);
  assert.equal(result.session.character.equipment.length, 1);
  assert.equal(result.session.character.equipment[0].id, "equipment-rope");
  assert.equal(result.session.character.equipment[0].weightKg, 2);
  assert.equal(result.session.history.length, 1);
  assert.equal(result.receipt.domainReceipt.operation, "add-equipment");
  assert.equal(result.receipt.domainReceipt.index, 0);
});

test("updates quantity state order container and removal through canonical operations", () => {
  const registry = makeRegistry();
  const runtime = makeRuntime();
  const first = executeCommand(
    makeSession(),
    command(
      EQUIPMENT_COMMAND_TYPES.ADD,
      0,
      { item: containerInput() },
      "command-add-backpack",
    ),
    registry,
    runtime,
  );
  const second = executeCommand(
    first.session,
    command(
      EQUIPMENT_COMMAND_TYPES.ADD,
      1,
      { item: itemInput("equipment-rope") },
      "command-add-rope",
    ),
    registry,
    runtime,
  );
  const third = executeCommand(
    second.session,
    command(
      EQUIPMENT_COMMAND_TYPES.ADD,
      2,
      { item: itemInput("equipment-torch") },
      "command-add-torch",
    ),
    registry,
    runtime,
  );
  const updated = executeCommand(
    third.session,
    command(
      EQUIPMENT_COMMAND_TYPES.UPDATE,
      3,
      {
        itemId: "equipment-rope",
        patch: { name: "Corda de cânhamo", notes: "Sem cálculo de carga." },
      },
      "command-update-rope",
    ),
    registry,
    runtime,
  );
  const quantity = executeCommand(
    updated.session,
    command(
      EQUIPMENT_COMMAND_TYPES.SET_QUANTITY,
      4,
      { itemId: "equipment-rope", quantity: 2 },
      "command-quantity-rope",
    ),
    registry,
    runtime,
  );
  const state = executeCommand(
    quantity.session,
    command(
      EQUIPMENT_COMMAND_TYPES.SET_STATE,
      5,
      { itemId: "equipment-rope", state: "equipped" },
      "command-state-rope",
    ),
    registry,
    runtime,
  );
  const reordered = executeCommand(
    state.session,
    command(
      EQUIPMENT_COMMAND_TYPES.REORDER,
      6,
      { itemId: "equipment-torch", targetIndex: 1 },
      "command-reorder-torch",
    ),
    registry,
    runtime,
  );
  const stored = executeCommand(
    reordered.session,
    command(
      EQUIPMENT_COMMAND_TYPES.MOVE,
      7,
      { itemId: "equipment-rope", targetContainerId: "equipment-backpack" },
      "command-store-rope",
    ),
    registry,
    runtime,
  );
  const withdrawn = executeCommand(
    stored.session,
    command(
      EQUIPMENT_COMMAND_TYPES.MOVE,
      8,
      { itemId: "equipment-rope", targetContainerId: null },
      "command-withdraw-rope",
    ),
    registry,
    runtime,
  );
  const removed = executeCommand(
    withdrawn.session,
    command(
      EQUIPMENT_COMMAND_TYPES.REMOVE,
      9,
      { itemId: "equipment-torch" },
      "command-remove-torch",
    ),
    registry,
    runtime,
  );

  assert.equal(updated.session.character.equipment[1].name, "Corda de cânhamo");
  assert.equal(quantity.session.character.equipment[1].quantity, 2);
  assert.equal(state.session.character.equipment[1].state, "equipped");
  assert.deepEqual(reordered.session.character.equipment.map(item => item.id), [
    "equipment-backpack",
    "equipment-torch",
    "equipment-rope",
  ]);
  assert.equal(stored.session.character.equipment[0].children[0].id, "equipment-rope");
  assert.equal(stored.receipt.domainReceipt.operation, "store-equipment");
  assert.equal(withdrawn.session.character.equipment.at(-1).id, "equipment-rope");
  assert.equal(withdrawn.receipt.domainReceipt.operation, "withdraw-equipment");
  assert.deepEqual(removed.session.character.equipment.map(item => item.id), [
    "equipment-backpack",
    "equipment-rope",
  ]);
  assert.equal(removed.session.revision, 10);
  assert.equal(removed.session.history.length, 10);
  assert.equal(removed.receipt.domainReceipt.previousIndex, 1);
});

test("keeps no-op equipment commands out of revision and history", () => {
  const registry = makeRegistry();
  const runtime = makeRuntime();
  const added = executeCommand(
    makeSession(),
    command(
      EQUIPMENT_COMMAND_TYPES.ADD,
      0,
      { item: itemInput("equipment-noop") },
      "command-add-noop-equipment",
    ),
    registry,
    runtime,
  );

  const result = executeCommand(
    added.session,
    command(
      EQUIPMENT_COMMAND_TYPES.SET_QUANTITY,
      1,
      { itemId: "equipment-noop", quantity: 1 },
      "command-noop-quantity",
    ),
    registry,
    runtime,
  );

  assert.equal(result.status, "no-op");
  assert.equal(result.session, added.session);
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.history.length, 1);
  assert.equal(result.receipt.domainReceipt.operation, "set-equipment-quantity-no-op");
});

test("persists undoes and redoes an equipment command through App Core", async () => {
  const runtime = makeRuntime();
  const repository = createInMemorySessionRepository();
  const initial = makeSession();
  const applied = executeCommand(
    initial,
    command(
      EQUIPMENT_COMMAND_TYPES.ADD,
      0,
      { item: itemInput("equipment-history") },
      "command-add-equipment-history",
    ),
    makeRegistry(),
    runtime,
  );

  assert.equal(applied.status, "applied");
  await repository.save(applied.session);
  const reopened = await repository.load(initial.id);
  assert.equal(reopened.character.equipment[0].id, "equipment-history");
  assert.equal(reopened.history.length, 1);

  const undone = undoApplicationSession(
    reopened,
    { expectedRevision: 1 },
    runtime,
  );
  assert.equal(undone.status, "undone");
  assert.equal(undone.session.revision, 2);
  assert.equal(undone.session.character.equipment.length, 0);
  assert.equal(undone.session.history.length, 0);
  assert.equal(undone.session.future.length, 1);

  await repository.save(undone.session);
  const reopenedUndone = await repository.load(initial.id);
  const redone = redoApplicationSession(
    reopenedUndone,
    { expectedRevision: 2 },
    runtime,
  );

  assert.equal(redone.status, "redone");
  assert.equal(redone.session.revision, 3);
  assert.equal(redone.session.character.equipment[0].id, "equipment-history");
  assert.equal(redone.session.history.length, 1);
  assert.equal(redone.session.future.length, 0);
});

test("rejects invalid payload atomically through CommandExecutor", () => {
  const result = executeCommand(
    makeSession(),
    command(
      EQUIPMENT_COMMAND_TYPES.ADD,
      0,
      { item: itemInput(), extra: true },
      "command-invalid-equipment-payload",
    ),
    makeRegistry(),
    makeRuntime(),
  );

  assert.equal(result.status, "failed");
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.character.equipment.length, 0);
  assert.match(
    result.diagnostics[0].message,
    /unsupported properties/,
  );
});
