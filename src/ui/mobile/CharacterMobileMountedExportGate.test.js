import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_MOUNTED_EXPORT_GATE.md";

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
    "Dora",
    "Cartógrafa de Exportação Única",
  );
  const exportPayload = Object.freeze({
    filename: "dora.singular.json",
    json: JSON.stringify({ singular: true, characterId: activeSession.character.identity.id }),
  });
  const calls = [];

  return {
    calls,
    exportPayload,
    getActiveSession() {
      calls.push(`getActiveSession:${activeSession.id}`);
      return activeSession;
    },
    async initialize() {
      calls.push("initialize");
      return result({
        status: "preserved",
        activeSessionId: activeSession.id,
        data: {},
      });
    },
    async saveActiveSession() {
      calls.push("saveActiveSession");
      return result({ status: "saved", activeSessionId: activeSession.id, data: {} });
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
      return result({ status: "opened", activeSessionId: activeSession.id, data: {} });
    },
    async removeSession(sessionId) {
      calls.push(`removeSession:${sessionId}`);
      return result({ status: "removed", activeSessionId: activeSession.id, data: {} });
    },
    exportActiveCharacter() {
      calls.push("exportActiveCharacter");
      return result({
        status: "exported",
        activeSessionId: activeSession.id,
        data: exportPayload,
      });
    },
    importCharacter(input) {
      calls.push(`importCharacter:${input}`);
      return result({ status: "rejected", activeSessionId: activeSession.id, data: {} });
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

test("Alpha mounted export delegates to the coordinator and downloads its returned payload", async () => {
  const persistence = createPersistenceCoordinator();
  const root = createMountedRoot("table");
  const downloads = [];
  const downloadText = async input => {
    downloads.push(input);
  };

  const mounted = await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    mode: "table",
    downloadText,
  });

  const sessionBeforeExport = persistence.getActiveSession();
  assert.equal(root.getAttribute("data-session-id"), sessionBeforeExport.id);
  assert.equal(root.getAttribute("data-character-id"), sessionBeforeExport.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Dora/);
  assert.match(root.innerHTML, /Cartógrafa de Exportação Única/);

  await root.listener("click")({ target: createActionTarget("persistence-export") });

  assert.deepEqual(downloads, [{
    filename: persistence.exportPayload.filename,
    text: persistence.exportPayload.json,
    mimeType: "application/json",
  }]);
  assert.ok(
    includesOrderedSubsequence(persistence.calls, [
      "initialize",
      "listSavedSessions",
      "exportActiveCharacter",
    ]),
    "mounted export must initialize through the coordinator, then delegate export to the same coordinator",
  );

  const sessionAfterExport = persistence.getActiveSession();
  assert.equal(sessionAfterExport.id, sessionBeforeExport.id);
  assert.equal(root.getAttribute("data-session-id"), sessionBeforeExport.id);
  assert.equal(root.getAttribute("data-character-id"), sessionBeforeExport.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Personagem exportado: dora\.singular\.json/);
  assert.match(root.innerHTML, /Dora/);
  assert.match(root.innerHTML, /Cartógrafa de Exportação Única/);

  mounted.destroy();
  assert.equal(root.listener("click"), undefined);
});

test("Alpha mounted export checklist keeps A5 scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`persistence-export`",
    "`persistence.exportActiveCharacter()`",
    "`downloadText(filename, json)`",
    "`data-session-id`",
    "`data-character-id`",
    "Criação/Mesa",
    "Mesa continua modo de transitórios",
    "feedback visível de exportação",
    "não cria storage paralelo",
    "não cria persistência paralela",
    "não cria cálculo ou regra de domínio na UI",
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
  assert.match(persistenceUi, /await ui\.exportCharacter\(\)/);
  assert.match(persistenceUi, /const\s+result\s*=\s*persistence\.exportActiveCharacter\(\)/);
  assert.match(persistenceUi, /downloadText\(\{\s*filename:\s*result\.data\.filename,\s*text:\s*result\.data\.json,\s*mimeType:\s*"application\/json",\s*\}\)/s);
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
