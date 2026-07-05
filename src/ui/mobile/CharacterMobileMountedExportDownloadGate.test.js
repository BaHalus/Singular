import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_MOUNTED_EXPORT_DOWNLOAD_GATE.md";

function makeSession(id, name, concept = "Exportadora Montada") {
  const character = createCharacter({
    identity: { id: `character-${id}`, name, concept },
    metadata: {
      createdAt: "2026-06-26T18:00:00.000Z",
      updatedAt: "2026-06-26T18:00:00.000Z",
      source: "test",
    },
  });
  return createApplicationSession({ id, character });
}

function createPersistenceCoordinator() {
  const activeSession = makeSession(
    "session-mounted-export-active",
    "Nara",
    "Cartógrafa Exportada Única",
  );
  const exportedFilename = "nara-exportada.singular.json";
  const exportedJson = JSON.stringify({
    singular: true,
    sessionId: activeSession.id,
    characterName: activeSession.character.identity.name,
  });
  const calls = [];

  return {
    calls,
    exportedFilename,
    exportedJson,
    getActiveSession() {
      calls.push(`getActiveSession:${activeSession.id}`);
      return activeSession;
    },
    async initialize() {
      calls.push("initialize");
      return result({
        status: "started",
        activeSessionId: activeSession.id,
        data: { restoredSessionId: null },
      });
    },
    async saveActiveSession() {
      calls.push("saveActiveSession");
      return result({
        status: "saved",
        activeSessionId: activeSession.id,
        data: { savedSessionId: activeSession.id },
      });
    },
    async listSavedSessions() {
      calls.push("listSavedSessions");
      return result({
        status: "listed",
        activeSessionId: activeSession.id,
        data: { sessions: [] },
      });
    },
    async openSession(sessionId) {
      calls.push(`openSession:${sessionId}`);
      return result({
        status: "opened",
        activeSessionId: activeSession.id,
        data: { openedSessionId: sessionId },
      });
    },
    async removeSession(sessionId) {
      calls.push(`removeSession:${sessionId}`);
      return result({
        status: "removed",
        activeSessionId: activeSession.id,
        data: { removedSessionId: sessionId },
      });
    },
    exportActiveCharacter() {
      calls.push("exportActiveCharacter");
      return result({
        status: "exported",
        activeSessionId: activeSession.id,
        data: { filename: exportedFilename, json: exportedJson },
      });
    },
    importCharacter(input) {
      calls.push(`importCharacter:${input}`);
      return result({
        status: "rejected",
        activeSessionId: activeSession.id,
        data: { importedSessionId: null },
      });
    },
  };
}

function result(input) {
  return Object.freeze({
    changed: false,
    diagnostics: [],
    ...input,
    data: Object.freeze(input.data ?? {}),
  });
}

function createMountedRoot(initialMode = "table") {
  const listeners = new Map();
  const attributes = new Map([["data-mode", initialMode]]);
  return {
    innerHTML: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    querySelector() {
      return null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    listener(type) {
      return listeners.get(type);
    },
  };
}

function createActionTarget(action) {
  return { dataset: { action }, parentElement: null };
}

test("Alpha mounted export delegates to the coordinator, downloads its document, and preserves the active session", async () => {
  const persistence = createPersistenceCoordinator();
  const root = createMountedRoot("table");
  const downloads = [];

  const mounted = await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    mode: "table",
    downloadText: async input => {
      downloads.push({ ...input });
    },
  });

  const activeBeforeExport = persistence.getActiveSession();
  assert.equal(activeBeforeExport.id, "session-mounted-export-active");
  assert.equal(activeBeforeExport.character.identity.name, "Nara");
  assert.equal(activeBeforeExport.character.identity.concept, "Cartógrafa Exportada Única");
  assert.equal(root.getAttribute("data-session-id"), activeBeforeExport.id);
  assert.equal(root.getAttribute("data-character-id"), activeBeforeExport.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Nara/);
  assert.match(root.innerHTML, /Cartógrafa Exportada Única/);
  assert.match(root.innerHTML, /data-action="persistence-export"/);

  await root.listener("click")({ target: createActionTarget("persistence-export") });

  const activeAfterExport = persistence.getActiveSession();
  assert.equal(activeAfterExport.id, activeBeforeExport.id);
  assert.equal(activeAfterExport.character.identity.id, activeBeforeExport.character.identity.id);
  assert.deepEqual(downloads, [{
    filename: persistence.exportedFilename,
    text: persistence.exportedJson,
    mimeType: "application/json",
  }]);
  assert.equal(root.getAttribute("data-singular-mounted"), "true");
  assert.equal(root.getAttribute("data-session-id"), activeBeforeExport.id);
  assert.equal(root.getAttribute("data-character-id"), activeBeforeExport.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Personagem exportado: nara-exportada\.singular\.json/);
  assert.match(root.innerHTML, /Nara/);
  assert.match(root.innerHTML, /Cartógrafa Exportada Única/);
  assert.ok(
    includesOrderedSubsequence(persistence.calls, [
      "initialize",
      "listSavedSessions",
      "getActiveSession:session-mounted-export-active",
      "exportActiveCharacter",
      "getActiveSession:session-mounted-export-active",
    ]),
    "mounted export must delegate to the coordinator, download the coordinator document, then re-render the preserved active session",
  );

  mounted.destroy();
  assert.equal(root.listener("click"), undefined);
});

test("Alpha mounted export checklist keeps A5 scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mobile.html`",
    "`CharacterMobileCompositionRoot.js`",
    "`bootstrapCharacterMobileApp()`",
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`persistence-export`",
    "`ui.exportCharacter()`",
    "`persistence.exportActiveCharacter()`",
    "`downloadText({ filename, text, mimeType })`",
    "`Personagem exportado: <filename>`",
    "`requestRender()`",
    "`data-session-id`",
    "`data-character-id`",
    "preservando a sessão ativa",
    "Criação/Mesa",
    "Mesa continua modo de transitórios",
    "não cria persistência paralela",
    "não cria cálculo ou regra GURPS na UI",
    "não cria mutação direta do personagem fora dos comandos/coordenadores existentes",
    "não cria domínio paralelo",
    "não cria sessão paralela",
    "não cria executor paralelo",
    "não cria registry paralelo",
    "não cria persistence layer paralela",
    "não cria pipeline paralelo",
    "não cria composition root paralelo",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(required)));
  }

  assert.match(persistenceUi, /action === "persistence-export"/);
  assert.match(persistenceUi, /await\s+ui\.exportCharacter\(\)/);
  assert.match(persistenceUi, /const\s+result\s*=\s*persistence\.exportActiveCharacter\(\)/);
  assert.match(persistenceUi, /await\s+downloadText\(\{\s*filename:\s*result\.data\.filename,\s*text:\s*result\.data\.json,\s*mimeType:\s*"application\/json",\s*\}\)/s);
  assert.match(persistenceUi, /`Personagem exportado: \$\{result\.data\.filename\}`/);
  assert.match(persistenceUi, /requestRender\(\)/);
  assert.match(persistenceUi, /setAttribute\("data-session-id",\s*activeSession\.id\)/);
  assert.match(persistenceUi, /setAttribute\("data-character-id",\s*activeSession\.character\.identity\.id\)/);
  assert.doesNotMatch(persistenceUi, /localStorage|sessionStorage|indexedDB/);

  assert.match(checklist, /## Fora de escopo/);
  for (const outOfScope of [
    "formato universal",
    "sincronização remota",
    "reparo automático de registros",
    "combinação de sessões",
    "mecanismo adicional de persistência",
    "regras de cálculo ou domínio",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(outOfScope), "i"));
  }
});

function includesOrderedSubsequence(values, expected) {
  let cursor = 0;
  for (const value of values) {
    if (value === expected[cursor]) cursor += 1;
    if (cursor === expected.length) return true;
  }
  return false;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
