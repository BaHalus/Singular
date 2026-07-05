import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "../../application/bootstrap/AlphaMobilePersistenceBootstrap.js";
import { mountAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_MOUNTED_SAVE_REFRESH_GATE.md";

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

function initialSession(id = "session-mounted-save-source", name = "Helena") {
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

function application() {
  let sequence = 0;
  return createAlphaMobilePersistenceBootstrap({
    storage: createMemoryStorage(),
    namespace: "test.ui.mounted.save.refresh",
    initialSession: initialSession(),
    runtime: {
      clock: { now: () => "2026-06-26T19:00:00.000Z" },
      idGenerator: {
        next(prefix) {
          sequence += 1;
          return `${prefix}:mounted-save-${sequence}`;
        },
      },
    },
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

test("Alpha mounted save action persists the active session and re-renders the saved list", async () => {
  const app = application();
  const root = createMountedRoot();
  const mounted = await mountAlphaMobilePersistenceUi({
    root,
    persistence: app.persistence,
    mode: "creation",
    downloadText: () => undefined,
  });

  const activeBefore = app.persistence.getActiveSession();
  assert.match(root.innerHTML, /Nenhum salvamento local listado\./);
  assert.match(root.innerHTML, /data-action="persistence-save"/);
  assert.match(root.innerHTML, /data-action="persistence-refresh"/);

  const click = root.listener("click");
  assert.equal(typeof click, "function");
  await click({
    target: {
      dataset: { action: "persistence-save" },
      parentElement: null,
    },
  });

  const activeAfter = app.persistence.getActiveSession();
  assert.equal(activeAfter.id, activeBefore.id);
  assert.equal(root.getAttribute("data-singular-mounted"), "true");
  assert.equal(root.getAttribute("data-session-id"), activeBefore.id);
  assert.equal(root.getAttribute("data-character-id"), activeBefore.character.identity.id);
  assert.equal(root.getAttribute("data-mode"), "creation");
  assert.match(root.innerHTML, new RegExp(escapeRegExp(activeBefore.id)));
  assert.match(root.innerHTML, /Sessão salva:/);
  assert.match(root.innerHTML, /Helena/);
  assert.match(root.innerHTML, /data-save-status="available"/);
  assert.match(root.innerHTML, /data-action="persistence-open"/);
  assert.match(root.innerHTML, /data-action="persistence-remove"/);

  mounted.destroy();
  assert.equal(root.listener("click"), undefined);
});

test("Alpha mounted save refresh checklist keeps A5 scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mobile.html`",
    "`CharacterMobileCompositionRoot.js`",
    "`bootstrapCharacterMobileApp()`",
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`persistence-save`",
    "`persistence-refresh`",
    "`ui.save()`",
    "`persistence.saveActiveSession()`",
    "`persistence.listSavedSessions()`",
    "`status: \"saved\"`",
    "`Sessão salva: <activeSessionId>`",
    "`data-save-status=\"available\"`",
    "`persistence-open`",
    "`persistence-remove`",
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

  assert.match(persistenceUi, /await\s+ui\.save\(\)/);
  assert.match(persistenceUi, /const\s+listing\s+=\s+await\s+persistence\.listSavedSessions\(\)/);
  assert.match(persistenceUi, /savedSessions\s+=\s+listing\.data\.sessions\s*\?\?\s*\[\]/);
  assert.match(persistenceUi, /requestRender\(\)/);
  assert.match(persistenceUi, /setAttribute\("data-session-id",\s*activeSession\.id\)/);
  assert.doesNotMatch(persistenceUi, /localStorage|sessionStorage|indexedDB/);

  for (const forbidden of [
    /formato\s+universal/i,
    /sincroniza[çc][ãa]o\s+remota/i,
    /recupera[çc][ãa]o\s+autom[áa]tica/i,
    /merge\s+de\s+sess[õo]es/i,
    /storage\s+novo/i,
  ]) {
    assert.doesNotMatch(checklist, forbidden);
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
