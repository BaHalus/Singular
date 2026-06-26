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

function session() {
  return createApplicationSession({
    id: "session-app-attacks-validation",
    character: createCharacter(),
  });
}

function registry() {
  return createCommandRegistry(createAttackCommandHandlerEntries());
}

function runtime() {
  return {
    clock: createFixedClock("2026-06-26T20:30:00.000Z"),
    idGenerator: createSequentialIdGenerator({ initialValue: 0, width: 3 }),
  };
}

function command(type, expectedRevision, payload, id) {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: "2026-06-26T20:20:00.000Z",
    payload,
  };
}

function entry() {
  return {
    id: "attack-validation",
    name: "Entrada declarada",
    category: "melee",
    source: { kind: "manual", id: null },
    damage: { value: "declared-value", type: "declared-type" },
  };
}

function addInitial() {
  return executeCommand(
    session(),
    command(
      ATTACK_COMMAND_TYPES.ADD,
      0,
      { attack: entry() },
      "command-add-validation",
    ),
    registry(),
    runtime(),
  );
}

test("returns no-op for unchanged update and position", () => {
  const applied = addInitial();
  const appRegistry = registry();
  const appRuntime = runtime();
  const unchanged = executeCommand(
    applied.session,
    command(
      ATTACK_COMMAND_TYPES.UPDATE,
      1,
      {
        attackId: "attack-validation",
        patch: { name: "Entrada declarada" },
      },
      "command-update-unchanged",
    ),
    appRegistry,
    appRuntime,
  );
  assert.equal(unchanged.status, "no-op");
  assert.equal(unchanged.session, applied.session);
  assert.equal(unchanged.session.revision, 1);
  assert.equal(unchanged.receipt.domainReceipt.reason, "unchanged-attack");

  const samePosition = executeCommand(
    unchanged.session,
    command(
      ATTACK_COMMAND_TYPES.REORDER,
      1,
      { attackId: "attack-validation", targetIndex: 0 },
      "command-reorder-unchanged",
    ),
    appRegistry,
    appRuntime,
  );
  assert.equal(samePosition.status, "no-op");
  assert.equal(samePosition.session, applied.session);
  assert.equal(samePosition.receipt.domainReceipt.reason, "already-at-index");
});
