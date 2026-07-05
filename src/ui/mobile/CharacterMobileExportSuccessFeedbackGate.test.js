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
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_EXPORT_IMPORT_EXPORT_SUCCESS_FEEDBACK_GATE.md";

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

function initialSession(id = "session-export-source", name = "Dorian") {
  const character = createCharacter({
    identity: { id: `character-${id}`, name, concept: "Cartógrafo" },
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
    namespace: "test.ui.export.success",
    initialSession: initialSession(),
    runtime: {
      clock: { now: () => "2026-06-26T19:00:00.000Z" },
      idGenerator: {
        next(prefix) {
          sequence += 1;
          return `${prefix}:export-${sequence}`;
        },
      },
    },
  });
}

test("Alpha valid export reports success and downloads through the existing persistence UI", async () => {
  const app = application();
  const downloads = [];
  const ui = createAlphaMobilePersistenceUi({
    persistence: app.persistence,
    downloadText: input => downloads.push(input),
  });

  await ui.initialize();
  const activeBefore = app.persistence.getActiveSession();

  const result = await ui.exportCharacter();

  assert.equal(result.status, "exported");
  assert.equal(result.changed, false);
  assert.equal(result.activeSessionId, activeBefore.id);
  assert.equal(app.persistence.getActiveSession().id, activeBefore.id);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, result.data.filename);
  assert.equal(downloads[0].text, result.data.json);
  assert.equal(downloads[0].mimeType, "application/json");
  assert.match(downloads[0].filename, /\.json$/);
  assert.doesNotThrow(() => JSON.parse(downloads[0].text));

  const state = ui.getState();
  assert.equal(state.activeSessionId, activeBefore.id);
  assert.equal(
    state.feedback,
    `Personagem exportado: ${result.data.filename}`,
  );

  const creationHtml = ui.render({ mode: "creation" });
  const tableHtml = ui.render({ mode: "table" });

  assert.match(creationHtml, new RegExp(escapeRegExp(activeBefore.id)));
  assert.match(creationHtml, /Personagem exportado:/);
  assert.match(creationHtml, /role="status"/);
  assert.match(creationHtml, /data-action="persistence-export"/);
  assert.match(tableHtml, new RegExp(escapeRegExp(activeBefore.id)));
  assert.match(tableHtml, /data-action="persistence-export"/);
});

test("Alpha export success feedback checklist keeps scope and architecture boundaries explicit", () => {
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mobile.html`",
    "`CharacterMobileCompositionRoot.js`",
    "`bootstrapCharacterMobileApp()`",
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`Exportar`",
    "`persistence-export`",
    "`ui.exportCharacter()`",
    "`persistence.exportActiveCharacter()`",
    "`status: \"exported\"`",
    "`downloadText()`",
    "`filename`",
    "`text`",
    "`mimeType`",
    "`Personagem exportado: <filename>`",
    "preserva a sessão ativa",
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

  assert.match(persistenceUi, /async\s+exportCharacter\(\)/);
  assert.match(persistenceUi, /persistence\.exportActiveCharacter\(\)/);
  assert.match(persistenceUi, /result\.status\s*!==\s*"exported"/);
  assert.match(persistenceUi, /downloadText\s*\(\s*\{/);
  assert.match(persistenceUi, /filename:\s*result\.data\.filename/);
  assert.match(persistenceUi, /text:\s*result\.data\.json/);
  assert.match(persistenceUi, /mimeType:\s*"application\/json"/);
  assert.match(persistenceUi, /Personagem exportado:\s*\$\{result\.data\.filename\}/);
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
