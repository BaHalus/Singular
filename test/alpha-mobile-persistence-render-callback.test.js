import test from "node:test";
import assert from "node:assert/strict";

import {
  mountAlphaMobilePersistenceUi,
} from "../src/ui/mobile/AlphaMobilePersistenceUi.js";

test("mounted persistence external render receives ui and mode during mount and actions", async () => {
  const root = createRoot({ "data-mode": "table" });
  const persistence = createPersistenceCoordinator();
  const renders = [];

  await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    render({ ui, mode }) {
      const state = ui.getState();
      renders.push({ mode, feedback: state.feedback, savedSessions: state.savedSessions.length });
      root.innerHTML = `${mode}:${state.feedback}:${state.savedSessions.length}`;
    },
  });

  assert.deepEqual(renders, [
    { mode: "table", feedback: "Persistência local pronta.", savedSessions: 0 },
    { mode: "table", feedback: "Nenhuma sessão anterior válida foi restaurada.", savedSessions: 1 },
  ]);

  await root.dispatch("click", { target: { dataset: { action: "persistence-save" } } });

  assert.deepEqual(renders.at(-1), {
    mode: "table",
    feedback: "Sessão salva: session-1",
    savedSessions: 2,
  });
  assert.equal(root.innerHTML, "table:Sessão salva: session-1:2");
});

test("mounted persistence destroy removes its listener before remount", async () => {
  const root = createRoot({ "data-mode": "creation" });
  const persistence = createPersistenceCoordinator();
  let renderCount = 0;

  const first = await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    render() {
      renderCount += 1;
    },
  });
  first.destroy();

  const second = await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    render() {
      renderCount += 1;
    },
  });

  const mountedRenderCount = renderCount;
  await root.dispatch("click", { target: { dataset: { action: "persistence-save" } } });
  assert.equal(renderCount, mountedRenderCount + 1);

  second.destroy();
  await root.dispatch("click", { target: { dataset: { action: "persistence-save" } } });
  assert.equal(renderCount, mountedRenderCount + 1);
});

test("mounted persistence external render preserves composed controls after actions", async () => {
  const root = createRoot({ "data-mode": "creation" });
  const persistence = createPersistenceCoordinator();
  const composedControls = [
    '<button type="button" data-action="trait-add">Adicionar traço</button>',
    '<button type="button" data-action="skill-add">Adicionar perícia</button>',
  ].join("");

  await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    render({ ui, mode }) {
      root.innerHTML = `${ui.render({ mode })}${composedControls}`;
    },
  });

  assert.match(root.innerHTML, /data-action="trait-add"/);
  assert.match(root.innerHTML, /data-action="skill-add"/);

  await root.dispatch("click", { target: { dataset: { action: "persistence-save" } } });

  assert.match(root.innerHTML, /Sessão salva: session-1/);
  assert.match(root.innerHTML, /data-action="trait-add"/);
  assert.match(root.innerHTML, /data-action="skill-add"/);
});

function createRoot(attributes = {}) {
  const listeners = new Map();
  return {
    innerHTML: "",
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    getAttribute(name) {
      return attributes[name] ?? null;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
}

function createPersistenceCoordinator() {
  const activeSession = Object.freeze({
    id: "session-1",
    revision: "1",
    character: Object.freeze({ identity: Object.freeze({ id: "character-1", name: "Test" }) }),
  });
  let listingCount = 0;

  return Object.freeze({
    getActiveSession() {
      return activeSession;
    },
    async initialize() {
      return Object.freeze({
        status: "fresh",
        changed: false,
        activeSessionId: activeSession.id,
        diagnostics: [],
        data: {},
      });
    },
    async listSavedSessions() {
      listingCount += 1;
      return Object.freeze({
        status: "listed",
        changed: false,
        activeSessionId: activeSession.id,
        diagnostics: [],
        data: {
          sessions: Array.from({ length: listingCount }, (_, index) => Object.freeze({
            id: `saved-${index + 1}`,
            status: "available",
            characterName: `Saved ${index + 1}`,
          })),
        },
      });
    },
    async saveActiveSession() {
      return Object.freeze({
        status: "saved",
        changed: true,
        activeSessionId: activeSession.id,
        diagnostics: [],
        data: {},
      });
    },
    async openSession(sessionId) {
      return Object.freeze({
        status: "opened",
        changed: true,
        activeSessionId: sessionId,
        diagnostics: [],
        data: {},
      });
    },
    async removeSession(sessionId) {
      return Object.freeze({
        status: "removed",
        changed: true,
        activeSessionId: activeSession.id,
        diagnostics: [],
        data: { sessionId },
      });
    },
    exportActiveCharacter() {
      return Object.freeze({
        status: "exported",
        changed: false,
        activeSessionId: activeSession.id,
        diagnostics: [],
        data: { filename: "character.json", json: "{}" },
      });
    },
    importCharacter() {
      return Object.freeze({
        status: "imported",
        changed: true,
        activeSessionId: "imported-session",
        diagnostics: [],
        data: {},
      });
    },
  });
}
