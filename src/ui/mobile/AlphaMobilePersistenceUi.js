import {
  createCharacterMobileSheetRenderModelForCharacter,
} from "./CharacterMobileSheetComposition.js";
import {
  renderCharacterMobileSheetHtml,
} from "./CharacterMobileSheetHtml.js";

/**
 * UI mobile mínima para persistência. Recebe somente o coordenador de aplicação;
 * não conhece storage, snapshots ou formato interno dos registros.
 */
export function createAlphaMobilePersistenceUi(options = {}) {
  requirePlainObject(options, "Alpha mobile persistence UI options");
  validateCoordinator(options.persistence);
  const persistence = options.persistence;
  const downloadText = options.downloadText ?? defaultDownloadText;
  requireFunction(downloadText, "Alpha mobile downloadText");

  let savedSessions = [];
  let diagnostics = [];
  let feedback = "Persistência local pronta.";
  let busy = false;

  const ui = {
    getState() {
      return deepFreeze({
        busy,
        feedback,
        diagnostics: cloneValue(diagnostics),
        savedSessions: cloneValue(savedSessions),
        activeSessionId: persistence.getActiveSession().id,
      });
    },

    render(options = {}) {
      requirePlainObject(options, "Alpha mobile render options");
      const activeSession = persistence.getActiveSession();
      const renderModel = createCharacterMobileSheetRenderModelForCharacter(
        activeSession.character,
      );
      const sheet = renderCharacterMobileSheetHtml(renderModel, {
        mode: options.mode ?? "creation",
      });
      return renderApplicationHtml({
        sheet,
        activeSession,
        savedSessions,
        diagnostics,
        feedback,
        busy,
      });
    },

    async initialize() {
      return run(async () => {
        const initialization = await persistence.initialize();
        const listing = await persistence.listSavedSessions();
        savedSessions = listing.data.sessions ?? [];
        diagnostics = mergeDiagnostics(
          initialization.diagnostics,
          listing.diagnostics,
        );
        feedback = initialization.status === "restored"
          ? `Sessão restaurada: ${initialization.activeSessionId}`
          : initialization.status === "failed"
            ? "A restauração falhou; a sessão inicial foi preservada."
            : "Nenhuma sessão anterior válida foi restaurada.";
        return initialization;
      });
    },

    async refreshSavedSessions() {
      return run(async () => {
        const result = await persistence.listSavedSessions();
        savedSessions = result.data.sessions ?? [];
        diagnostics = result.diagnostics;
        feedback = result.status === "listed"
          ? `${savedSessions.length} salvamento(s) encontrado(s).`
          : "Não foi possível listar os salvamentos.";
        return result;
      });
    },

    async save() {
      return run(async () => {
        const result = await persistence.saveActiveSession();
        diagnostics = result.diagnostics;
        feedback = result.status === "saved"
          ? `Sessão salva: ${result.activeSessionId}`
          : "Falha ao salvar; a sessão ativa foi preservada.";
        if (result.status === "saved") {
          const listing = await persistence.listSavedSessions();
          savedSessions = listing.data.sessions ?? [];
          diagnostics = mergeDiagnostics(diagnostics, listing.diagnostics);
        }
        return result;
      });
    },

    async open(sessionId) {
      return run(async () => {
        const result = await persistence.openSession(sessionId);
        diagnostics = result.diagnostics;
        feedback = result.status === "opened"
          ? `Sessão aberta: ${result.activeSessionId}`
          : "Não foi possível abrir o salvamento; a sessão atual foi preservada.";
        return result;
      });
    },

    async remove(sessionId) {
      return run(async () => {
        const result = await persistence.removeSession(sessionId);
        diagnostics = result.diagnostics;
        feedback = result.status === "removed"
          ? `Salvamento excluído: ${sessionId}`
          : result.status === "missing"
            ? `Salvamento já ausente: ${sessionId}`
            : "Não foi possível excluir o salvamento.";
        const listing = await persistence.listSavedSessions();
        savedSessions = listing.data.sessions ?? [];
        diagnostics = mergeDiagnostics(diagnostics, listing.diagnostics);
        return result;
      });
    },

    async exportCharacter() {
      return run(async () => {
        const result = persistence.exportActiveCharacter();
        diagnostics = result.diagnostics;
        if (result.status !== "exported") {
          feedback = "Não foi possível exportar o personagem.";
          return result;
        }
        try {
          await downloadText({
            filename: result.data.filename,
            text: result.data.json,
            mimeType: "application/json",
          });
          feedback = `Personagem exportado: ${result.data.filename}`;
          return result;
        } catch (error) {
          diagnostics = [{
            severity: "blocking",
            code: "alpha-mobile-export-download-failed",
            message: errorMessage(error),
          }];
          feedback = "O documento foi criado, mas o download falhou.";
          return deepFreeze({
            status: "failed",
            changed: false,
            activeSessionId: persistence.getActiveSession().id,
            diagnostics: cloneValue(diagnostics),
            data: { filename: result.data.filename },
          });
        }
      });
    },

    async importJson(input) {
      return run(async () => {
        const result = persistence.importCharacter(input);
        diagnostics = result.diagnostics;
        feedback = result.status === "imported"
          ? `Personagem importado em nova sessão: ${result.activeSessionId}`
          : result.status === "rejected"
            ? "Documento rejeitado. A sessão atual foi preservada."
            : "A importação falhou. A sessão atual foi preservada.";
        return result;
      });
    },
  };

  async function run(operation) {
    if (busy) {
      return deepFreeze({
        status: "busy",
        changed: false,
        activeSessionId: persistence.getActiveSession().id,
        diagnostics: [],
        data: {},
      });
    }
    busy = true;
    try {
      return await operation();
    } finally {
      busy = false;
    }
  }

  return Object.freeze(ui);
}

export async function mountAlphaMobilePersistenceUi(options = {}) {
  requirePlainObject(options, "Alpha mobile mount options");
  const root = options.root;
  if (!root || typeof root !== "object") {
    throw new Error("Alpha mobile mount root must be an object");
  }
  requireFunction(root.addEventListener, "Alpha mobile mount root addEventListener");
  if (!("innerHTML" in root)) {
    throw new Error("Alpha mobile mount root must expose innerHTML");
  }

  const ui = createAlphaMobilePersistenceUi(options);
  const mode = options.mode ?? "creation";
  const render = () => {
    root.innerHTML = ui.render({ mode });
    const activeSession = options.persistence.getActiveSession();
    if (typeof root.setAttribute === "function") {
      root.setAttribute("data-singular-mounted", "true");
      root.setAttribute("data-session-id", activeSession.id);
      root.setAttribute("data-character-id", activeSession.character.identity.id);
      root.setAttribute("data-mode", mode);
    }
  };

  root.addEventListener("click", async event => {
    const actionTarget = findActionTarget(event?.target);
    if (actionTarget === null) return;
    const action = readData(actionTarget, "action");
    const sessionId = readData(actionTarget, "sessionId");

    if (action === "persistence-save") {
      await ui.save();
    } else if (action === "persistence-refresh") {
      await ui.refreshSavedSessions();
    } else if (action === "persistence-open") {
      await ui.open(sessionId);
    } else if (action === "persistence-remove") {
      await ui.remove(sessionId);
    } else if (action === "persistence-export") {
      await ui.exportCharacter();
    } else if (action === "persistence-import") {
      const input = root.querySelector?.('[data-role="persistence-import-json"]');
      await ui.importJson(input?.value ?? "");
    } else {
      return;
    }
    render();
  });

  await ui.initialize();
  render();
  return ui;
}

function renderApplicationHtml({ sheet, activeSession, savedSessions, diagnostics, feedback, busy }) {
  return [
    '<div class="singular-alpha-mobile-app" data-alpha-mobile-app>',
    '<section class="singular-alpha-mobile-persistence" aria-label="Persistência local">',
    `<p class="singular-alpha-mobile-persistence__feedback" data-busy="${busy ? "true" : "false"}">${escapeText(feedback)}</p>`,
    '<div class="singular-alpha-mobile-persistence__actions">',
    '<button type="button" data-action="persistence-save">Salvar</button>',
    '<button type="button" data-action="persistence-refresh">Abrir</button>',
    '<button type="button" data-action="persistence-export">Exportar</button>',
    '</div>',
    renderSavedSessions(activeSession.id, savedSessions),
    renderImportBox(),
    renderDiagnostics(diagnostics),
    '</section>',
    sheet,
    '</div>',
  ].join("");
}

function renderSavedSessions(activeSessionId, savedSessions) {
  if (savedSessions.length === 0) {
    return '<p class="singular-alpha-mobile-persistence__empty">Nenhum salvamento listado.</p>';
  }
  return [
    '<ul class="singular-alpha-mobile-persistence__sessions">',
    savedSessions.map(session => [
      `<li data-active="${session.id === activeSessionId ? "true" : "false"}">`,
      `<span>${escapeText(session.label ?? session.id)}</span>`,
      `<button type="button" data-action="persistence-open" data-session-id="${escapeAttribute(session.id)}">Abrir</button>`,
      `<button type="button" data-action="persistence-remove" data-session-id="${escapeAttribute(session.id)}">Excluir</button>`,
      '</li>',
    ].join("")).join(""),
    '</ul>',
  ].join("");
}

function renderImportBox() {
  return [
    '<details class="singular-alpha-mobile-persistence__import">',
    '<summary>Importar JSON SINGULAR</summary>',
    '<textarea data-role="persistence-import-json" rows="4" spellcheck="false"></textarea>',
    '<button type="button" data-action="persistence-import">Importar</button>',
    '</details>',
  ].join("");
}

function renderDiagnostics(diagnostics) {
  if (!Array.isArray(diagnostics) || diagnostics.length === 0) return "";
  return [
    '<ul class="singular-alpha-mobile-persistence__diagnostics">',
    diagnostics.map(diagnostic => [
      `<li data-severity="${escapeAttribute(diagnostic.severity ?? "info")}">`,
      escapeText(diagnostic.message ?? diagnostic.code ?? "Diagnóstico sem mensagem."),
      '</li>',
    ].join("")).join(""),
    '</ul>',
  ].join("");
}

function findActionTarget(target) {
  let node = target;
  while (node && typeof node.getAttribute === "function") {
    if (node.getAttribute("data-action")) return node;
    node = node.parentNode;
  }
  return null;
}

function readData(node, key) {
  if (!node || typeof node.getAttribute !== "function") return null;
  return node.getAttribute(`data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
}

function validateCoordinator(persistence) {
  requireFunction(persistence?.getActiveSession, "Alpha mobile persistence getActiveSession");
  requireFunction(persistence?.initialize, "Alpha mobile persistence initialize");
  requireFunction(persistence?.listSavedSessions, "Alpha mobile persistence listSavedSessions");
  requireFunction(persistence?.saveActiveSession, "Alpha mobile persistence saveActiveSession");
  requireFunction(persistence?.openSession, "Alpha mobile persistence openSession");
  requireFunction(persistence?.removeSession, "Alpha mobile persistence removeSession");
  requireFunction(persistence?.exportActiveCharacter, "Alpha mobile persistence exportActiveCharacter");
  requireFunction(persistence?.importCharacter, "Alpha mobile persistence importCharacter");
}

function defaultDownloadText({ filename, text, mimeType }) {
  if (typeof document === "undefined") return Promise.resolve({ filename, text, mimeType });
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return Promise.resolve({ filename, text, mimeType });
}

function mergeDiagnostics(...groups) {
  return groups.flatMap(group => Array.isArray(group) ? group : []);
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

function requireFunction(value, label) {
  if (typeof value !== "function") throw new Error(`${label} must be a function`);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}
