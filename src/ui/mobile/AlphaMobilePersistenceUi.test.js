import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "../../application/bootstrap/AlphaMobilePersistenceBootstrap.js";
import {
  createAlphaMobilePersistenceUi,
  mountAlphaMobilePersistenceUi,
} from "./AlphaMobilePersistenceUi.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
}

function initialSession(id = "session-ui", name = "Ayla") {
  const character = createCharacter({
    identity: { id: `character-${id}`, name, concept: "Exploradora" },
    metadata: {
      createdAt: "2026-06-26T18:00:00.000Z",
      updatedAt: "2026-06-26T18:00:00.000Z",
      source: "test",
    },
  });
  return createApplicationSession({ id, character });
}

function application(storage = createMemoryStorage()) {
  let sequence = 0;
  return createAlphaMobilePersistenceBootstrap({
    storage,
    namespace: "test.ui.persistence",
    initialSession: initialSession(),
    runtime: {
      clock: { now: () => "2026-06-26T19:00:00.000Z" },
      idGenerator: {
        next(prefix) {
          sequence += 1;
          return `${prefix}:ui-${sequence}`;
        },
      },
    },
  });
}

test("renders the mobile sheet with save, open, export, import and diagnostics UI", async () => {
  const app = application();
  const downloads = [];
  const ui = createAlphaMobilePersistenceUi({
    persistence: app.persistence,
    downloadText: input => downloads.push(input),
  });

  await ui.initialize();
  const beforeSave = ui.render({ mode: "creation" });
  assert.match(beforeSave, /data-persistence-ready="true"/);
  assert.match(beforeSave, /data-action="persistence-save"/);
  assert.match(beforeSave, /data-action="persistence-refresh"/);
  assert.match(beforeSave, /data-action="persistence-export"/);
  assert.match(beforeSave, /data-action="persistence-import"/);
  assert.match(beforeSave, /data-role="persistence-import-json"/);

  await ui.save();
  const afterSave = ui.render({ mode: "table" });
  assert.match(afterSave, /data-action="persistence-open"/);
  assert.match(afterSave, /session-ui/);

  const exported = await ui.exportCharacter();
  assert.equal(exported.status, "exported");
  assert.equal(downloads.length, 1);
  assert.match(downloads[0].text, /singular-character-export/);
});

test("presents rejected import diagnostics without replacing the current sheet", async () => {
  const app = application();
  const ui = createAlphaMobilePersistenceUi({
    persistence: app.persistence,
    downloadText: () => {},
  });
  await ui.initialize();
  const activeBefore = app.persistence.getActiveSession();

  const result = await ui.importJson("{broken");
  const html = ui.render();

  assert.equal(result.status, "rejected");
  assert.equal(app.persistence.getActiveSession(), activeBefore);
  assert.match(html, /invalid-json/);
  assert.match(html, /Documento rejeitado/);
});

test("mounts an executable event bridge without exposing storage to the UI", async () => {
  const storage = createMemoryStorage();
  const app = application(storage);
  const listeners = new Map();
  const attributes = new Map();
  const root = {
    innerHTML: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    querySelector() {
      return { value: "" };
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };

  const ui = await mountAlphaMobilePersistenceUi({
    root,
    persistence: app.persistence,
    downloadText: () => {},
  });
  assert.match(root.innerHTML, /singular-alpha-mobile/);
  assert.equal(attributes.get("data-session-id"), "session-ui");

  await listeners.get("click")({
    target: {
      dataset: { action: "persistence-save" },
      parentElement: null,
    },
  });

  assert.equal(
    (await app.repositories.session.listIds()).includes("session-ui"),
    true,
  );
  assert.match(root.innerHTML, /Sessão salva/);
  assert.equal(ui.getState().busy, false);
});

test("the mobile UI source has no direct access to local browser storage", async () => {
  const source = await readFile(
    new URL("./AlphaMobilePersistenceUi.js", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /singular\.alpha\.local/);
  assert.doesNotMatch(source, /createBrowserLocalSessionRepository/);
});
