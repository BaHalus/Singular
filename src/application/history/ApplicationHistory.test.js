import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createApplicationHistory,
  createApplicationHistoryEntry,
  fingerprintApplicationCharacter,
  restoreCharacterFromHistorySnapshot,
  serializeApplicationHistory,
  validateApplicationHistoryPosition,
} from "./ApplicationHistory.js";

function namedCharacter(name) {
  return createCharacter({
    identity: {
      id: "character-history",
      name,
    },
    metadata: {
      createdAt: "2026-06-22T12:00:00.000Z",
      updatedAt: "2026-06-22T12:00:00.000Z",
      source: "test",
    },
  });
}

function transition(input = {}) {
  return createApplicationHistoryEntry({
    id: input.id ?? "transition-1",
    commandId: input.commandId ?? "command-1",
    commandType: input.commandType ?? "character.rename",
    issuedAt: input.issuedAt ?? "2026-06-22T12:00:00.000Z",
    appliedAt: input.appliedAt ?? "2026-06-22T12:00:01.000Z",
    beforeRevision: input.beforeRevision ?? 0,
    afterRevision: input.afterRevision ?? 1,
    beforeCharacter: input.beforeCharacter ?? namedCharacter("Antes"),
    afterCharacter: input.afterCharacter ?? namedCharacter("Depois"),
    commandPayload: input.commandPayload ?? { name: "Depois" },
    receipt: input.receipt ?? { status: "applied" },
  });
}

test("creates immutable transition snapshots with fingerprints", () => {
  const entry = transition();

  assert.equal(entry.schemaVersion, 1);
  assert.equal(entry.kind, "character-transition");
  assert.equal(
    entry.beforeFingerprint,
    fingerprintApplicationCharacter(namedCharacter("Antes")),
  );
  assert.equal(
    entry.afterFingerprint,
    fingerprintApplicationCharacter(namedCharacter("Depois")),
  );
  assert.equal(Object.isFrozen(entry), true);
  assert.equal(Object.isFrozen(entry.beforeCharacter), true);
  assert.equal(Object.isFrozen(entry.commandPayload), true);
});

test("serializes and restores detached validated characters", () => {
  const history = createApplicationHistory([transition()]);
  const serialized = serializeApplicationHistory(history);
  const restored = restoreCharacterFromHistorySnapshot(
    serialized[0].afterCharacter,
  );

  serialized[0].afterCharacter.identity.name = "Somente cópia";
  assert.equal(history[0].afterCharacter.identity.name, "Depois");
  assert.deepEqual(
    serializeCharacter(restored),
    history[0].afterCharacter,
  );
});

test("rejects altered fingerprints and non-unit original revisions", () => {
  const valid = transition();

  assert.throws(
    () => createApplicationHistoryEntry({
      ...serializeApplicationHistory([valid])[0],
      beforeFingerprint: "altered",
    }),
    /beforeFingerprint is inconsistent/,
  );
  assert.throws(
    () => transition({ beforeRevision: 1, afterRevision: 3 }),
    /revisions must describe one applied transition/,
  );
});

test("validates current position against history and future tops", () => {
  const first = transition({
    id: "transition-first",
    beforeRevision: 0,
    afterRevision: 1,
    beforeCharacter: namedCharacter("Zero"),
    afterCharacter: namedCharacter("Um"),
  });
  const second = transition({
    id: "transition-second",
    beforeRevision: 1,
    afterRevision: 2,
    beforeCharacter: namedCharacter("Um"),
    afterCharacter: namedCharacter("Dois"),
  });

  assert.equal(
    validateApplicationHistoryPosition(
      createApplicationHistory([first]),
      createApplicationHistory([second]),
      namedCharacter("Um"),
    ),
    true,
  );
  assert.throws(
    () => validateApplicationHistoryPosition(
      createApplicationHistory([first]),
      createApplicationHistory(),
      namedCharacter("Outro"),
    ),
    /history does not match current character/,
  );
  assert.throws(
    () => validateApplicationHistoryPosition(
      createApplicationHistory(),
      createApplicationHistory([second]),
      namedCharacter("Outro"),
    ),
    /future does not match current character/,
  );
});

test("rejects a disconnected history chain even when its top matches current", () => {
  const first = transition({
    id: "history-first",
    beforeRevision: 0,
    afterRevision: 1,
    beforeCharacter: namedCharacter("Zero"),
    afterCharacter: namedCharacter("Um"),
  });
  const disconnected = transition({
    id: "history-disconnected",
    beforeRevision: 1,
    afterRevision: 2,
    beforeCharacter: namedCharacter("Outro"),
    afterCharacter: namedCharacter("Dois"),
  });

  assert.throws(
    () => validateApplicationHistoryPosition(
      createApplicationHistory([first, disconnected]),
      createApplicationHistory(),
      namedCharacter("Dois"),
    ),
    /Application history transitions at indexes 0 and 1 are disconnected/,
  );
});

test("rejects a disconnected future chain even when its top matches current", () => {
  const disconnected = transition({
    id: "future-disconnected",
    beforeRevision: 1,
    afterRevision: 2,
    beforeCharacter: namedCharacter("Outro"),
    afterCharacter: namedCharacter("Dois"),
  });
  const next = transition({
    id: "future-next",
    beforeRevision: 0,
    afterRevision: 1,
    beforeCharacter: namedCharacter("Zero"),
    afterCharacter: namedCharacter("Um"),
  });

  assert.throws(
    () => validateApplicationHistoryPosition(
      createApplicationHistory(),
      createApplicationHistory([disconnected, next]),
      namedCharacter("Zero"),
    ),
    /Application future transitions at indexes 0 and 1 are disconnected/,
  );
});

test("rejects duplicate transition ids", () => {
  const first = transition({ id: "duplicate" });
  const second = transition({ id: "duplicate" });

  assert.throws(
    () => createApplicationHistory([first, second]),
    /Duplicate application history entry id/,
  );
});
