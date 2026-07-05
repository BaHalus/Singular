import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_MOUNTED_RESTORE_LAST_SESSION_GATE.md";

function makeSession(id, name, concept = "Exploradora") {
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
    "session-mounted-restore-initial",
    "Alice",
    "Sessão Inicial Única",
  );
  const restoredSession = makeSession(
    "session-mounted-restore-last",
    "Bianca",
    "Guardião Restaurado Único",
  );
  const otherSession = makeSession("session-mounted-restore-other", "Ciro");
  const calls = [];
  let activeSession = initialSession;
  const savedSessions = [restoredSession, otherSession].map(session => ({
    id: session.id,
    status: "available",
    revision: session.revision,
    characterId: session.character.identity.id,
    characterName: session.character.identity.name,
  }));

  return {
    calls,
    getActiveSession() {
      calls.push(`getActiveSession:${activeSession.id}`);
      return activeSession;
    },
    async initialize() {
      calls.push("initialize");
      activeSession = restoredSession;
      return result({
        status: "restored",
        activeSessionId: activeSession.id,
        data: { restoredSessionId: activeSession.id },
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
        data: { sessions: savedSessions.map(session => ({ ...session })) },
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
        data: { filename: `${activeSession.character.identity.name.toLowerCase()}.singular.json`, json: "{}" },
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

function createMountedRoot() {
  const listeners = new Map();
  const attributes = new Map();
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

test("Alpha mounted initialize restores the last session and renders it as active", async () => {
  const persistence = createPersistenceCoordinator();
  const root = createMountedRoot();

  const activeBeforeInitialize = persistence.getActiveSession();
  assert.equal(activeBeforeInitialize.id, "session-mounted-restore-initial");
  assert.equal(activeBeforeInitialize.character.identity.name, "Alice");
  assert.equal(activeBeforeInitialize.character.identity.concept, "Sessão Inicial Única");

  const mounted = await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    mode: "table",
    downloadText: () => undefined,
  });

  const activeAfterRestore = persistence.getActiveSession();
  assert.equal(activeAfterRestore.id, "session-mounted-restore-last");
  assert.equal(activeAfterRestore.character.identity.name, "Bianca");
  assert.equal(activeAfterRestore.character.identity.concept, "Guardião Restaurado Único");
  assert.equal(root.getAttribute("data-singular-mounted"), "true");
  assert.equal(root.getAttribute("data-session-id"), activeAfterRestore.id);
  assert.equal(root.getAttribute("data-character-id"), activeAfterRestore.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Sessão restaurada: session-mounted-restore-last/);
  assert.match(root.innerHTML, /Bianca/);
  assert.match(root.innerHTML, /Guardião Restaurado Único/);
  assert.doesNotMatch(root.innerHTML, /Alice/);
  assert.doesNotMatch(root.innerHTML, /Sessão Inicial Única/);
  assert.match(root.innerHTML, /Ciro/);
  assert.match(root.innerHTML, /data-action="persistence-open"/);
  assert.match(root.innerHTML, /data-session-id="session-mounted-restore-last"/);
  assert.ok(
    includesOrderedSubsequence(persistence.calls, [
      "getActiveSession:session-mounted-restore-initial",
      "initialize",
      "listSavedSessions",
      "getActiveSession:session-mounted-restore-last",
    ]),
    "mounted initialization must start on a different active session, restore through the coordinator, list saved sessions, then render the restored active session",
  );

  mounted.destroy();
  assert.equal(root.listener("click"), undefined);
});

test("Alpha mounted restore-last checklist keeps A5 scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mobile.html`",
    "`CharacterMobileCompositionRoot.js`",
    "`bootstrapCharacterMobileApp()`",
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`persistence.initialize()`",
    "`status: \"restored\"`",
    "`persistence.listSavedSessions()`",
    "`requestRender()`",
    "`data-session-id` e `data-character-id`",
    "`Sessão restaurada: <activeSessionId>`",
    "restaura a sessão ativa",
    "Criação/Mesa",
    "Mesa continua modo de transitórios",
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

  assert.match(persistenceUi, /const\s+initialization\s+=\s+await\s+persistence\.initialize\(\)/);
  assert.match(persistenceUi, /const\s+listing\s+=\s+await\s+persistence\.listSavedSessions\(\)/);
  assert.match(persistenceUi, /initialization\.status\s+===\s+"restored"/);
  assert.match(persistenceUi, /`Sessão restaurada: \$\{initialization\.activeSessionId\}`/);
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
