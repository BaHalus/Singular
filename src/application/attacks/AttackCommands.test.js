import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import {
  createSequentialIdGenerator,
} from "../../infrastructure/runtime/SequentialIdGenerator.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
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

test("exposes immutable command entries", () => {
  const entries = createAttackCommandHandlerEntries();
  assert.equal(Object.isFrozen(entries), true);
  assert.equal(entries.length, 4);
  assert.equal(entries.every(entry => Object.isFrozen(entry)), true);
});
