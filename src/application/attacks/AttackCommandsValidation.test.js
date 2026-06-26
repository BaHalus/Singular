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

function entry(id = "attack-validation") {
  return {
    id,
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
  assert.equal(unchanged.session.history.length, 1);
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
  assert.equal(samePosition.session.history.length, 1);
  assert.equal(samePosition.receipt.domainReceipt.reason, "already-at-index");
});

test("rejects stale revision before invoking an attack handler", () => {
  const applied = addInitial();
  const result = executeCommand(
    applied.session,
    command(
      ATTACK_COMMAND_TYPES.REMOVE,
      0,
      { attackId: "attack-validation" },
      "command-stale-remove",
    ),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.session, applied.session);
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.character.attacks.length, 1);
  assert.equal(
    result.diagnostics[0].code,
    "application-command-stale-revision",
  );
});

test("preserves the session for invalid payloads and domain input", () => {
  const initial = session();
  const appRegistry = registry();
  const appRuntime = runtime();

  const extra = executeCommand(
    initial,
    command(
      ATTACK_COMMAND_TYPES.ADD,
      0,
      { attack: entry(), calculate: true },
      "command-extra-property",
    ),
    appRegistry,
    appRuntime,
  );
  assert.equal(extra.status, "failed");
  assert.equal(extra.session, initial);
  assert.match(extra.diagnostics[0].message, /unsupported properties/);

  const missing = executeCommand(
    initial,
    command(
      ATTACK_COMMAND_TYPES.UPDATE,
      0,
      { attackId: "missing", patch: { notes: "x" } },
      "command-missing-attack",
    ),
    appRegistry,
    appRuntime,
  );
  assert.equal(missing.status, "failed");
  assert.equal(missing.session, initial);
  assert.match(missing.diagnostics[0].message, /not found/);

  const invalidAuthority = executeCommand(
    initial,
    command(
      ATTACK_COMMAND_TYPES.ADD,
      0,
      {
        attack: {
          ...entry("attack-invalid-authority"),
          damage: {
            value: "declared-value",
            type: "declared-type",
            authority: "calculated",
          },
        },
      },
      "command-invalid-authority",
    ),
    appRegistry,
    appRuntime,
  );
  assert.equal(invalidAuthority.status, "failed");
  assert.equal(invalidAuthority.session, initial);
  assert.match(
    invalidAuthority.diagnostics[0].message,
    /authority must be declared/,
  );

  const invalidIndex = executeCommand(
    addInitial().session,
    command(
      ATTACK_COMMAND_TYPES.REORDER,
      1,
      { attackId: "attack-validation", targetIndex: 2 },
      "command-invalid-index",
    ),
    appRegistry,
    appRuntime,
  );
  assert.equal(invalidIndex.status, "failed");
  assert.equal(invalidIndex.session.revision, 1);
  assert.equal(invalidIndex.session.character.attacks[0].id, "attack-validation");

  assert.equal(initial.revision, 0);
  assert.equal(initial.history.length, 0);
  assert.equal(initial.character.attacks.length, 0);
});

test("fails atomically when adding a duplicate attack id", () => {
  const applied = addInitial();
  const result = executeCommand(
    applied.session,
    command(
      ATTACK_COMMAND_TYPES.ADD,
      1,
      { attack: entry() },
      "command-duplicate-id",
    ),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "failed");
  assert.equal(result.session, applied.session);
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.history.length, 1);
  assert.equal(result.session.character.attacks.length, 1);
  assert.match(result.diagnostics[0].message, /ids must be unique/);
});
