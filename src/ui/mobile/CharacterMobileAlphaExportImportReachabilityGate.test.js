import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCharacter } from "../../domain/character/Character.js";
import { createAlphaMobilePersistenceUi } from "./AlphaMobilePersistenceUi.js";

const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_EXPORT_IMPORT_REACHABILITY_GATE.md";

test("Alpha export/import checklist covers reachable mobile affordances", () => {
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "abrir `mobile.html`",
    "CharacterMobileCompositionRoot.js",
    "AlphaMobilePersistenceUi.js",
    "persistence-export",
    "persistence-import-json",
    "persistence-import",
    "Criação/Mesa",
    "Mesa como modo de transitórios",
    "sem editores estruturais",
    "sem adicionar persistence layer paralela",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(required)));
  }
});

test("Alpha persistence UI renders export/import affordances without owning persistence", () => {
  const ui = createAlphaMobilePersistenceUi({
    persistence: createPersistenceCoordinatorStub(),
    downloadText() {},
  });

  const html = ui.render({ mode: "creation" });

  assert.match(html, /aria-label="Persistência local"/);
  assert.match(html, /data-action="persistence-export"[^>]*>Exportar<\/button>/);
  assert.match(html, /data-role="persistence-import-json"/);
  assert.match(html, /aria-label="Importar personagem SINGULAR"/);
  assert.match(html, /data-action="persistence-import"[^>]*>Importar<\/button>/);

  assert.doesNotMatch(html, /CommandExecutor|CommandRegistry|ApplicationSession/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB/);
});

test("Alpha export/import gate keeps architecture boundaries explicit", () => {
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const forbiddenBoundary of [
    "cálculo ou regra de domínio na UI",
    "mutação direta do personagem fora dos comandos/coordenadores existentes",
    "formato novo de exportação/importação não suportado",
    "domínio paralelo",
    "sessão paralela",
    "executor paralelo",
    "registry paralelo",
    "persistence layer paralela",
    "pipeline paralelo",
    "composition root paralelo",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(forbiddenBoundary)));
  }

  assert.doesNotMatch(checklist, /createCharacter\s*\(/);
  assert.doesNotMatch(checklist, /localStorage\s*\./);
  assert.doesNotMatch(checklist, /new\s+CommandExecutor|new\s+CommandRegistry/);
});

function createPersistenceCoordinatorStub() {
  const activeSession = Object.freeze({
    id: "alpha-export-import-gate-session",
    revision: 1,
    character: createCharacter({
      identity: {
        id: "alpha-export-import-character",
        name: "Export Import Gate",
        playerId: null,
        campaignId: null,
        concept: "",
      },
    }),
  });

  const okResult = Object.freeze({
    status: "ok",
    changed: false,
    activeSessionId: activeSession.id,
    diagnostics: Object.freeze([]),
    data: Object.freeze({ sessions: Object.freeze([]) }),
  });

  return Object.freeze({
    getActiveSession() { return activeSession; },
    initialize() { return okResult; },
    saveActiveSession() { return Object.freeze({ ...okResult, status: "saved" }); },
    listSavedSessions() { return Object.freeze({ ...okResult, status: "listed" }); },
    openSession() { return Object.freeze({ ...okResult, status: "opened" }); },
    removeSession() { return Object.freeze({ ...okResult, status: "removed" }); },
    exportActiveCharacter() {
      return Object.freeze({
        status: "exported",
        changed: false,
        activeSessionId: activeSession.id,
        diagnostics: Object.freeze([]),
        data: Object.freeze({ filename: "alpha-export-import-gate.json", json: "{}" }),
      });
    },
    importCharacter() {
      return Object.freeze({
        status: "imported",
        changed: true,
        activeSessionId: activeSession.id,
        diagnostics: Object.freeze([]),
        data: Object.freeze({}),
      });
    },
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
