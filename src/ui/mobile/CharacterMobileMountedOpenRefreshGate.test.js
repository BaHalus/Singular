import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_MOUNTED_OPEN_REFRESH_GATE.md";

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
  const sourceSession = makeSession("session-mounted-open-source", "Helena");
  const openedSession = makeSession(
    "session-mounted-open-target",
    "Marta",
    "Cartógrafa Aberta Única",
  );
  const calls = [];
  let activeSession = sourceSession;
  const savedSessions = [sourceSession, openedSession].map(session => ({
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
        data: { sessions: savedSessions.map(session => ({ ...session })) },
      });
    },
    async openSession(sessionId) {
      calls.push(`openSession:${sessionId}`);
      assert.equal(sessionId, openedSession.id);
      activeSession = openedSession;
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
        data: { filename: "marta.singular.json", json: "{}" },
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

test("Alpha mounted open action restores a saved session and re-renders the mounted root", async () => {
  const persistence = createPersistenceCoordinator();
  const root = createMountedRoot();
  const mounted = await mountAlphaMobilePersistenceUi({
    root,
    persistence,
    mode: "table",
    downloadText: () => undefined,
  });

  const activeBefore = persistence.getActiveSession();
  assert.equal(activeBefore.id, "session-mounted-open-source");
  assert.equal(root.getAttribute("data-session-id"), activeBefore.id);
  assert.equal(root.getAttribute("data-character-id"), activeBefore.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Helena/);
  assert.match(root.innerHTML, /Marta/);
  assert.match(root.innerHTML, /Exploradora/);
  assert.doesNotMatch(root.innerHTML, /Cartógrafa Aberta Única/);
  assert.match(root.innerHTML, /data-action="persistence-open"/);
  assert.match(root.innerHTML, /data-session-id="session-mounted-open-target"/);

  const click = root.listener("click");
  assert.equal(typeof click, "function");
  await click({
    target: {
      dataset: {
        action: "persistence-open",
        sessionId: "session-mounted-open-target",
      },
      parentElement: null,
    },
  });

  const activeAfter = persistence.getActiveSession();
  assert.equal(activeAfter.id, "session-mounted-open-target");
  assert.equal(activeAfter.character.identity.name, "Marta");
  assert.equal(activeAfter.character.identity.concept, "Cartógrafa Aberta Única");
  assert.equal(root.getAttribute("data-singular-mounted"), "true");
  assert.equal(root.getAttribute("data-session-id"), activeAfter.id);
  assert.equal(root.getAttribute("data-character-id"), activeAfter.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.match(root.innerHTML, /Sessão aberta: session-mounted-open-target/);
  assert.match(root.innerHTML, /Marta/);
  assert.match(root.innerHTML, /Cartógrafa Aberta Única/);
  assert.doesNotMatch(root.innerHTML, /Sessão aberta: session-mounted-open-source/);
  assert.doesNotMatch(root.innerHTML, /Exploradora/);
  assert.ok(
    includesOrderedSubsequence(persistence.calls, [
      "listSavedSessions",
      "openSession:session-mounted-open-target",
      "getActiveSession:session-mounted-open-target",
    ]),
    "mounted open must delegate to the coordinator before rendering the opened active session",
  );

  mounted.destroy();
  assert.equal(root.listener("click"), undefined);
});

test("Alpha mounted open refresh checklist keeps A5 scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mobile.html`",
    "`CharacterMobileCompositionRoot.js`",
    "`bootstrapCharacterMobileApp()`",
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`persistence-open`",
    "`data-session-id`",
    "`ui.open(sessionId)`",
    "`persistence.openSession(sessionId)`",
    "`requestRender()`",
    "`data-session-id` e `data-character-id`",
    "`Sessão aberta: <activeSessionId>`",
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

  assert.match(persistenceUi, /await\s+ui\.open\(sessionId\)/);
  assert.match(persistenceUi, /const\s+result\s+=\s+await\s+persistence\.openSession\(sessionId\)/);
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
