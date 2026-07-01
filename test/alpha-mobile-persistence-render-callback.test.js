import test from "node:test";
import assert from "node:assert/strict";

import {
  mountAlphaMobilePersistenceUi,
} from "../src/ui/mobile/AlphaMobilePersistenceUi.js";

test("mounted persistence external render receives ui and mode during mount and actions", async () => {
  const root = createRoot({ mode: "table" });
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

  await root.dispatch("click", { dataset: { action: "persistence-save" } });

  assert.deepEqual(renders.at(-1), {
    mode: "table",
    feedback: "Sessão salva: session-1",
    savedSessions: 2,
  });
  assert.equal(root.innerHTML, "table:Sessão salva: session-1:2");
});

function createRoot(attributes = {}) {
  const listeners = new Map();
  return {
    innerHTML: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    getAttribute(name) {
      return attributes[name] ?? null;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    async dispatch(type, event) {
      await listeners.get(type)?.(event);
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
