import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createApplicationHistoryEntry,
} from "../history/ApplicationHistory.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "./AlphaMobilePersistenceBootstrap.js";

function createMemoryStorage(initialEntries = []) {
  const values = new Map(initialEntries);
  let failure = null;
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      if (failure?.(String(key), String(value))) {
        throw new Error("storage write failed");
      }
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    failWritesWhen(predicate) {
      failure = predicate;
    },
    setRaw(key, value) {
      values.set(String(key), String(value));
    },
    entries() {
      return [...values.entries()].sort(([a], [b]) => a.localeCompare(b));
    },
  };
}

function character(id, name = id, updatedAt = "2026-06-26T18:00:00.000Z") {
  return createCharacter({
    identity: { id, name, concept: "Teste Alpha" },
    metadata: {
      createdAt: "2026-06-26T17:00:00.000Z",
      updatedAt,
      source: "test",
    },
  });
}

function session(id, sourceCharacter = character(`character-${id}`), extra = {}) {
  return createApplicationSession({
    id,
    character: sourceCharacter,
    ...extra,
  });
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-26T19:00:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:test-${sequence}`;
      },
    },
  };
}

function bootstrap(storage, initialSession, namespace = "test.alpha.integration") {
  return createAlphaMobilePersistenceBootstrap({
    storage,
    namespace,
    initialSession,
    runtime: runtime(),
  });
}

test("starts normally when no saved session or last-session pointer exists", async () => {
  const storage = createMemoryStorage();
  const initial = session("session-initial");
  const app = bootstrap(storage, initial);

  const result = await app.persistence.initialize();

  assert.equal(result.status, "started");
  assert.equal(result.changed, false);
  assert.equal(app.persistence.getActiveSession(), initial);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(Object.isFrozen(app.persistence), true);
  assert.equal(Object.isFrozen(app.repositories), true);
});

test("saves and restores the last valid ApplicationSession with independent snapshots", async () => {
  const storage = createMemoryStorage();
  const original = session("session-saved", character("character-saved", "Salvo"), {
    revision: 4,
    dirty: true,
    lastReceipt: { status: "applied", revision: 4 },
    metadata: { campaign: "alpha" },
  });
  const first = bootstrap(storage, original);

  const saved = await first.persistence.saveActiveSession();
  const second = bootstrap(storage, session("session-fallback"));
  const restored = await second.persistence.initialize();

  assert.equal(saved.status, "saved");
  assert.equal(restored.status, "restored");
  assert.equal(restored.activeSessionId, "session-saved");
  assert.notEqual(second.persistence.getActiveSession(), original);
  assert.deepEqual(
    serializeApplicationSession(second.persistence.getActiveSession()),
    serializeApplicationSession(original),
  );
});

test("keeps the initial session when the last-session pointer is absent or corrupt", async () => {
  const storage = createMemoryStorage();
  const initial = session("session-safe");
  const app = bootstrap(storage, initial, "test.corrupt-last");

  storage.setRaw("test.corrupt-last:v1:last-session", "{broken");
  const result = await app.persistence.initialize();

  assert.equal(result.status, "started");
  assert.equal(app.persistence.getActiveSession(), initial);
  assert.equal(result.diagnostics.some(item => item.code === "invalid-json"), true);
});

test("preserves the active session when storage fails during manual save", async () => {
  const storage = createMemoryStorage();
  const initial = session("session-write-failure");
  const app = bootstrap(storage, initial, "test.write-failure");
  storage.failWritesWhen(key => key.endsWith(":session:index"));

  const result = await app.persistence.saveActiveSession();

  assert.equal(result.status, "failed");
  assert.equal(app.persistence.getActiveSession(), initial);
  assert.equal(
    result.diagnostics.some(item => item.code === "local-persistence-save-failed"),
    true,
  );
  assert.equal(
    storage.entries().some(([key]) => key.includes(":session:record:")),
    false,
  );
});

test("rolls back a partial session record when the last-session pointer write fails", async () => {
  const storage = createMemoryStorage();
  const initial = session("session-pointer-failure");
  const app = bootstrap(storage, initial, "test.pointer-failure");
  storage.failWritesWhen(key => key.endsWith(":last-session"));

  const result = await app.persistence.saveActiveSession();

  assert.equal(result.status, "failed");
  assert.equal(app.persistence.getActiveSession(), initial);
  assert.deepEqual(await app.repositories.session.listIds(), []);
  assert.equal(await app.repositories.session.load("session-pointer-failure"), null);
  assert.equal(
    result.diagnostics.some(item =>
      item.code === "local-persistence-save-rollback-failed"),
    false,
  );
});

test("restores an existing snapshot without changing the previous last-session pointer", async () => {
  const storage = createMemoryStorage();
  const namespace = "test.pointer-preservation";
  const previousTarget = session(
    "session-target",
    character("character-target", "Versão anterior"),
    { revision: 1 },
  );
  const previousLast = session(
    "session-last",
    character("character-last", "Última sessão"),
    { revision: 2 },
  );

  const targetSeed = bootstrap(storage, previousTarget, namespace);
  await targetSeed.persistence.saveActiveSession();
  const lastSeed = bootstrap(storage, previousLast, namespace);
  await lastSeed.persistence.saveActiveSession();
  assert.equal(
    (await lastSeed.repositories.session.loadLastSession()).id,
    "session-last",
  );

  const updatedTarget = session(
    "session-target",
    character(
      "character-target",
      "Versão nova",
      "2026-06-26T18:10:00.000Z",
    ),
    { revision: 2, dirty: true },
  );
  const app = bootstrap(storage, updatedTarget, namespace);
  let pointerFailureInjected = false;
  storage.failWritesWhen(key => {
    if (!pointerFailureInjected && key.endsWith(":last-session")) {
      pointerFailureInjected = true;
      return true;
    }
    return false;
  });

  const result = await app.persistence.saveActiveSession();
  const restoredTarget = await app.repositories.session.load("session-target");
  const restoredLast = await app.repositories.session.loadLastSession();

  assert.equal(result.status, "failed");
  assert.deepEqual(
    serializeApplicationSession(restoredTarget),
    serializeApplicationSession(previousTarget),
  );
  assert.equal(restoredLast.id, "session-last");
  assert.deepEqual(
    serializeApplicationSession(restoredLast),
    serializeApplicationSession(previousLast),
  );
});

test("lists, opens and removes saved sessions without replacing on failed open", async () => {
  const storage = createMemoryStorage();
  const firstSession = session("session-first", character("character-first", "Primeiro"));
  const secondSession = session("session-second", character("character-second", "Segundo"));
  const firstApp = bootstrap(storage, firstSession, "test.open");
  await firstApp.persistence.saveActiveSession();
  const secondApp = bootstrap(storage, secondSession, "test.open");
  await secondApp.persistence.saveActiveSession();

  const listing = await secondApp.persistence.listSavedSessions();
  assert.equal(listing.status, "listed");
  assert.deepEqual(
    listing.data.sessions.map(item => item.id),
    ["session-first", "session-second"],
  );

  const opened = await secondApp.persistence.openSession("session-first");
  assert.equal(opened.status, "opened");
  assert.equal(secondApp.persistence.getActiveSession().character.identity.name, "Primeiro");

  const activeBeforeFailure = secondApp.persistence.getActiveSession();
  const failed = await secondApp.persistence.openSession("session-missing");
  assert.equal(failed.status, "rejected");
  assert.equal(secondApp.persistence.getActiveSession(), activeBeforeFailure);

  const removed = await secondApp.persistence.removeSession("session-second");
  assert.equal(removed.status, "removed");
  assert.deepEqual(
    (await secondApp.persistence.listSavedSessions()).data.sessions.map(item => item.id),
    ["session-first"],
  );
});

test("exports only the canonical SINGULAR Character document", () => {
  const storage = createMemoryStorage();
  const initial = session("session-export", character("character-export", "Ayla"));
  const app = bootstrap(storage, initial, "test.export");

  const result = app.persistence.exportActiveCharacter();
  const parsed = JSON.parse(result.data.json);

  assert.equal(result.status, "exported");
  assert.equal(parsed.format, "singular-character-export");
  assert.equal(parsed.version, 1);
  assert.deepEqual(parsed.character, serializeCharacter(initial.character));
  assert.equal(result.data.filename, "ayla.singular.json");
});

test("imports a valid SINGULAR document only after validation", () => {
  const storage = createMemoryStorage();
  const initial = session("session-before-import", character("before", "Antes"));
  const app = bootstrap(storage, initial, "test.import");
  const source = bootstrap(
    createMemoryStorage(),
    session("session-source", character("after", "Depois")),
    "test.import-source",
  );
  const document = source.persistence.exportActiveCharacter().data.json;

  const result = app.persistence.importCharacter(document);

  assert.equal(result.status, "imported");
  assert.equal(result.activeSessionId, "session:test-1");
  assert.equal(app.persistence.getActiveSession().character.identity.name, "Depois");
  assert.equal(app.persistence.getActiveSession().revision, 0);
  assert.deepEqual(app.persistence.getActiveSession().history, []);
  assert.equal(app.persistence.getActiveSession().dirty, true);
});

test("rejects invalid JSON and incompatible versions while preserving the active session", () => {
  const storage = createMemoryStorage();
  const initial = session("session-preserved");
  const app = bootstrap(storage, initial, "test.import-reject");

  const invalidJson = app.persistence.importCharacter("{broken");
  const incompatible = app.persistence.importCharacter(JSON.stringify({
    format: "singular-character-export",
    version: 999,
    character: serializeCharacter(initial.character),
  }));

  assert.equal(invalidJson.status, "rejected");
  assert.equal(incompatible.status, "rejected");
  assert.equal(
    incompatible.diagnostics.some(item => item.code === "unsupported-version"),
    true,
  );
  assert.equal(app.persistence.getActiveSession(), initial);
});

test("preserves revision, history and canonical Character data across persistence", async () => {
  const storage = createMemoryStorage();
  const before = character("character-history", "Antes", "2026-06-26T18:00:00.000Z");
  const after = character("character-history", "Depois", "2026-06-26T18:05:00.000Z");
  const entry = createApplicationHistoryEntry({
    id: "transition:1",
    commandId: "command:1",
    commandType: "identity.rename",
    issuedAt: "2026-06-26T18:04:00.000Z",
    appliedAt: "2026-06-26T18:05:00.000Z",
    beforeRevision: 0,
    afterRevision: 1,
    beforeCharacter: before,
    afterCharacter: after,
    commandPayload: { name: "Depois" },
    receipt: { status: "applied" },
  });
  const original = session("session-history", after, {
    revision: 1,
    history: [entry],
    future: [],
    dirty: true,
    lastReceipt: { status: "applied", revision: 1 },
  });
  const first = bootstrap(storage, original, "test.history");
  await first.persistence.saveActiveSession();
  const second = bootstrap(storage, session("fallback"), "test.history");

  await second.persistence.initialize();
  const restored = second.persistence.getActiveSession();

  assert.equal(restored.revision, 1);
  assert.equal(restored.history.length, 1);
  assert.equal(restored.history[0].commandId, "command:1");
  assert.deepEqual(
    serializeApplicationSession(restored),
    serializeApplicationSession(original),
  );
});
