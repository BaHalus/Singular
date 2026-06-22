import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createApplicationHistoryEntry,
} from "../history/ApplicationHistory.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import { createCommandRegistry } from "./CommandRegistry.js";
import {
  executeCommand,
  getCommandExecutionStatuses,
  validateCommandExecutionResult,
} from "./CommandExecutor.js";

function character(name = "Original") {
  return createCharacter({
    identity: {
      id: "character-command-executor",
      name,
    },
    metadata: {
      createdAt: "2026-06-22T11:00:00.000Z",
      updatedAt: "2026-06-22T11:00:00.000Z",
      source: "test",
    },
  });
}

function futureTransition() {
  return createApplicationHistoryEntry({
    id: "transition-future",
    commandId: "command-future",
    commandType: "character.rename",
    issuedAt: "2026-06-22T10:00:00.000Z",
    appliedAt: "2026-06-22T10:00:01.000Z",
    beforeRevision: 4,
    afterRevision: 5,
    beforeCharacter: character("Original"),
    afterCharacter: character("Future"),
    commandPayload: { name: "Future" },
    receipt: { status: "applied" },
  });
}

function session(input = {}) {
  return createApplicationSession({
    id: "session-command-executor",
    revision: input.revision ?? 4,
    character: input.character ?? character(),
    history: input.history ?? [],
    future: input.future ?? [futureTransition()],
    dirty: input.dirty ?? false,
    lastReceipt: input.lastReceipt ?? null,
    metadata: { source: "test" },
  });
}

function command(input = {}) {
  return {
    id: input.id ?? "command-rename",
    type: input.type ?? "character.rename",
    expectedRevision: input.expectedRevision ?? 4,
    issuedAt: input.issuedAt ?? "2026-06-22T11:00:00.000Z",
    payload: input.payload ?? { name: "Renomeado" },
  };
}

function renameHandler({ session: current, command: currentCommand }) {
  const serialized = serializeCharacter(current.character);
  return {
    status: "applied",
    character: createCharacter({
      ...serialized,
      identity: {
        ...serialized.identity,
        name: currentCommand.payload.name,
      },
    }),
    receipt: {
      previousName: current.character.identity.name,
      name: currentCommand.payload.name,
    },
    diagnostics: [{ code: "character-renamed", severity: "info" }],
  };
}

test("applies one command atomically and records one transition", () => {
  const original = session();
  const registry = createCommandRegistry([{
    type: "character.rename",
    handler: renameHandler,
  }]);

  const result = executeCommand(original, command(), registry);

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 5);
  assert.equal(result.session.character.identity.name, "Renomeado");
  assert.equal(result.session.dirty, true);
  assert.equal(result.session.history.length, 1);
  assert.deepEqual(result.session.future, []);
  assert.equal(result.receipt.previousRevision, 4);
  assert.equal(result.receipt.revision, 5);
  assert.equal(result.receipt.domainReceipt.previousName, "Original");
  assert.deepEqual(result.session.lastReceipt, result.receipt);

  const entry = result.session.history[0];
  assert.equal(entry.commandId, "command-rename");
  assert.equal(entry.commandType, "character.rename");
  assert.deepEqual(entry.commandPayload, { name: "Renomeado" });
  assert.equal(entry.beforeRevision, 4);
  assert.equal(entry.afterRevision, 5);
  assert.equal(entry.beforeCharacter.identity.name, "Original");
  assert.equal(entry.afterCharacter.identity.name, "Renomeado");
  assert.deepEqual(entry.receipt, result.receipt);

  assert.equal(original.revision, 4);
  assert.equal(original.character.identity.name, "Original");
  assert.equal(original.history.length, 0);
  assert.equal(original.future.length, 1);
  assert.equal(validateCommandExecutionResult(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(entry), true);
});

test("rejects a stale revision without invoking the handler", () => {
  let executions = 0;
  const original = session();
  const registry = createCommandRegistry([{
    type: "character.rename",
    handler: () => {
      executions += 1;
      return { status: "no-op" };
    },
  }]);

  const result = executeCommand(original, command({ expectedRevision: 3 }), registry);

  assert.equal(result.status, "rejected");
  assert.equal(result.session, original);
  assert.equal(result.receipt, null);
  assert.equal(executions, 0);
  assert.equal(
    result.diagnostics[0].code,
    "application-command-stale-revision",
  );
  assert.equal(result.diagnostics[0].actualRevision, 4);
});

test("rejects invalid envelopes and missing handlers atomically", () => {
  const original = session();
  const emptyRegistry = createCommandRegistry();

  const invalid = executeCommand(
    original,
    command({ payload: [] }),
    emptyRegistry,
  );
  const missing = executeCommand(
    original,
    command({ type: "character.missing" }),
    emptyRegistry,
  );

  assert.equal(invalid.status, "rejected");
  assert.equal(invalid.session, original);
  assert.equal(invalid.diagnostics[0].code, "application-command-invalid");
  assert.equal(missing.status, "rejected");
  assert.equal(missing.session, original);
  assert.equal(
    missing.diagnostics[0].code,
    "application-command-handler-missing",
  );
});

test("preserves history future and revision for a no-op", () => {
  const original = session();
  const registry = createCommandRegistry([{
    type: "character.rename",
    handler: () => ({
      status: "no-op",
      receipt: { reason: "already-current" },
      diagnostics: [{ code: "already-current", severity: "info" }],
    }),
  }]);

  const result = executeCommand(original, command(), registry);

  assert.equal(result.status, "no-op");
  assert.equal(result.session, original);
  assert.equal(result.session.revision, 4);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.session.future.length, 1);
  assert.equal(result.receipt.previousRevision, 4);
  assert.equal(result.receipt.revision, 4);
  assert.equal(result.receipt.domainReceipt.reason, "already-current");
  assert.equal(original.lastReceipt, null);
});

test("turns handler exceptions into failed results without partial state", () => {
  const original = session();
  const registry = createCommandRegistry([{
    type: "character.rename",
    handler: () => {
      throw new Error("domain operation failed");
    },
  }]);

  const result = executeCommand(original, command(), registry);

  assert.equal(result.status, "failed");
  assert.equal(result.session, original);
  assert.equal(result.receipt, null);
  assert.equal(
    result.diagnostics[0].code,
    "application-command-execution-failed",
  );
  assert.match(result.diagnostics[0].message, /domain operation failed/);
  assert.equal(original.character.identity.name, "Original");
  assert.equal(original.history.length, 0);
});

test("rejects invalid handler results as failed without changing state", () => {
  const original = session();
  const invalidResults = [
    null,
    { status: "unknown" },
    { status: "applied" },
    { status: "applied", character: {} },
    { status: "no-op", character: character("Unexpected") },
    { status: "no-op", diagnostics: ["invalid"] },
  ];

  for (const invalidResult of invalidResults) {
    const registry = createCommandRegistry([{
      type: "character.rename",
      handler: () => invalidResult,
    }]);
    const result = executeCommand(original, command(), registry);

    assert.equal(result.status, "failed");
    assert.equal(result.session, original);
    assert.equal(result.receipt, null);
  }
});

test("fails atomically when the revision cannot advance", () => {
  const original = session({ revision: Number.MAX_SAFE_INTEGER });
  const registry = createCommandRegistry([{
    type: "character.rename",
    handler: renameHandler,
  }]);
  const result = executeCommand(
    original,
    command({ expectedRevision: Number.MAX_SAFE_INTEGER }),
    registry,
  );

  assert.equal(result.status, "failed");
  assert.equal(result.session, original);
  assert.match(result.diagnostics[0].message, /revision exhausted/);
  assert.equal(original.history.length, 0);
});

test("publishes the canonical execution status set", () => {
  assert.deepEqual(getCommandExecutionStatuses(), [
    "applied",
    "no-op",
    "rejected",
    "failed",
  ]);
});
