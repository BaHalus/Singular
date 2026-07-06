import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_A5_FULL_ACCEPTANCE_GATE.md";

function makeSession(id, name) {
  return createApplicationSession({
    id,
    character: createCharacter({
      identity: { id: `character-${id}`, name, concept: "Fluxo A5" },
      metadata: {
        createdAt: "2026-07-05T23:00:00.000Z",
        updatedAt: "2026-07-05T23:00:00.000Z",
        source: "a5-acceptance-test",
      },
    }),
  });
}

function createCoordinator() {
  const restored = makeSession("session-restored", "Restaurada");
  const opened = makeSession("session-opened", "Aberta");
  const imported = makeSession("session-imported", "Importada");
  const calls = [];
  let active = restored;
  let saves = [summary(restored), summary(opened), { id: "bad-record", status: "corrupted" }];

  return {
    calls,
    downloads: [],
    get saveIds() { return saves.map(save => save.id); },
    getActiveSession() { calls.push(`getActiveSession:${active.id}`); return active; },
    async initialize() {
      calls.push("initialize");
      active = restored;
      return result("restored", { restoredSessionId: restored.id });
    },
    async saveActiveSession() {
      calls.push(`saveActiveSession:${active.id}`);
      saves = [summary(active), { id: "autosave-restored", characterName: "Autosave Restaurada", status: "available" }, ...saves.filter(save => save.id !== active.id && save.id !== "autosave-restored")];
      return result("saved", { savedSessionId: active.id, autosaveSessionId: "autosave-restored" });
    },
    async listSavedSessions() {
      calls.push("listSavedSessions");
      return Object.freeze({ ...result("listed", { sessions: saves }), diagnostics: [diagnostic("alpha-a5-corrupted-record")] });
    },
    async openSession(id) {
      calls.push(`openSession:${id}`);
      if (id === opened.id) active = opened;
      return result("opened", { openedSessionId: id });
    },
    async removeSession(id) {
      calls.push(`removeSession:${id}`);
      saves = saves.filter(save => save.id !== id);
      return result("removed", { removedSessionId: id });
    },
    exportActiveCharacter() {
      calls.push(`exportActiveCharacter:${active.id}`);
      return result("exported", { filename: "aberta.singular.json", json: JSON.stringify({ singular: true, sessionId: active.id }) });
    },
    importCharacter(input) {
      calls.push(`importCharacter:${input}`);
      if (input === "INVALID") {
        return Object.freeze({ ...result("rejected", { importedSessionId: null }), diagnostics: [diagnostic("alpha-a5-import-rejected")] });
      }
      active = imported;
      saves = [summary(imported), ...saves.filter(save => save.id !== imported.id)];
      return result("imported", { importedSessionId: imported.id });
    },
  };
}

function summary(session) {
  return Object.freeze({ id: session.id, characterName: session.character.identity.name, status: "available" });
}

function result(status, data) {
  return Object.freeze({ status, changed: true, activeSessionId: data.importedSessionId ?? data.openedSessionId ?? data.savedSessionId ?? data.restoredSessionId ?? "session-restored", diagnostics: [], data: Object.freeze(data) });
}

function diagnostic(code) {
  return Object.freeze({ severity: "warning", code, message: code });
}

function createRoot() {
  const listeners = new Map();
  const attributes = new Map([["data-mode", "table"]]);
  const importInput = { value: "" };
  return {
    innerHTML: "",
    importInput,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    querySelector(selector) { return selector === '[data-role="persistence-import-json"]' ? importInput : null; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    listener(type) { return listeners.get(type); },
  };
}

function target(action, sessionId = undefined) {
  return { dataset: sessionId === undefined ? { action } : { action, sessionId }, parentElement: null };
}

test("Alpha A5 mounted flow accepts persistence capacity end to end", async () => {
  const persistence = createCoordinator();
  const root = createRoot();
  const downloads = [];
  const mounted = await mountAlphaMobilePersistenceUi({ root, persistence, mode: "table", downloadText: async input => downloads.push({ ...input }) });

  assert.equal(root.getAttribute("data-session-id"), "session-restored");
  assert.match(root.innerHTML, /Restaurada/);
  assert.match(root.innerHTML, /Ilegível/);

  await root.listener("click")({ target: target("persistence-save") });
  assert.match(root.innerHTML, /Sessão salva: session-restored/);
  assert.ok(persistence.saveIds.includes("autosave-restored"));

  await root.listener("click")({ target: target("persistence-refresh") });
  assert.match(root.innerHTML, /salvamento\(s\) encontrado\(s\)/);

  await root.listener("click")({ target: target("persistence-open", "session-opened") });
  assert.equal(root.getAttribute("data-session-id"), "session-opened");
  assert.match(root.innerHTML, /Aberta/);

  await root.listener("click")({ target: target("persistence-remove", "bad-record") });
  assert.ok(persistence.saveIds.includes("session-restored"));
  assert.ok(persistence.saveIds.includes("session-opened"));

  await root.listener("click")({ target: target("persistence-export") });
  assert.deepEqual(downloads, [{ filename: "aberta.singular.json", text: JSON.stringify({ singular: true, sessionId: "session-opened" }), mimeType: "application/json" }]);

  root.importInput.value = JSON.stringify({ singular: true });
  await root.listener("click")({ target: target("persistence-import") });
  assert.equal(root.getAttribute("data-session-id"), "session-imported");

  root.importInput.value = "INVALID";
  await root.listener("click")({ target: target("persistence-import") });
  assert.equal(root.getAttribute("data-session-id"), "session-imported");
  assert.match(root.innerHTML, /Documento rejeitado\. A sessão atual foi preservada\./);
  assert.ok(persistence.saveIds.includes("session-restored"));
  assert.ok(persistence.saveIds.includes("session-imported"));

  mounted.destroy();
  assert.equal(root.listener("click"), undefined);
});

test("Alpha A5 full acceptance checklist keeps the capacity boundary explicit", () => {
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");
  for (const required of ["Salvamento manual", "Autosave", "Abrir salvamento", "Excluir salvamento", "Exportar formato SINGULAR", "Importar formato SINGULAR", "Documento corrompido", "sem apagar registros válidos", "Não cria storage paralelo"]) {
    assert.match(checklist, new RegExp(required));
  }
});
