import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "../../application/bootstrap/AlphaMobilePersistenceBootstrap.js";
import { createAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_EXPORT_IMPORT_SUCCESS_FEEDBACK_GATE.md";

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

function initialSession(id = "session-success-source", name = "Ayla") {
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
    namespace: "test.ui.import.success",
    initialSession: initialSession(),
    runtime: {
      clock: { now: () => "2026-06-26T19:00:00.000Z" },
      idGenerator: {
        next(prefix) {
          sequence += 1;
          return `${prefix}:success-${sequence}`;
        },
      },
    },
  });
}

test("Alpha valid import reports success and updates the active session through the existing persistence UI", async () => {
  const app = application();
  const downloads = [];
  const ui = createAlphaMobilePersistenceUi({
    persistence: app.persistence,
    downloadText: input => downloads.push(input),
  });

  await ui.initialize();
  const activeBefore = app.persistence.getActiveSession();
  const exported = await ui.exportCharacter();
  assert.equal(exported.status, "exported");
  assert.equal(downloads.length, 1);

  const result = await ui.importJson(downloads[0].text);

  assert.equal(result.status, "imported");
  assert.equal(result.changed, true);
  assert.notEqual(result.activeSessionId, activeBefore.id);
  assert.equal(app.persistence.getActiveSession().id, result.activeSessionId);

  const state = ui.getState();
  assert.equal(state.activeSessionId, result.activeSessionId);
  assert.equal(
    state.feedback,
    `Personagem importado em nova sessão: ${result.activeSessionId}`,
  );

  const creationHtml = ui.render({ mode: "creation" });
  const tableHtml = ui.render({ mode: "table" });

  assert.match(creationHtml, new RegExp(escapeRegExp(result.activeSessionId)));
  assert.match(creationHtml, /Personagem importado em nova sessão:/);
  assert.match(creationHtml, /data-role="persistence-import-json"/);
  assert.match(creationHtml, /data-action="persistence-import"/);
  assert.match(tableHtml, new RegExp(escapeRegExp(result.activeSessionId)));
  assert.match(tableHtml, /data-role="persistence-import-json"/);
  assert.match(tableHtml, /data-action="persistence-import"/);
});

test("Alpha import success feedback checklist keeps scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mobile.html`",
    "`CharacterMobileCompositionRoot.js`",
    "`bootstrapCharacterMobileApp()`",
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`persistence-import-json`",
    "`Importar`",
    "`persistence-import`",
    "`ui.importJson(input.value)`",
    "`persistence.importCharacter(input)`",
    "`status: \"imported\"`",
    "`Personagem importado em nova sessão: <activeSessionId>`",
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

  assert.match(persistenceUi, /async\s+importJson\(input\)/);
  assert.match(persistenceUi, /persistence\.importCharacter\(input\)/);
  assert.match(persistenceUi, /result\.status\s*===\s*"imported"/);
  assert.match(persistenceUi, /Personagem importado em nova sessão:\s*\$\{result\.activeSessionId\}/);
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
