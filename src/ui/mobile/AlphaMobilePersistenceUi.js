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

  render();
  await ui.initialize();
  render();
  return ui;
}

function renderApplicationHtml(input) {
  return [
    `<div class="singular-alpha-mobile" data-persistence-ready="true" data-busy="${input.busy}">`,
    input.sheet,
    '<section class="singular-alpha-mobile__persistence" aria-label="Persistência local">',
    '<header class="singular-alpha-mobile__persistence-header">',
    '<h2>Salvamentos locais</h2>',
    `<p>Sessão ativa: <strong>${escapeText(input.activeSession.id)}</strong> · revisão ${escapeText(input.activeSession.revision)}</p>`,
    '</header>',
    '<div class="singular-alpha-mobile__persistence-actions">',
    actionButton("persistence-save", "Salvar", input.busy),
    actionButton("persistence-refresh", "Abrir", input.busy),
    actionButton("persistence-export", "Exportar", input.busy),
    '</div>',
    renderSavedSessions(input.savedSessions, input.busy),
    '<section class="singular-alpha-mobile__import" aria-label="Importar personagem SINGULAR">',
    '<label for="singular-import-json">JSON SINGULAR</label>',
    '<textarea id="singular-import-json" data-role="persistence-import-json" rows="6" spellcheck="false"></textarea>',
    actionButton("persistence-import", "Importar", input.busy),
    '</section>',
    `<p class="singular-alpha-mobile__feedback" role="status">${escapeText(input.feedback)}</p>`,
    renderDiagnostics(input.diagnostics),
    '</section>',
    '</div>',
  ].join("");
}

function renderSavedSessions(sessions, busy) {
  if (sessions.length === 0) {
    return '<p class="singular-alpha-mobile__empty-saves">Nenhum salvamento local listado.</p>';
  }
  return [
    '<ul class="singular-alpha-mobile__save-list">',
    sessions.map(session => [
      `<li data-save-status="${escapeAttribute(session.status)}">`,
      '<span>',
      `<strong>${escapeText(session.characterName ?? session.id)}</strong>`,
      `<small>${escapeText(session.id)}</small>`,
      '</span>',
      session.status === "available"
        ? actionButton("persistence-open", "Abrir", busy, session.id)
        : '<span role="note">Ilegível</span>',
      actionButton("persistence-remove", "Excluir", busy, session.id),
      '</li>',
    ].join("")).join(""),
    '</ul>',
  ].join("");
}

function renderDiagnostics(diagnostics) {
  if (diagnostics.length === 0) return "";
  return [
    '<section class="singular-alpha-mobile__diagnostics" aria-label="Diagnósticos">',
    '<h3>Diagnósticos</h3><ul>',
    diagnostics.map(item => [
      `<li data-severity="${escapeAttribute(item.severity)}">`,
      `<strong>${escapeText(item.code ?? "diagnostic")}</strong>`,
      item.message ? `: ${escapeText(item.message)}` : "",
      '</li>',
    ].join("")).join(""),
    '</ul></section>',
  ].join("");
}

function actionButton(action, label, disabled, sessionId = null) {
  return [
    '<button type="button"',
    ` data-action="${escapeAttribute(action)}"`,
    sessionId === null ? "" : ` data-session-id="${escapeAttribute(sessionId)}"`,
    disabled ? ' disabled aria-disabled="true"' : "",
    `>${escapeText(label)}</button>`,
  ].join("");
}

async function defaultDownloadText(input) {
  const document = globalThis.document;
  const urlApi = globalThis.URL;
  if (!document || !urlApi || typeof Blob !== "function") {
    throw new Error("Browser download APIs are unavailable");
  }
  const blob = new Blob([input.text], { type: input.mimeType });
  const url = urlApi.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = input.filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    urlApi.revokeObjectURL(url);
  }
}

function validateCoordinator(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Alpha mobile persistence coordinator must be an object");
  }
  for (const method of [
    "getActiveSession",
    "initialize",
    "saveActiveSession",
    "listSavedSessions",
    "openSession",
    "removeSession",
    "exportActiveCharacter",
    "importCharacter",
  ]) {
    requireFunction(value[method], `Alpha mobile persistence coordinator ${method}`);
  }
}

function findActionTarget(target) {
  let current = target ?? null;
  while (current !== null) {
    if (readData(current, "action") !== null) return current;
    current = current.parentElement ?? null;
  }
  return null;
}

function readData(target, key) {
  if (!target || typeof target !== "object") return null;
  const value = target.dataset?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function mergeDiagnostics(...groups) {
  return groups.flatMap(group => Array.isArray(group) ? cloneValue(group) : []);
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

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} must be a function`);
  }
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
