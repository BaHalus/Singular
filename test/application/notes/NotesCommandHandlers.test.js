import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "../../../src/domain/character/Character.js";
import { createApplicationSession } from "../../../src/application/session/ApplicationSession.js";
import { createCommandRegistry } from "../../../src/application/commands/CommandRegistry.js";
import { executeCommand } from "../../../src/application/commands/CommandExecutor.js";
import {
  createNotesCommandHandlerEntries,
  NOTES_COMMAND_TYPES,
} from "../../../src/application/notes/NotesCommandHandlers.js";

function createRuntime() {
  let id = 0;
  return {
    clock: { now: () => "2026-06-27T23:00:00.000Z" },
    idGenerator: { next: prefix => `${prefix}_${++id}` },
  };
}

function createSession(characterInput = {}) {
  return createApplicationSession({
    id: "session-notes-test",
    character: createCharacter({
      identity: { id: "char-notes-test", name: "Notes Test", concept: "", playerId: null, campaignId: null },
      ...characterInput,
    }),
  });
}

function execute(session, commandInput, runtime = createRuntime()) {
  return executeCommand(
    session,
    {
      id: `cmd-${commandInput.type}-${session.revision}`,
      type: commandInput.type,
      expectedRevision: session.revision,
      issuedAt: "2026-06-27T23:00:00.000Z",
      payload: commandInput.payload,
    },
    createCommandRegistry(createNotesCommandHandlerEntries()),
    runtime,
  );
}

test("APP-NOTES preserves default notes in Character snapshots", () => {
  const character = createCharacter({ identity: { id: "char-default-notes", name: "Default Notes", concept: "", playerId: null, campaignId: null } });
  assert.deepEqual(serializeCharacter(character).notes, { general: "", structured: [] });
});

test("notes.general.set updates general notes through CommandExecutor", () => {
  const session = createSession();
  const result = execute(session, {
    type: NOTES_COMMAND_TYPES.SET_GENERAL,
    payload: { text: "Campaign log line" },
  });

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.character.notes.general, "Campaign log line");
  assert.equal(result.session.character.notes.structured.length, 0);
  assert.equal(result.receipt.domainReceipt.operation, "set-general-notes");
});

test("note.add, note.update, note.reorder and note.remove preserve structured note order", () => {
  let session = createSession();
  const runtime = createRuntime();
  let result = execute(session, {
    type: NOTES_COMMAND_TYPES.ADD_STRUCTURED,
    payload: { note: { id: "note-a", title: "A", text: "first", category: "scene", tags: ["alpha"], metadata: { source: "manual" } } },
  }, runtime);
  assert.equal(result.status, "applied");
  session = result.session;

  result = execute(session, {
    type: NOTES_COMMAND_TYPES.ADD_STRUCTURED,
    payload: { note: { id: "note-b", title: "B", text: "second" } },
  }, runtime);
  assert.equal(result.status, "applied");
  session = result.session;

  result = execute(session, {
    type: NOTES_COMMAND_TYPES.UPDATE_STRUCTURED,
    payload: { noteId: "note-a", patch: { text: "first updated", metadata: { source: "manual", revised: true } } },
  }, runtime);
  assert.equal(result.status, "applied");
  assert.equal(result.session.character.notes.structured[0].text, "first updated");
  assert.deepEqual(result.session.character.notes.structured[0].metadata, { source: "manual", revised: true });
  session = result.session;

  result = execute(session, {
    type: NOTES_COMMAND_TYPES.REORDER_STRUCTURED,
    payload: { noteId: "note-b", targetIndex: 0 },
  }, runtime);
  assert.equal(result.status, "applied");
  assert.deepEqual(result.session.character.notes.structured.map(note => note.id), ["note-b", "note-a"]);
  session = result.session;

  result = execute(session, {
    type: NOTES_COMMAND_TYPES.REMOVE_STRUCTURED,
    payload: { noteId: "note-b" },
  }, runtime);
  assert.equal(result.status, "applied");
  assert.deepEqual(result.session.character.notes.structured.map(note => note.id), ["note-a"]);
});

test("note.update no-ops when patch keeps the same portable value", () => {
  const session = createSession({
    notes: { general: "", structured: [{ id: "note-same", title: "Same", text: "text" }] },
  });
  const result = execute(session, {
    type: NOTES_COMMAND_TYPES.UPDATE_STRUCTURED,
    payload: { noteId: "note-same", patch: { text: "text" } },
  });
  assert.equal(result.status, "no-op");
  assert.equal(result.session.revision, 0);
});

test("APP-NOTES rejects non-portable structured note metadata without mutating session", () => {
  const session = createSession({
    notes: { general: "", structured: [{ id: "note-safe", title: "Safe", text: "safe" }] },
  });
  const result = execute(session, {
    type: NOTES_COMMAND_TYPES.UPDATE_STRUCTURED,
    payload: { noteId: "note-safe", patch: { metadata: { bad: Number.NaN } } },
  });

  assert.equal(result.status, "failed");
  assert.deepEqual(result.session.character.notes.structured[0].metadata, {});
});

test("APP-NOTES rejects unsupported payload properties", () => {
  const session = createSession();
  const result = execute(session, {
    type: NOTES_COMMAND_TYPES.SET_GENERAL,
    payload: { text: "ok", richText: "<b>no</b>" },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.session.character.notes.general, "");
});
