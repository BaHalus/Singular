import test from "node:test";
import assert from "node:assert/strict";

import { createAlphaCommandCatalogEntries } from "../../../src/application/alpha/AlphaCommandCatalog.js";
import { createCommandRegistry } from "../../../src/application/commands/CommandRegistry.js";
import { executeCommand } from "../../../src/application/commands/CommandExecutor.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../src/application/session/ApplicationSession.js";
import { createCharacter } from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T15:00:00.000Z";
const PROCESSED_AT = "2026-06-28T15:00:01.000Z";

function createRuntime() {
  let next = 1;
  return {
    clock: { now: () => PROCESSED_AT },
    idGenerator: { next: prefix => `${prefix}_${next++}` },
  };
}

function createAppliedSnapshot() {
  const session = createApplicationSession({
    id: "session-alpha-corruption-boundary",
    character: createCharacter({
      identity: { id: "character-alpha-corruption-boundary", name: "Alpha Corruption Boundary" },
    }),
  });
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const result = executeCommand(
    session,
    {
      id: "command-alpha-corruption-boundary-note-add",
      type: "note.add",
      expectedRevision: session.revision,
      issuedAt: ISSUED_AT,
      payload: { note: { id: "note-alpha-corruption-boundary", title: "Note", text: "safe" } },
    },
    registry,
    createRuntime(),
  );

  assert.equal(result.status, "applied");
  return serializeApplicationSession(result.session);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("ApplicationSession rejects corrupted history fingerprints without mutating the valid snapshot", () => {
  const valid = createAppliedSnapshot();
  const corrupted = clone(valid);
  corrupted.history[0].afterFingerprint = "00000000";

  assert.throws(
    () => createApplicationSession(corrupted),
    /afterFingerprint is inconsistent/,
  );
  assert.deepEqual(serializeApplicationSession(createApplicationSession(valid)), valid);
});

test("ApplicationSession rejects disconnected current character snapshots", () => {
  const valid = createAppliedSnapshot();
  const corrupted = clone(valid);
  corrupted.character.notes.structured[0].text = "corrupted outside history";

  assert.throws(
    () => createApplicationSession(corrupted),
    /Application history does not match current character/,
  );
});

test("ApplicationSession rejects history entries duplicated between history and future", () => {
  const valid = createAppliedSnapshot();
  const corrupted = clone(valid);
  corrupted.future = [clone(corrupted.history[0])];

  assert.throws(
    () => createApplicationSession(corrupted),
    /cannot exist in history and future/,
  );
});
