import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_EXPORT_IMPORT_SUCCESS_FEEDBACK_GATE.md";

const importedSession = Object.freeze({
  id: "session-imported-valid",
  revision: 2,
  character: Object.freeze({
    identity: Object.freeze({
      id: "character-imported-valid",
      name: "Importado Válido",
    }),
    attributes: Object.freeze({
      ST: 10,
      DX: 10,
      IQ: 10,
      HT: 10,
    }),
    secondary: Object.freeze({}),
    traits: Object.freeze([]),
    skills: Object.freeze([]),
    equipment: Object.freeze([]),
    notes: "",
  }),
});

const initialSession = Object.freeze({
  id: "session-initial-active",
  revision: 1,
  character: Object.freeze({
    identity: Object.freeze({
      id: "character-initial-active",
      name: "Inicial Ativo",
    }),
    attributes: Object.freeze({
      ST: 10,
      DX: 10,
      IQ: 10,
      HT: 10,
    }),
    secondary: Object.freeze({}),
    traits: Object.freeze([]),
    skills: Object.freeze([]),
    equipment: Object.freeze([]),
    notes: "",
  }),
});

test("Alpha import success feedback uses the existing persistence UI/coordinator and updates active session", async () => {
  const calls = [];
  let activeSession = initialSession;
  const persistence = createPersistenceCoordinator({
    getActiveSession: () => activeSession,
    importCharacter(input) {
      calls.push(["importCharacter", input]);
      activeSession = importedSession;
      return {
        status: "imported",
        changed: true,
        activeSessionId: activeSession.id,
        diagnostics: [],
        data: { session: activeSession },
      };
    },
  });
  const ui = createAlphaMobilePersistenceUi({ persistence });

  assert.equal(ui.getState().activeSessionId, "session-initial-active");

  const result = await ui.importJson('{"singular":"valid"}');

  assert.equal(result.status, "imported");
  assert.equal(result.changed, true);
  assert.equal(result.activeSessionId, "session-imported-valid");
  assert.deepEqual(calls, [["importCharacter", '{"singular":"valid"}']]);

  const state = ui.getState();
  assert.equal(state.activeSessionId, "session-imported-valid");
  assert.equal(
    state.feedback,
    "Personagem importado em nova sessão: session-imported-valid",
  );

  const creationHtml = ui.render({ mode: "creation" });
  const tableHtml = ui.render({ mode: "table" });

  assert.match(creationHtml, /Importado Válido/);
  assert.match(creationHtml, /Sessão ativa:\s*<strong>session-imported-valid<\/strong>/);
  assert.match(creationHtml, /Personagem importado em nova sessão: session-imported-valid/);
  assert.match(creationHtml, /data-role="persistence-import-json"/);
  assert.match(creationHtml, /data-action="persistence-import"/);
  assert.match(tableHtml, /Importado Válido/);
  assert.match(tableHtml, /Sessão ativa:\s*<strong>session-imported-valid<\/strong>/);
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

function createPersistenceCoordinator(overrides = {}) {
  return {
    getActiveSession: () => initialSession,
    initialize: () => ({
      status: "empty",
      changed: false,
      activeSessionId: initialSession.id,
      diagnostics: [],
      data: {},
    }),
    saveActiveSession: () => ({
      status: "saved",
      changed: false,
      activeSessionId: initialSession.id,
      diagnostics: [],
      data: {},
    }),
    listSavedSessions: () => ({
      status: "listed",
      changed: false,
      activeSessionId: initialSession.id,
      diagnostics: [],
      data: { sessions: [] },
    }),
    openSession: () => ({
      status: "missing",
      changed: false,
      activeSessionId: initialSession.id,
      diagnostics: [],
      data: {},
    }),
    removeSession: () => ({
      status: "missing",
      changed: false,
      activeSessionId: initialSession.id,
      diagnostics: [],
      data: {},
    }),
    exportActiveCharacter: () => ({
      status: "exported",
      changed: false,
      activeSessionId: initialSession.id,
      diagnostics: [],
      data: { filename: "singular-alpha.json", json: "{}" },
    }),
    importCharacter: () => ({
      status: "failed",
      changed: false,
      activeSessionId: initialSession.id,
      diagnostics: [],
      data: {},
    }),
    ...overrides,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
