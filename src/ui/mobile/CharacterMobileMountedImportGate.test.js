import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_MOUNTED_IMPORT_GATE.md";

function makeSession(id, name, concept = "Importadora Montada") {
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
  const initialSession = makeSession(
    "session-mounted-import-initial",
    "Eva",
    "Sessão Antes da Importação",
  );
  const importedSession = makeSession(
    "session-mounted-import-created",
    "Fiona",
    "Personagem Importada Única",
  );
  const importPayload = JSON.stringify({ singular: true, name: "Fiona" });
  const calls = [];
  let activeSession = initialSession;

  return {
    calls,
    importPayload,
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
      return result({ status: "exported", activeSessionId: activeSession.id, data: { filename: "eva.json", json: "{}" } });
    },
    importCharacter(input) {
      calls.push(`importCharacter:${input}`);
      activeSession = importedSession;
      return result({
        status: "imported",
        activeSessionId: activeSession.id,
        data: { importedSessionId: activeSession.id },
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

function createMountedRoot(initialMode = "creation", importValue = "") {
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
    querySelector(selector) {
      if (selector === '[data-role="persistence-import-json"]') {
        return { value: importValue };
      }
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

test("Alpha mounted import delegates textarea JSON to the coordinator and renders the imported session", async () => {
  const persistence = createPersistenceCoordinator();
  const root = createMountedRoot("creation", persistence.importPayload);

  const mounted = await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    mode: "creation",
    downloadText: () => undefined,
  });

  const sessionBeforeImport = persistence.getActiveSession();
  assert.equal(sessionBeforeImport.id, "session-mounted-import-initial");
  assert.equal(root.getAttribute("data-session-id"), sessionBeforeImport.id);
  assert.equal(root.getAttribute("data-character-id"), sessionBeforeImport.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "creation");
  assert.match(root.innerHTML, /Eva/);
  assert.match(root.innerHTML, /Sessão Antes da Importação/);

  await root.listener("click")({ target: createActionTarget("persistence-import") });

  const sessionAfterImport = persistence.getActiveSession();
  assert.equal(sessionAfterImport.id, "session-mounted-import-created");
  assert.equal(sessionAfterImport.character.identity.name, "Fiona");
  assert.equal(sessionAfterImport.character.identity.concept, "Personagem Importada Única");
  assert.equal(root.getAttribute("data-session-id"), sessionAfterImport.id);
  assert.equal(root.getAttribute("data-character-id"), sessionAfterImport.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "creation");
  assert.match(root.innerHTML, /Personagem importado em nova sessão: session-mounted-import-created/);
  assert.match(root.innerHTML, /Fiona/);
  assert.match(root.innerHTML, /Personagem Importada Única/);
  assert.doesNotMatch(root.innerHTML, /Sessão Antes da Importação/);
  assert.ok(
    includesOrderedSubsequence(persistence.calls, [
      "initialize",
      "listSavedSessions",
      `importCharacter:${persistence.importPayload}`,
      "getActiveSession:session-mounted-import-created",
    ]),
    "mounted import must read the mounted textarea, delegate to the coordinator, then render the imported active session",
  );

  mounted.destroy();
  assert.equal(root.listener("click"), undefined);
});

test("Alpha mounted import checklist keeps A5 scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`persistence-import`",
    "`data-role=\"persistence-import-json\"`",
    "`persistence.importCharacter(input)`",
    "`requestRender()`",
    "`data-session-id`",
    "`data-character-id`",
    "Criação/Mesa",
    "Mesa continua modo de transitórios",
    "feedback visível de importação",
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

  assert.match(persistenceUi, /action === "persistence-import"/);
  assert.match(persistenceUi, /root\.querySelector\?\.\('\[data-role="persistence-import-json"\]'\)/);
  assert.match(persistenceUi, /await ui\.importJson\(input\?\.value \?\? ""\)/);
  assert.match(persistenceUi, /const\s+result\s*=\s*persistence\.importCharacter\(input\)/);
  assert.match(persistenceUi, /`Personagem importado em nova sessão: \$\{result\.activeSessionId\}`/);
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
