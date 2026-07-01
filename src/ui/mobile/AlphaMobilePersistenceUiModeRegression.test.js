import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import { createAlphaMobilePersistenceBootstrap } from "../../application/bootstrap/AlphaMobilePersistenceBootstrap.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
}

function createRoot(initialMode = "table") {
  const listeners = new Map();
  const attributes = new Map([["data-mode", initialMode]]);
  return {
    listeners,
    innerHTML: "",
    addEventListener(type, listener) { listeners.set(type, listener); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector() { return { value: "" }; },
    setAttribute(name, value) { attributes.set(name, value); },
  };
}

function createApp() {
  const character = createCharacter({
    identity: { id: "character-table-mode", name: "Ayla", concept: "Exploradora" },
    metadata: {
      createdAt: "2026-07-01T16:55:00.000Z",
      updatedAt: "2026-07-01T16:55:00.000Z",
      source: "test",
    },
  });
  return createAlphaMobilePersistenceBootstrap({
    storage: createMemoryStorage(),
    namespace: "test.ui.persistence.mode",
    initialSession: createApplicationSession({ id: "session-table-mode", character }),
    runtime: {
      clock: { now: () => "2026-07-01T16:56:00.000Z" },
      idGenerator: { next: prefix => `${prefix}:table-mode` },
    },
  });
}

test("persistence actions preserve the executable sheet mode already mounted on the root", async () => {
  const app = createApp();
  const root = createRoot("table");

  await mountAlphaMobilePersistenceUi({ root, persistence: app.persistence, downloadText: () => {} });

  assert.equal(root.getAttribute("data-mode"), "table");
  assert.doesNotMatch(root.innerHTML, /data-role="character-name"/);

  await root.listeners.get("click")({
    target: { dataset: { action: "persistence-save" }, parentElement: null },
  });

  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Sessão salva/);
  assert.doesNotMatch(root.innerHTML, /data-role="character-name"/);
});

test("mounted persistence UI can use the application mode reader during rerenders", async () => {
  const app = createApp();
  const root = createRoot("creation");
  let mode = "table";

  await mountAlphaMobilePersistenceUi({
    root,
    persistence: app.persistence,
    downloadText: () => {},
    getMode: () => mode,
  });

  assert.equal(root.getAttribute("data-mode"), "table");
  mode = "creation";

  await root.listeners.get("click")({
    target: { dataset: { action: "persistence-refresh" }, parentElement: null },
  });

  assert.equal(root.getAttribute("data-mode"), "creation");
  assert.match(root.innerHTML, /data-role="character-name"/);
});
