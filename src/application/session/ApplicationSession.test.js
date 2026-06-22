import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createApplicationHistoryEntry,
  serializeApplicationHistory,
} from "../history/ApplicationHistory.js";
import {
  createApplicationSession,
  nextApplicationSessionRevision,
  serializeApplicationSession,
  validateApplicationSession,
} from "./ApplicationSession.js";

function namedCharacter(name = "Application Session") {
  return createCharacter({
    identity: {
      id: "character-application-session",
      name,
    },
    metadata: {
      createdAt: "2026-06-22T12:00:00.000Z",
      updatedAt: "2026-06-22T12:00:00.000Z",
      source: "test",
    },
  });
}

function historyEntry(input = {}) {
  return createApplicationHistoryEntry({
    id: input.id ?? "transition-history",
    commandId: input.commandId ?? "command-previous",
    commandType: "character.rename",
    issuedAt: "2026-06-22T12:00:00.000Z",
    appliedAt: "2026-06-22T12:00:01.000Z",
    beforeRevision: input.beforeRevision ?? 5,
    afterRevision: input.afterRevision ?? 6,
    beforeCharacter: input.beforeCharacter ?? namedCharacter("Before"),
    afterCharacter: input.afterCharacter ?? namedCharacter(),
    commandPayload: input.commandPayload ?? {
      path: ["identity", "name"],
    },
    receipt: { status: "applied" },
  });
}

function futureEntry() {
  return historyEntry({
    id: "transition-future",
    commandId: "command-undone",
    beforeRevision: 6,
    afterRevision: 7,
    beforeCharacter: namedCharacter(),
    afterCharacter: namedCharacter("Future"),
    commandPayload: { value: "Future" },
  });
}

function mutableEntry(entry) {
  return serializeApplicationHistory([entry])[0];
}

function completeInput() {
  return {
    id: "session-a",
    revision: 7,
    character: structuredClone(serializeCharacter(namedCharacter())),
    history: [mutableEntry(historyEntry())],
    future: [mutableEntry(futureEntry())],
    dirty: true,
    lastReceipt: {
      commandId: "command-current",
      result: { status: "applied" },
    },
    metadata: {
      source: "unit-test",
      tags: ["application", "session"],
    },
  };
}

test("creates a canonical session with safe defaults", () => {
  const character = namedCharacter();
  const session = createApplicationSession({
    id: "session-defaults",
    character,
  });

  assert.equal(session.id, "session-defaults");
  assert.equal(session.revision, 0);
  assert.notEqual(session.character, character);
  assert.deepEqual(
    serializeCharacter(session.character),
    serializeCharacter(character),
  );
  assert.deepEqual(session.history, []);
  assert.deepEqual(session.future, []);
  assert.equal(session.dirty, false);
  assert.equal(session.lastReceipt, null);
  assert.deepEqual(session.metadata, {});
  assert.equal(validateApplicationSession(session), true);
});

test("defensively clones and deeply freezes canonical session state", () => {
  const input = completeInput();
  const session = createApplicationSession(input);

  input.history[0].commandPayload.path.push("mutated");
  input.future[0].commandPayload.value = "Mutated";
  input.lastReceipt.result.status = "mutated";
  input.metadata.tags.push("mutated");
  input.character.identity.name = "Mutated character";

  assert.deepEqual(
    session.history[0].commandPayload.path,
    ["identity", "name"],
  );
  assert.equal(session.future[0].commandPayload.value, "Future");
  assert.equal(session.lastReceipt.result.status, "applied");
  assert.deepEqual(session.metadata.tags, ["application", "session"]);
  assert.equal(session.character.identity.name, "Application Session");
  assert.equal(Object.isFrozen(session), true);
  assert.equal(Object.isFrozen(session.history[0].beforeCharacter), true);
  assert.throws(() => session.metadata.tags.push("blocked"), TypeError);
});

test("serializes to a detached application snapshot", () => {
  const session = createApplicationSession(completeInput());
  const serialized = serializeApplicationSession(session);

  assert.deepEqual(serialized, {
    id: "session-a",
    revision: 7,
    character: serializeCharacter(session.character),
    history: session.history,
    future: session.future,
    dirty: true,
    lastReceipt: session.lastReceipt,
    metadata: session.metadata,
  });

  serialized.history[0].commandPayload.path.push("serialized-only");
  serialized.metadata.tags.push("serialized-only");
  serialized.character.identity.name = "Serialized only";

  assert.deepEqual(
    session.history[0].commandPayload.path,
    ["identity", "name"],
  );
  assert.deepEqual(session.metadata.tags, ["application", "session"]);
  assert.equal(session.character.identity.name, "Application Session");
});

test("validates session structure and canonical history position", () => {
  const valid = createApplicationSession(completeInput());
  assert.equal(validateApplicationSession(valid), true);

  assert.throws(
    () => createApplicationSession({ character: namedCharacter() }),
    /id must be a non-empty string/,
  );
  assert.throws(
    () => createApplicationSession({
      id: "session-invalid-revision",
      revision: -1,
      character: namedCharacter(),
    }),
    /revision must be a non-negative safe integer/,
  );
  assert.throws(
    () => createApplicationSession({
      id: "session-invalid-history",
      character: namedCharacter(),
      history: ["not-a-record"],
    }),
    /Application history\[0\] must be a plain object/,
  );
  assert.throws(
    () => createApplicationSession({
      id: "session-mismatched-history",
      character: namedCharacter("Other"),
      history: [historyEntry()],
    }),
    /history does not match current character/,
  );
  assert.throws(
    () => createApplicationSession({
      id: "session-invalid-dirty",
      character: namedCharacter(),
      dirty: "yes",
    }),
    /dirty must be boolean/,
  );
});

test("rejects the same transition in history and future", () => {
  const entry = historyEntry();
  assert.throws(
    () => createApplicationSession({
      id: "session-duplicate-transition",
      character: namedCharacter(),
      history: [entry],
      future: [entry],
    }),
    /cannot exist in history and future/,
  );
});

test("rejects cyclic application records", () => {
  const metadata = {};
  metadata.self = metadata;

  assert.throws(
    () => createApplicationSession({
      id: "session-cyclic-metadata",
      character: namedCharacter(),
      metadata,
    }),
    /must not contain cycles/,
  );
});

test("advances revisions monotonically without mutating the session", () => {
  const session = createApplicationSession({
    id: "session-revision",
    revision: 41,
    character: namedCharacter(),
  });

  assert.equal(nextApplicationSessionRevision(session), 42);
  assert.equal(session.revision, 41);

  const exhausted = createApplicationSession({
    id: "session-exhausted",
    revision: Number.MAX_SAFE_INTEGER,
    character: namedCharacter(),
  });
  assert.throws(
    () => nextApplicationSessionRevision(exhausted),
    /revision exhausted/,
  );
});
