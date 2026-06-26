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

test("exposes immutable command entries", () => {
  const entries = createAttackCommandHandlerEntries();
  assert.equal(Object.isFrozen(entries), true);
  assert.equal(entries.length, 4);
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
  assert.equal(result.receipt.domainReceipt.operation, "add-attack");
  assert.equal(result.receipt.domainReceipt.index, 0);
});
