import { renderCharacterMobileApp } from "./CharacterMobileApp.js";
import {
  bootstrapCharacterMobileLanguageCultureApp,
  injectLanguageCultureCreationControls,
} from "./CharacterMobileLanguageCultureApp.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const SECONDARY_KEYS = Object.freeze(["HP", "FP", "Will", "Per", "BasicSpeed", "BasicMove"]);
const POOL_MAXIMUM_KEYS = Object.freeze(["HP", "FP"]);

export async function bootstrapCharacterMobileSecondaryNotesApp(options = {}) {
  requirePlainObject(options, "Character mobile secondary/notes bootstrap options");
  const app = await bootstrapCharacterMobileLanguageCultureApp(options);
  const root = options.root ?? resolveMobileRoot(options.document);

  const render = () => {
    const session = app.persistence.getActiveSession();
    root.innerHTML = injectMobileSecondaryNotesControls(
      injectLanguageCultureCreationControls(
        renderCharacterMobileApp(session.character, { mode: app.mode }),
        session.character,
        app.mode,
      ),
      session.character,
      app.mode,
    );
    setMobileRootAttributes(root, session, app.mode);
    app.modeSync.sync();
  };

  render();

  const MutationObserverRef = options.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof MutationObserverRef === "function"
    ? new MutationObserverRef(() => {
      root.innerHTML = injectMobileSecondaryNotesControls(
        root.innerHTML,
        app.persistence.getActiveSession().character,
        app.mode,
      );
    })
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
    if (!isSecondaryNotesAction(action)) return null;
    event.preventDefault?.();

    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const result = executeSecondaryNotesAction(action, actionTarget, root, app.commands);
    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    get character() {
      return app.character;
    },
    get session() {
      return app.session;
    },
    get html() {
      return root.innerHTML;
    },
    get mode() {
      return app.mode;
    },
    interactions: app.interactions,
    modeSync: app.modeSync,
    ui: app.ui,
    persistence: app.persistence,
    commands: app.commands,
    repositories: app.repositories,
    runtime: app.runtime,
    render,
    secondaryNotes: Object.freeze({
      destroy() {
        observer?.disconnect?.();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectMobileSecondaryNotesControls(html, character, mode) {
  return injectNotesCard(
    injectSecondaryControls(html, character, mode),
    character,
    mode,
  );
}

function injectSecondaryControls(html, character, mode) {
  const marker = 'data-card="secondary-characteristics"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;

  const sectionStart = html.lastIndexOf("<section", markerIndex);
  const headerEnd = html.indexOf("</h2>", markerIndex);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  if (sectionStart < 0 || headerEnd < 0 || sectionEnd < 0) return html;

  return [
    html.slice(0, sectionStart),
    html.slice(sectionStart, headerEnd + "</h2>".length),
    renderSecondaryBody(character.secondaryCharacteristics ?? {}, character.pools ?? {}, mode),
    "</section>",
    html.slice(sectionEnd + "</section>".length),
  ].join("");
}

function renderSecondaryBody(secondaryCharacteristics, pools, mode) {
  return [
    '<dl class="singular-mobile-sheet__secondary-list">',
    SECONDARY_KEYS.map(key => renderSecondaryItem(key, secondaryCharacteristics[key], pools[key], mode)).join(""),
    "</dl>",
  ].join("");
}

function renderSecondaryItem(key, characteristic = {}, pool = null, mode) {
  const base = characteristic.base ?? null;
  const override = characteristic.override ?? null;
  const controls = mode === "creation" ? renderSecondaryControls(key, base, override, pool) : "";
  return [
    `<div data-secondary-key="${escapeAttribute(key)}">`,
    `<dt>${escapeText(secondaryLabel(key))}</dt>`,
    `<dd>Base ${formatValue(base)}${override === null ? "" : ` · ajuste ${formatValue(override)}`}${renderPoolMaximum(key, pool)}${controls}</dd>`,
    "</div>",
  ].join("");
}

function renderSecondaryControls(key, base, override, pool) {
  const escapedKey = escapeAttribute(key);
  const baseValue = base === null ? "" : escapeAttribute(base);
  const overrideValue = override === null ? "" : escapeAttribute(override);
  const poolControls = POOL_MAXIMUM_KEYS.includes(key) && pool !== null && pool !== undefined
    ? [
      `<label>Máximo <input type="number" step="1" data-role="pool-maximum-${escapedKey}" value="${escapeAttribute(pool.maximum)}"></label>`,
      `<button type="button" data-action="pool-maximum-set" data-pool-key="${escapedKey}">Aplicar máximo</button>`,
    ].join("")
    : "";
  return [
    '<span class="singular-mobile-sheet__secondary-actions">',
    `<label>Base <input type="number" step="0.25" data-role="secondary-base-${escapedKey}" value="${baseValue}"></label>`,
    `<button type="button" data-action="secondary-base-set" data-secondary-key="${escapedKey}">Aplicar base</button>`,
    `<label>Ajuste <input type="number" step="0.25" data-role="secondary-override-${escapedKey}" value="${overrideValue}"></label>`,
    `<button type="button" data-action="secondary-override-set" data-secondary-key="${escapedKey}">Aplicar ajuste</button>`,
    `<button type="button" data-action="secondary-override-clear" data-secondary-key="${escapedKey}">Limpar ajuste</button>`,
    poolControls,
    "</span>",
  ].join("");
}

function renderPoolMaximum(key, pool) {
  if (!POOL_MAXIMUM_KEYS.includes(key) || pool === null || pool === undefined) return "";
  return ` · máximo ${formatValue(pool.maximum)}`;
}

function injectNotesCard(html, character, mode) {
  if (html.includes('data-card="notes"')) return html;
  const mainEnd = html.indexOf("</main>");
  if (mainEnd < 0) return html;
  return `${html.slice(0, mainEnd)}${renderNotesCard(character.notes, mode)}${html.slice(mainEnd)}`;
}

function renderNotesCard(notes = {}, mode) {
  const general = typeof notes.general === "string" ? notes.general : "";
  const structured = Array.isArray(notes.structured) ? notes.structured : [];
  return [
    '<section class="singular-mobile-sheet__card" data-card="notes" data-status="available">',
    "<h2>Notas</h2>",
    mode === "creation" ? renderNotesEditors(general) : "",
    renderGeneralNotes(general),
    renderStructuredNotes(structured, mode),
    "</section>",
  ].join("");
}

function renderNotesEditors(general) {
  return [
    '<div class="singular-mobile-sheet__general-notes-editor" data-role="general-notes-editor">',
    `<label>Notas gerais<textarea data-role="notes-general">${escapeText(general)}</textarea></label>`,
    '<button type="button" data-action="notes-general-save">Salvar notas gerais</button>',
    "</div>",
    '<div class="singular-mobile-sheet__structured-note-editor" data-role="structured-note-editor">',
    "<h3>Nova nota</h3>",
    '<label>Título<input type="text" data-role="note-title" autocomplete="off"></label>',
    '<label>Texto<input type="text" data-role="note-text" autocomplete="off"></label>',
    '<label>Categoria<input type="text" data-role="note-category" autocomplete="off"></label>',
    '<label>Referência<input type="text" data-role="note-reference" autocomplete="off"></label>',
    '<label>Tags<input type="text" data-role="note-tags" autocomplete="off"></label>',
    '<button type="button" data-action="note-add">Adicionar nota</button>',
    "</div>",
  ].join("");
}

function renderGeneralNotes(general) {
  if (general === "") return '<p class="singular-mobile-sheet__empty">Nenhuma nota geral declarada.</p>';
  return `<p data-role="notes-general-display">${escapeText(general)}</p>`;
}

function renderStructuredNotes(notes, mode) {
  if (notes.length === 0) return '<p class="singular-mobile-sheet__empty">Nenhuma nota estruturada.</p>';
  return [
    '<dl class="singular-mobile-sheet__structured-note-list">',
    notes.map((note, index) => renderStructuredNote(note, index, notes.length, mode)).join(""),
    "</dl>",
  ].join("");
}

function renderStructuredNote(note, index, total, mode) {
  const controls = mode === "creation" ? renderStructuredNoteControls(note, index, total) : "";
  const editor = mode === "creation" ? renderStructuredNoteInlineEditor(note) : "";
  const details = [note.category, note.reference, ...(note.tags ?? []).map(tag => `#${tag}`)].filter(Boolean).join(" · ");
  return [
    `<div data-note-id="${escapeAttribute(note.id)}">`,
    `<dt>${escapeText(note.title || "Nota sem título")}</dt>`,
    `<dd>${escapeText(note.text || "")}${details === "" ? "" : ` <small>${escapeText(details)}</small>`}${controls}${editor}</dd>`,
    "</div>",
  ].join("");
}

function renderStructuredNoteControls(note, index, total) {
  const id = escapeAttribute(note.id);
  const title = escapeAttribute(note.title || "nota");
  const up = index > 0
    ? `<button type="button" data-action="note-reorder" data-note-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${title} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="note-reorder" data-note-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${title} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__note-actions">',
    up,
    down,
    `<button type="button" data-action="note-remove" data-note-id="${id}" aria-label="Excluir ${title}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderStructuredNoteInlineEditor(note) {
  const id = escapeAttribute(note.id);
  const tags = Array.isArray(note.tags) ? note.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__structured-note-inline-editor" data-role="structured-note-inline-editor" data-note-id="${id}">`,
    `<label>Título <input type="text" data-role="note-edit-title-${id}" value="${escapeAttribute(note.title ?? "")}" autocomplete="off"></label>`,
    `<label>Texto <input type="text" data-role="note-edit-text-${id}" value="${escapeAttribute(note.text ?? "")}" autocomplete="off"></label>`,
    `<label>Categoria <input type="text" data-role="note-edit-category-${id}" value="${escapeAttribute(note.category ?? "")}" autocomplete="off"></label>`,
    `<label>Referência <input type="text" data-role="note-edit-reference-${id}" value="${escapeAttribute(note.reference ?? "")}" autocomplete="off"></label>`,
    `<label>Tags <input type="text" data-role="note-edit-tags-${id}" value="${escapeAttribute(tags)}" autocomplete="off"></label>`,
    `<button type="button" data-action="note-update" data-note-id="${id}">Salvar nota</button>`,
    "</div>",
  ].join("");
}

function executeSecondaryNotesAction(action, actionTarget, root, commands) {
  if (action === "secondary-base-set") {
    const characteristicKey = readDataset(actionTarget, "secondaryKey");
    return commands.setSecondaryBase({
      characteristicKey,
      base: readInputNumber(root, `[data-role="secondary-base-${escapeSelectorValue(characteristicKey)}"]`, null),
    });
  }
  if (action === "secondary-override-set") {
    const characteristicKey = readDataset(actionTarget, "secondaryKey");
    return commands.setSecondaryOverride({
      characteristicKey,
      override: readInputNumber(root, `[data-role="secondary-override-${escapeSelectorValue(characteristicKey)}"]`, null),
    });
  }
  if (action === "secondary-override-clear") {
    return commands.clearSecondaryOverride({ characteristicKey: readDataset(actionTarget, "secondaryKey") });
  }
  if (action === "pool-maximum-set") {
    const poolKey = readDataset(actionTarget, "poolKey");
    return commands.setPoolMaximum({
      poolKey,
      maximum: readInputNumber(root, `[data-role="pool-maximum-${escapeSelectorValue(poolKey)}"]`, null),
    });
  }
  if (action === "notes-general-save") {
    return commands.setGeneralNotes({ text: readInputValue(root, '[data-role="notes-general"]') });
  }
  if (action === "note-add") return commands.addStructuredNote({ note: readStructuredNoteDraft(root) });
  if (action === "note-update") {
    const noteId = readDataset(actionTarget, "noteId");
    return commands.updateStructuredNote({
      noteId,
      patch: readStructuredNotePatch(root, noteId),
    });
  }
  if (action === "note-remove") return commands.removeStructuredNote({ noteId: readDataset(actionTarget, "noteId") });
  return commands.reorderStructuredNote({
    noteId: readDataset(actionTarget, "noteId"),
    targetIndex: readNumberDataset(actionTarget, "targetIndex"),
  });
}

function readStructuredNoteDraft(root) {
  return {
    title: readInputValue(root, '[data-role="note-title"]'),
    text: readInputValue(root, '[data-role="note-text"]'),
    category: normalizeOptionalText(readInputValue(root, '[data-role="note-category"]')),
    reference: normalizeOptionalText(readInputValue(root, '[data-role="note-reference"]')),
    tags: splitTextList(readInputValue(root, '[data-role="note-tags"]')),
    metadata: {},
  };
}

function readStructuredNotePatch(root, noteId) {
  const suffix = escapeSelectorValue(noteId);
  return {
    title: readInputValue(root, `[data-role="note-edit-title-${suffix}"]`),
    text: readInputValue(root, `[data-role="note-edit-text-${suffix}"]`),
    category: normalizeOptionalText(readInputValue(root, `[data-role="note-edit-category-${suffix}"]`)),
    reference: normalizeOptionalText(readInputValue(root, `[data-role="note-edit-reference-${suffix}"]`)),
    tags: splitTextList(readInputValue(root, `[data-role="note-edit-tags-${suffix}"]`)),
  };
}

function isSecondaryNotesAction(action) {
  return [
    "secondary-base-set",
    "secondary-override-set",
    "secondary-override-clear",
    "pool-maximum-set",
    "notes-general-save",
    "note-add",
    "note-update",
    "note-remove",
    "note-reorder",
  ].includes(action);
}

function secondaryLabel(key) {
  if (key === "HP") return "PV máximo";
  if (key === "FP") return "PF máximo";
  if (key === "Will") return "Vontade";
  if (key === "Per") return "Percepção";
  if (key === "BasicSpeed") return "Velocidade Básica";
  if (key === "BasicMove") return "Deslocamento Básico";
  return key;
}

function setMobileRootAttributes(root, session, mode) {
  root.setAttribute?.("data-singular-mounted", "true");
  root.setAttribute?.("data-session-id", session.id);
  root.setAttribute?.("data-character-id", session.character.identity.id);
  root.setAttribute?.("data-mode", mode);
}

function resolveMobileRoot(documentOption) {
  const documentRef = documentOption ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile secondary/notes bootstrap requires a document");
  }
  const root = documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile secondary/notes bootstrap root was not found");
  }
  return root;
}

function findDataTarget(target, key) {
  let current = target ?? null;
  while (current !== null) {
    if (readDataset(current, key) !== null) return current;
    current = current.parentElement ?? null;
  }
  return null;
}

function readDataset(target, key) {
  if (!target || typeof target !== "object") return null;
  const value = target.dataset?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function readNumberDataset(target, key) {
  const value = readDataset(target, key);
  return value === null ? Number.NaN : Number(value);
}

function readInputValue(root, selector) {
  const input = root.querySelector?.(selector);
  return typeof input?.value === "string" ? input.value : "";
}

function readInputNumber(root, selector, fallback) {
  const raw = readInputValue(root, selector);
  if (raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function splitTextList(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function escapeSelectorValue(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
