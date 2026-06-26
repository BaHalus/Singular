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
  ATTACK_COMMAND_TYPES,
  createAttackCommandHandlerEntries,
} from "./AttackCommandHandlers.js";

function makeSession(input = {}) {
  return createApplicationSession({
    id: "session-app-attacks",
    character: createCharacter(),
    ...input,
  });
}

function makeRegistry() {
  return createCommandRegistry(createAttackCommandHandlerEntries());
}

function makeRuntime() {
  return {
    clock: createFixedClock("2026-06-26T20:30:00.000Z"),
    idGenerator: createSequentialIdGenerator({ initialValue: 0, width: 3 }),
  };
}

function command(type, expectedRevision, payload, id = "command-app-attacks") {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: "2026-06-26T20:20:00.000Z",
    payload,
  };
}

function attackInput(id = "attack-alpha") {
  return {
    id,
    name: "Entrada declarada",
    category: "melee",
    skillId: "skill-alpha",
    source: { kind: "manual", id: null },
    damage: { value: "declared-value", type: "declared-type" },
    reach: "declared-reach",
    notes: "Sem cálculo de aplicação.",
  };
}

test("exposes four immutable attack command entries", () => {
  const entries = createAttackCommandHandlerEntries();

  assert.equal(Object.isFrozen(entries), true);
  assert.deepEqual(entries.map(entry => entry.type), [
    "attack.add",
    "attack.update",
    "attack.remove",
    "attack.reorder",
  ]);
  assert.equal(entries.every(entry => Object.isFrozen(entry)), true);
});

test("adds a declared entry through CommandExecutor", () => {
  const initial = makeSession();
  const result = executeCommand(
    initial,
    command(
      ATTACK_COMMAND_TYPES.ADD,
      0,
      { attack: attackInput() },
      "command-add-attack",
    ),
    makeRegistry(),
    makeRuntime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(initial.character.attacks.length, 0);
  assert.equal(result.session.character.attacks.length, 1);
  assert.equal(result.session.character.attacks[0].id, "attack-alpha");
  assert.equal(result.session.character.attacks[0].damage.authority, "declared");
  assert.equal(result.session.history.length, 1);
  assert.equal(result.session.future.length, 0);
  assert.equal(result.receipt.domainReceipt.operation, "add-attack");
  assert.equal(result.receipt.domainReceipt.index, 0);
});

test("updates reorders and removes through canonical operations", () => {
  const appRegistry = makeRegistry();
  const appRuntime = makeRuntime();
  const first = executeCommand(
    makeSession(),
    command(
      ATTACK_COMMAND_TYPES.ADD,
      0,
      { attack: attackInput("attack-alpha") },
      "command-add-alpha",
    ),
    appRegistry,
    appRuntime,
  );
  const second = executeCommand(
    first.session,
    command(
      ATTACK_COMMAND_TYPES.ADD,
      1,
      { attack: attackInput("attack-beta") },
      "command-add-beta",
    ),
    appRegistry,
    appRuntime,
  );
  const updated = executeCommand(
    second.session,
    command(
      ATTACK_COMMAND_TYPES.UPDATE,
      2,
      {
        attackId: "attack-alpha",
        patch: { name: "Entrada atualizada", notes: "Nota atualizada" },
      },
      "command-update-alpha",
    ),
    appRegistry,
    appRuntime,
  );
  const reordered = executeCommand(
    updated.session,
    command(
      ATTACK_COMMAND_TYPES.REORDER,
      3,
      { attackId: "attack-beta", targetIndex: 0 },
      "command-reorder-beta",
    ),
    appRegistry,
    appRuntime,
  );
  const removed = executeCommand(
    reordered.session,
    command(
      ATTACK_COMMAND_TYPES.REMOVE,
      4,
      { attackId: "attack-alpha" },
      "command-remove-alpha",
    ),
    appRegistry,
    appRuntime,
  );

  assert.equal(updated.session.character.attacks[0].name, "Entrada atualizada");
  assert.equal(updated.receipt.domainReceipt.operation, "update-attack");
  assert.deepEqual(reordered.session.character.attacks.map(item => item.id), [
    "attack-beta",
    "attack-alpha",
  ]);
  assert.equal(reordered.receipt.domainReceipt.previousIndex, 1);
  assert.equal(reordered.receipt.domainReceipt.targetIndex, 0);
  assert.deepEqual(removed.session.character.attacks.map(item => item.id), [
    "attack-beta",
  ]);
  assert.equal(removed.session.revision, 5);
  assert.equal(removed.session.history.length, 5);
  assert.equal(removed.session.future.length, 0);
  assert.equal(removed.receipt.domainReceipt.previousIndex, 1);
});

test("persists undoes and redoes an attack command through App Core", async () => {
  const appRuntime = makeRuntime();
  const repository = createInMemorySessionRepository();
  const initial = makeSession();
  const applied = executeCommand(
    initial,
    command(
      ATTACK_COMMAND_TYPES.ADD,
      0,
      { attack: attackInput("attack-history") },
      "command-add-history",
    ),
    makeRegistry(),
    appRuntime,
  );

  assert.equal(applied.status, "applied");
  await repository.save(applied.session);
  const reopened = await repository.load(initial.id);
  assert.equal(reopened.character.attacks[0].id, "attack-history");
  assert.equal(reopened.history.length, 1);

  const undone = undoApplicationSession(
    reopened,
    { expectedRevision: 1 },
    appRuntime,
  );
  assert.equal(undone.status, "undone");
  assert.equal(undone.session.revision, 2);
  assert.equal(undone.session.character.attacks.length, 0);
  assert.equal(undone.session.history.length, 0);
  assert.equal(undone.session.future.length, 1);

  await repository.save(undone.session);
  const reopenedUndone = await repository.load(initial.id);
  const redone = redoApplicationSession(
    reopenedUndone,
    { expectedRevision: 2 },
    appRuntime,
  );

  assert.equal(redone.status, "redone");
  assert.equal(redone.session.revision, 3);
  assert.equal(redone.session.character.attacks[0].id, "attack-history");
  assert.equal(redone.session.history.length, 1);
  assert.equal(redone.session.future.length, 0);
});
