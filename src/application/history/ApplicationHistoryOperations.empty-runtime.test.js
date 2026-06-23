import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  redoApplicationSession,
  undoApplicationSession,
  validateApplicationHistoryOperationResult,
} from "./ApplicationHistoryOperations.js";
import { createApplicationSession } from "../session/ApplicationSession.js";

function baseSession() {
  return createApplicationSession({
    id: "session-empty-history-runtime",
    revision: 0,
    character: createCharacter({
      identity: {
        id: "character-empty-history-runtime",
        name: "A",
      },
      metadata: {
        createdAt: "2026-06-22T13:00:00.000Z",
        updatedAt: "2026-06-22T13:00:00.000Z",
        source: "test",
      },
    }),
  });
}

test("fails atomically when undo cannot generate a no-op receipt ID", () => {
  const initial = baseSession();
  const result = undoApplicationSession(initial, {
    expectedRevision: 0,
  }, {
    clock: {
      now: () => "2026-06-22T13:10:00.000Z",
    },
    idGenerator: {
      next: () => {
        throw new Error("ID generator exhausted");
      },
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.session, initial);
  assert.equal(result.receipt, null);
  assert.deepEqual(result.diagnostics, [{
    code: "application-history-undo-failed",
    severity: "blocked",
    message: "ID generator exhausted",
  }]);
  assert.equal(validateApplicationHistoryOperationResult(result), true);
  assert.equal(Object.isFrozen(result), true);
});

test("fails atomically when redo receives an invalid no-op receipt timestamp", () => {
  const initial = baseSession();
  const result = redoApplicationSession(initial, {
    expectedRevision: 0,
  }, {
    clock: {
      now: () => "not-a-timestamp",
    },
    idGenerator: {
      next: prefix => `${prefix}:1`,
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.session, initial);
  assert.equal(result.receipt, null);
  assert.deepEqual(result.diagnostics, [{
    code: "application-history-redo-failed",
    severity: "blocked",
    message: "Clock now must return a valid timestamp or Date",
  }]);
  assert.equal(validateApplicationHistoryOperationResult(result), true);
  assert.equal(Object.isFrozen(result), true);
});
