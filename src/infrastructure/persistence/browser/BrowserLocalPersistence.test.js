import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../../domain/character/Character.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../application/session/ApplicationSession.js";
import { validateCharacterRepository } from "../../../application/ports/RepositoryPorts.js";
import {
  createBrowserLocalCharacterRepository,
  createBrowserLocalSessionRepository,
  createSingularCharacterExport,
  inspectBrowserLocalPersistence,
  parseSingularCharacterExport,
} from "./BrowserLocalPersistence.js";

function createMemoryStorage(initialEntries = []) {
  const values = new Map(initialEntries);
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    entries() {
      return [...values.entries()].sort(([a], [b]) => a.localeCompare(b));
    },
  };
}

function character(id, name = id) {
  return createCharacter({
    identity: { id, name },
    metadata: {
      createdAt: "2026-06-26T17:30:00.000Z",
      updatedAt: "2026-06-26T17:30:00.000Z",
      source: "test",
    },
  });
}

function session(id, sourceCharacter = character("character-session")) {
  return createApplicationSession({
    id,
    character: sourceCharacter,
  });
}

test("persists Characters through an injected browser storage adapter", async () => {
  const storage = createMemoryStorage();
  const firstRepository = createBrowserLocalCharacterRepository({
    storage,
    namespace: "test.character",
  });
  const original = character("character-browser", "Browser");

  await firstRepository.save(original);
  const secondRepository = createBrowserLocalCharacterRepository({
    storage,
    namespace: "test.character",
  });
  const loaded = await secondRepository.load("character-browser");

  assert.equal(validateCharacterRepository(firstRepository), true);
  assert.equal(Object.isFrozen(firstRepository), true);
  assert.notEqual(loaded, original);
  assert.deepEqual(serializeCharacter(loaded), serializeCharacter(original));
  assert.deepEqual(await secondRepository.listIds(), ["character-browser"]);
  assert.equal(Object.isFrozen(await secondRepository.listIds()), true);
});

test("persists Sessions and restores the last valid saved session", async () => {
  const storage = createMemoryStorage();
  const repository = createBrowserLocalSessionRepository({
    storage,
    namespace: "test.session",
  });
  const first = session("session-first", character("character-first"));
  const second = session("session-second", character("character-second"));

  await repository.save(first);
  await repository.save(second);
  const last = await repository.loadLastSession();

  assert.deepEqual(await repository.listIds(), ["session-first", "session-second"]);
  assert.deepEqual(serializeApplicationSession(last), serializeApplicationSession(second));

  assert.equal(await repository.remove("session-second"), true);
  assert.equal(await repository.loadLastSession(), null);
  assert.deepEqual(await repository.listIds(), ["session-first"]);
});

test("isolates namespaces and removes records deterministically", async () => {
  const storage = createMemoryStorage();
  const alpha = createBrowserLocalCharacterRepository({ storage, namespace: "alpha" });
  const beta = createBrowserLocalCharacterRepository({ storage, namespace: "beta" });

  await alpha.save(character("shared", "Alpha"));
  await beta.save(character("shared", "Beta"));

  assert.equal((await alpha.load("shared")).identity.name, "Alpha");
  assert.equal((await beta.load("shared")).identity.name, "Beta");
  assert.equal(await alpha.remove("shared"), true);
  assert.equal(await alpha.remove("shared"), false);
  assert.equal(await alpha.load("shared"), null);
  assert.equal((await beta.load("shared")).identity.name, "Beta");
});

test("does not destroy a valid saved record when an indexed sibling is corrupt", async () => {
  const storage = createMemoryStorage();
  const repository = createBrowserLocalCharacterRepository({
    storage,
    namespace: "test.corrupt",
  });

  await repository.save(character("valid"));
  storage.setItem("test.corrupt:v1:character:index", JSON.stringify(["corrupt", "valid"]));
  storage.setItem("test.corrupt:v1:character:corrupt", "{not-json");

  const valid = await repository.load("valid");
  const missing = await repository.load("corrupt");
  const inspection = inspectBrowserLocalPersistence({
    storage,
    namespace: "test.corrupt",
  });

  assert.equal(valid.identity.id, "valid");
  assert.equal(missing, null);
  assert.equal(inspection.characterIds.includes("valid"), true);
  assert.equal(
    inspection.diagnostics.some(diagnostic => diagnostic.code === "unreadable-indexed-record"),
    true,
  );
});

test("exports and imports the own SINGULAR Character JSON format", () => {
  const original = character("character-export", "Exportável");
  const document = createSingularCharacterExport(original, {
    exportedAt: "2026-06-26T17:40:00.000Z",
  });
  const parsed = parseSingularCharacterExport(JSON.stringify(document));

  assert.equal(Object.isFrozen(document), true);
  assert.equal(document.format, "singular-character-export");
  assert.equal(document.version, 1);
  assert.equal(parsed.status, "accepted");
  assert.deepEqual(
    serializeCharacter(parsed.character),
    serializeCharacter(original),
  );
});

test("rejects invalid export documents with portable diagnostics", () => {
  const invalidJson = parseSingularCharacterExport("{broken");
  const invalidFormat = parseSingularCharacterExport({
    format: "other",
    version: 1,
    character: {},
  });

  assert.equal(invalidJson.status, "rejected");
  assert.equal(invalidJson.character, null);
  assert.equal(invalidJson.diagnostics[0].code, "invalid-json");
  assert.equal(Object.isFrozen(invalidJson.diagnostics[0]), true);

  assert.equal(invalidFormat.status, "rejected");
  assert.equal(
    invalidFormat.diagnostics.some(diagnostic => diagnostic.code === "invalid-format"),
    true,
  );
});

test("rejects invalid storage and ids without mutating shared contracts", async () => {
  assert.throws(
    () => createBrowserLocalCharacterRepository({ storage: {} }),
    /storage getItem must be a function/,
  );
  assert.throws(
    () => createBrowserLocalCharacterRepository({ storage: createMemoryStorage(), namespace: "" }),
    /namespace must be a non-empty string/,
  );

  const repository = createBrowserLocalSessionRepository({
    storage: createMemoryStorage(),
    namespace: "test.invalid",
  });
  await assert.rejects(() => repository.load(""), /id must be a non-empty string/);
  await assert.rejects(() => repository.save({}), /Application session/);
});
