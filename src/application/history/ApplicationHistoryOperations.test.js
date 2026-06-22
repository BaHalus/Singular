import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createCommandRegistry,
} from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import {
  createApplicationHistoryEntry,
} from "./ApplicationHistory.js";
import {
  getApplicationHistoryOperationStatuses,
  redoApplicationSession,
  undoApplicationSession,
  validateApplicationHistoryOperationResult,
} from "./ApplicationHistoryOperations.js";
import { createApplicationSession } from "../session/ApplicationSession.js";

function character(name) {
  return createCharacter({
    identity: {
      id: "character-history-operations",
      name,
    },
    metadata: {
      createdAt: "2026-06-22T13:00:00.000Z",
      updatedAt: "2026-06-22T13:00:00.000Z",
      source: "test",
    },
  });
}

function baseSession(revision = 0) {
  return createApplicationSession({
    id: "session-history-operations",
    revision,
    character: character("A"),
  });
}

function registry() {
  return createCommandRegistry([{
    type: "character.rename",
    handler: ({ session, command }) => {
      const serialized = serializeCharacter(session.character);
      return {
        status: "applied",
        character: createCharacter({
          ...serialized,
          identity: {
            ...serialized.identity,
            name: command.payload.name,
          },
        }),
        receipt: {
          from: session.character.identity.name,
          to: command.payload.name,
        },
      };
    },
  }]);
}

function rename(session, name, id) {
  const result = executeCommand(session, {
    id,
    type: "character.rename",
    expectedRevision: session.revision,
    issuedAt: "2026-06-22T13:00:00.000Z",
    payload: { name },
  }, registry());
  assert.equal(result.status, "applied");
  return result.session;
}

test("undoes and redoes multiple transitions with monotonic revisions", () => {
  const afterB = rename(baseSession(), "B", "command-b");
  const afterC = rename(afterB, "C", "command-c");

  const undoC = undoApplicationSession(afterC, {
    expectedRevision: 2,
    operationId: "undo-c",
    now: "2026-06-22T13:10:00.000Z",
  });
  assert.equal(undoC.status, "undone");
  assert.equal(undoC.session.revision, 3);
  assert.equal(undoC.session.character.identity.name, "B");
  assert.equal(undoC.session.history.length, 1);
  assert.equal(undoC.session.future.length, 1);
  assert.equal(undoC.receipt.commandId, "command-c");

  const undoB = undoApplicationSession(undoC.session, {
    expectedRevision: 3,
    operationId: "undo-b",
    now: "2026-06-22T13:11:00.000Z",
  });
  assert.equal(undoB.status, "undone");
  assert.equal(undoB.session.revision, 4);
  assert.equal(undoB.session.character.identity.name, "A");
  assert.equal(undoB.session.history.length, 0);
  assert.equal(undoB.session.future.length, 2);

  const redoB = redoApplicationSession(undoB.session, {
    expectedRevision: 4,
    operationId: "redo-b",
    now: "2026-06-22T13:12:00.000Z",
  });
  assert.equal(redoB.status, "redone");
  assert.equal(redoB.session.revision, 5);
  assert.equal(redoB.session.character.identity.name, "B");
  assert.equal(redoB.session.history.length, 1);
  assert.equal(redoB.session.future.length, 1);

  const redoC = redoApplicationSession(redoB.session, {
    expectedRevision: 5,
    operationId: "redo-c",
    now: "2026-06-22T13:13:00.000Z",
  });
  assert.equal(redoC.status, "redone");
  assert.equal(redoC.session.revision, 6);
  assert.equal(redoC.session.character.identity.name, "C");
  assert.equal(redoC.session.history.length, 2);
  assert.equal(redoC.session.future.length, 0);
  assert.equal(validateApplicationHistoryOperationResult(redoC), true);
  assert.equal(Object.isFrozen(redoC), true);

  assert.equal(afterC.revision, 2);
  assert.equal(afterC.character.identity.name, "C");
});

test("returns no-op when the requested stack is empty", () => {
  const initial = baseSession();
  const undo = undoApplicationSession(initial, {
    expectedRevision: 0,
    operationId: "undo-empty",
    now: "2026-06-22T13:20:00.000Z",
  });
  const redo = redoApplicationSession(initial, {
    expectedRevision: 0,
    operationId: "redo-empty",
    now: "2026-06-22T13:20:01.000Z",
  });

  assert.equal(undo.status, "no-op");
  assert.equal(redo.status, "no-op");
  assert.equal(undo.session, initial);
  assert.equal(redo.session, initial);
  assert.equal(undo.receipt.revision, 0);
  assert.equal(redo.receipt.revision, 0);
});

test("rejects stale revisions without moving either stack", () => {
  const afterB = rename(baseSession(), "B", "command-b");
  const result = undoApplicationSession(afterB, {
    expectedRevision: 0,
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.session, afterB);
  assert.equal(result.receipt, null);
  assert.equal(result.diagnostics[0].code, "application-history-stale-revision");
  assert.equal(afterB.history.length, 1);
  assert.equal(afterB.future.length, 0);
});

test("a new command after undo clears the redo branch", () => {
  const afterB = rename(baseSession(), "B", "command-b");
  const afterC = rename(afterB, "C", "command-c");
  const undone = undoApplicationSession(afterC, {
    expectedRevision: 2,
    operationId: "undo-c",
    now: "2026-06-22T13:30:00.000Z",
  });
  const branched = rename(undone.session, "D", "command-d");
  const redo = redoApplicationSession(branched, {
    expectedRevision: 4,
  });

  assert.equal(branched.character.identity.name, "D");
  assert.equal(branched.history.length, 2);
  assert.equal(branched.future.length, 0);
  assert.equal(redo.status, "no-op");
  assert.equal(redo.session, branched);
});

test("fails atomically when revision is exhausted", () => {
  const entry = createApplicationHistoryEntry({
    id: "transition-exhausted",
    commandId: "command-b",
    commandType: "character.rename",
    issuedAt: "2026-06-22T13:00:00.000Z",
    appliedAt: "2026-06-22T13:00:01.000Z",
    beforeRevision: 0,
    afterRevision: 1,
    beforeCharacter: character("A"),
    afterCharacter: character("B"),
    commandPayload: { name: "B" },
    receipt: { status: "applied" },
  });
  const exhausted = createApplicationSession({
    id: "session-exhausted-history",
    revision: Number.MAX_SAFE_INTEGER,
    character: character("B"),
    history: [entry],
  });
  const result = undoApplicationSession(exhausted, {
    expectedRevision: Number.MAX_SAFE_INTEGER,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.session, exhausted);
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics[0].message, /revision exhausted/);
});

test("publishes canonical history operation statuses", () => {
  assert.deepEqual(getApplicationHistoryOperationStatuses(), [
    "undone",
    "redone",
    "no-op",
    "rejected",
    "failed",
  ]);
});
