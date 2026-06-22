import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createApplicationSession,
  nextApplicationSessionRevision,
  serializeApplicationSession,
  validateApplicationSession,
} from "./ApplicationSession.js";

function baseCharacter() {
  return createCharacter({
    identity: {
      id: "character-application-session",
      name: "Application Session",
    },
  });
}

function completeInput() {
  return {
    id: "session-a",
    revision: 7,
    character: baseCharacter(),
    history: [{
      commandId: "command-previous",
      payload: { path: ["identity", "name"] },
    }],
    future: [{
      commandId: "command-undone",
      payload: { value: "Previous name" },
    }],
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
  const character = baseCharacter();
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

test("defensively clones and deeply freezes session state", () => {
  const input = completeInput();
  const session = createApplicationSession(input);

  input.history[0].payload.path.push("mutated");
  input.future[0].payload.value = "Mutated";
  input.lastReceipt.result.status = "mutated";
  input.metadata.tags.push("mutated");
  input.character.identity.name = "Mutated character";

  assert.deepEqual(session.history[0].payload.path, ["identity", "name"]);
  assert.equal(session.future[0].payload.value, "Previous name");
  assert.equal(session.lastReceipt.result.status, "applied");
  assert.deepEqual(session.metadata.tags, ["application", "session"]);
  assert.equal(session.character.identity.name, "Application Session");

  assert.equal(Object.isFrozen(session), true);
  assert.equal(Object.isFrozen(session.character), true);
  assert.equal(Object.isFrozen(session.history), true);
  assert.equal(Object.isFrozen(session.history[0].payload.path), true);
  assert.equal(Object.isFrozen(session.metadata.tags), true);
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

  serialized.history[0].payload.path.push("serialized-only");
  serialized.metadata.tags.push("serialized-only");
  serialized.character.identity.name = "Serialized only";

  assert.deepEqual(session.history[0].payload.path, ["identity", "name"]);
  assert.deepEqual(session.metadata.tags, ["application", "session"]);
  assert.equal(session.character.identity.name, "Application Session");
});

test("validates structural invariants without introducing domain rules", () => {
  const valid = createApplicationSession(completeInput());

  assert.equal(validateApplicationSession(valid), true);
  assert.throws(
    () => createApplicationSession({ character: baseCharacter() }),
    /id must be a non-empty string/,
  );
  assert.throws(
    () => createApplicationSession({
      id: "session-invalid-revision",
      revision: -1,
      character: baseCharacter(),
    }),
    /revision must be a non-negative safe integer/,
  );
  assert.throws(
    () => createApplicationSession({
      id: "session-invalid-history",
      character: baseCharacter(),
      history: ["not-a-record"],
    }),
    /history\[0\] must be a plain object/,
  );
  assert.throws(
    () => createApplicationSession({
      id: "session-invalid-dirty",
      character: baseCharacter(),
      dirty: "yes",
    }),
    /dirty must be boolean/,
  );
});

test("rejects cyclic application records", () => {
  const metadata = {};
  metadata.self = metadata;

  assert.throws(
    () => createApplicationSession({
      id: "session-cyclic-metadata",
      character: baseCharacter(),
      metadata,
    }),
    /must not contain cycles/,
  );
});

test("advances revisions monotonically without mutating the session", () => {
  const session = createApplicationSession({
    id: "session-revision",
    revision: 41,
    character: baseCharacter(),
  });

  assert.equal(nextApplicationSessionRevision(session), 42);
  assert.equal(session.revision, 41);

  const exhausted = createApplicationSession({
    id: "session-exhausted",
    revision: Number.MAX_SAFE_INTEGER,
    character: baseCharacter(),
  });
  assert.throws(
    () => nextApplicationSessionRevision(exhausted),
    /revision exhausted/,
  );
});
