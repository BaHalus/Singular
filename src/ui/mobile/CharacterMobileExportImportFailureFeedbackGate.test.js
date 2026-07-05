import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "../../application/bootstrap/AlphaMobilePersistenceBootstrap.js";
import {
  mountAlphaMobilePersistenceUi,
} from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_EXPORT_IMPORT_FAILURE_FEEDBACK_GATE.md";

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

function initialSession(id = "session-preserved", name = "Ayla") {
  const character = createCharacter({
    identity: { id: `character-${id}`, name, concept: "Exploradora" },
    metadata: {
      createdAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
      source: "alpha-import-failure-feedback-gate",
    },
  });
  return createApplicationSession({ id, character });
}

function application(storage = createMemoryStorage()) {
  let sequence = 0;
  return createAlphaMobilePersistenceBootstrap({
    storage,
    namespace: "test.alpha.import.failure.feedback",
    initialSession: initialSession(),
    runtime: {
      clock: { now: () => "2026-07-05T10:00:00.000Z" },
      idGenerator: {
        next(prefix) {
          sequence += 1;
          return `${prefix}:import-failure-${sequence}`;
        },
      },
    },
  });
}

test("Alpha mobile import failure feedback preserves the active session through the mounted persistence UI", async () => {
  const app = application();
  const listeners = new Map();
  const attributes = new Map();
  const importInput = { value: "{broken" };
  const root = {
    innerHTML: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    querySelector(selector) {
      return selector === '[data-role="persistence-import-json"]' ? importInput : null;
    },
    getAttribute(name) {
      return name === "data-mode" ? "table" : null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };

  await mountAlphaMobilePersistenceUi({
    root,
    persistence: app.persistence,
    downloadText: () => {},
  });

  const activeBefore = app.persistence.getActiveSession();
  assert.equal(activeBefore.id, "session-preserved");
  assert.equal(attributes.get("data-mode"), "table");

  await listeners.get("click")({
    target: {
      dataset: { action: "persistence-import" },
      parentElement: null,
    },
  });

  const activeAfter = app.persistence.getActiveSession();
  assert.equal(activeAfter, activeBefore);
  assert.equal(attributes.get("data-session-id"), "session-preserved");
  assert.equal(attributes.get("data-mode"), "table");
  assert.match(root.innerHTML, /Documento rejeitado|A importação falhou/);
  assert.match(root.innerHTML, /A sessão atual foi preservada/);
  assert.match(root.innerHTML, /invalid-json/);
  assert.match(root.innerHTML, /data-role="persistence-import-json"/);
  assert.match(root.innerHTML, /data-action="persistence-import"/);
});

test("Alpha mobile import failure guard keeps scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`AlphaMobilePersistenceUi.js`",
    "`Persistência local`",
    "`persistence-import-json`",
    "`Importar`",
    "`persistence-import`",
    "`mountAlphaMobilePersistenceUi()`",
    "`ui.importJson()`",
    "`persistence.importCharacter()`",
    "`status: \"rejected\"`",
    "feedback textual",
    "sessão ativa",
    "Criação/Mesa",
    "Mesa continua modo de transitórios",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(required)));
  }

  for (const forbidden of [
    "cálculo ou regra de domínio na UI",
    "mutação direta do personagem fora dos comandos/coordenadores existentes",
    "recuperação automática de documento corrompido",
    "promessa de formato novo de exportação/importação",
    "domínio paralelo",
    "sessão paralela",
    "executor paralelo",
    "registry paralelo",
    "persistence layer paralela",
    "pipeline paralelo",
    "composition root paralelo",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(forbidden)));
  }

  assert.match(persistenceUi, /importJson\(input\)/);
  assert.match(persistenceUi, /persistence\.importCharacter\(input\)/);
  assert.match(persistenceUi, /Documento rejeitado\. A sessão atual foi preservada\./);
  assert.match(persistenceUi, /A importação falhou\. A sessão atual foi preservada\./);
  assert.doesNotMatch(persistenceUi, /localStorage|sessionStorage/);
  assert.doesNotMatch(checklist, /recuperação garantida/i);
  assert.doesNotMatch(checklist, /storage novo/i);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
