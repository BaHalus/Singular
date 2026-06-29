import {
  bootstrapCharacterMobileSecondaryNotesApp,
  injectMobileSecondaryNotesControls,
} from "./CharacterMobileSecondaryNotesApp.js";
import { injectLanguageCultureCreationControls } from "./CharacterMobileLanguageCultureApp.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const TRAIT_ROLES = Object.freeze([
  ["advantage", "Vantagem"],
  ["disadvantage", "Desvantagem"],
  ["perk", "Peculiaridade positiva"],
  ["quirk", "Peculiaridade negativa"],
  ["feature", "Característica"],
]);

export async function bootstrapCharacterMobileTraitEditApp(options = {}) {
  requirePlainObject(options, "Character mobile trait edit bootstrap options");
  const app = await bootstrapCharacterMobileSecondaryNotesApp(options);
  const root = options.root ?? resolveMobileRoot(options.document);

  const render = () => {
    const session = app.persistence.getActiveSession();
    root.innerHTML = injectMobileTraitEditControls(
      injectMobileSecondaryNotesControls(
        injectLanguageCultureCreationControls(
          app.ui.render({ mode: app.mode }),
          session.character,
          app.mode,
        ),
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
      root.innerHTML = injectMobileTraitEditControls(
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
    if (action !== "trait-update") return null;
    event.preventDefault?.();

    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const traitId = readDataset(actionTarget, "traitId");
    const result = app.commands.updateTrait({
      traitId,
      patch: readTraitPatch(root, traitId, app.persistence.getActiveSession().character),
    });
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
    traitEdit: Object.freeze({
      destroy() {
        observer?.disconnect?.();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectMobileTraitEditControls(html, character, mode) {
  const marker = 'data-card="traits"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;

  const sectionStart = html.lastIndexOf("<section", markerIndex);
  const headerEnd = html.indexOf("</h2>", markerIndex);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  if (sectionStart < 0 || headerEnd < 0 || sectionEnd < 0) return html;

  return [
    html.slice(0, sectionStart),
    html.slice(sectionStart, headerEnd + "</h2>".length),
    renderTraitBody(character.traits ?? [], mode),
    "</section>",
    html.slice(sectionEnd + "</section>".length),
  ].join("");
}

function renderTraitBody(traits, mode) {
  const editor = mode === "creation" ? renderTraitCreationEditor() : "";
  const list = traits.length === 0
    ? '<p class="singular-mobile-sheet__empty">Nenhum traço declarado.</p>'
    : [
      '<dl class="singular-mobile-sheet__trait-list">',
      traits.map((trait, index) => renderTraitItem(trait, mode, index, traits.length)).join(""),
      "</dl>",
    ].join("");
  return `${editor}${list}`;
}

function renderTraitCreationEditor() {
  return [
    '<div class="singular-mobile-sheet__trait-editor" data-role="trait-editor">',
    '<label>Nome<input type="text" data-role="trait-name" autocomplete="off"></label>',
    `<label>Tipo<select data-role="trait-role">${renderRoleOptions("advantage")}</select></label>`,
    '<label>Pontos<input type="number" step="1" data-role="trait-points"></label>',
    '<label>Níveis<input type="number" min="0" step="1" data-role="trait-levels"></label>',
    '<label>Tags<input type="text" data-role="trait-tags" autocomplete="off"></label>',
    '<label>Notas<input type="text" data-role="trait-notes" autocomplete="off"></label>',
    '<button type="button" data-action="trait-add">Adicionar traço</button>',
    "</div>",
  ].join("");
}

function renderTraitItem(trait, mode, index, total) {
  const id = escapeAttribute(trait.id);
  const controls = mode === "creation" ? renderTraitControls(trait, index, total) : "";
  const editor = mode === "creation" ? renderTraitInlineEditor(trait) : "";
  return [
    `<div data-trait-id="${id}" data-trait-role="${escapeAttribute(trait.role ?? "trait")}">`,
    `<dt>${escapeText(localizedTraitRole(trait.role))}</dt>`,
    `<dd>${escapeText(trait.name ?? "Traço sem nome")}${renderTraitDetails(trait)}${controls}${editor}</dd>`,
    "</div>",
  ].join("");
}

function renderTraitControls(trait, index, total) {
  const id = escapeAttribute(trait.id);
  const name = escapeAttribute(trait.name ?? "traço");
  const up = index > 0
    ? `<button type="button" data-action="trait-reorder" data-trait-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="trait-reorder" data-trait-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__trait-actions">',
    up,
    down,
    `<button type="button" data-action="trait-remove" data-trait-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderTraitInlineEditor(trait) {
  const id = escapeAttribute(trait.id);
  const tags = Array.isArray(trait.tags) ? trait.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__trait-inline-editor" data-role="trait-inline-editor" data-trait-id="${id}">`,
    `<label>Nome <input type="text" data-role="trait-edit-name-${id}" value="${escapeAttribute(trait.name ?? "")}" autocomplete="off"></label>`,
    `<label>Tipo <select data-role="trait-edit-role-${id}">${renderRoleOptions(trait.role)}</select></label>`,
    `<label>Pontos <input type="number" step="1" data-role="trait-edit-points-${id}" value="${escapeAttribute(trait.points ?? "")}"></label>`,
    `<label>Níveis <input type="number" min="0" step="1" data-role="trait-edit-levels-${id}" value="${escapeAttribute(trait.levels ?? "")}"></label>`,
    `<label>Tags <input type="text" data-role="trait-edit-tags-${id}" value="${escapeAttribute(tags)}" autocomplete="off"></label>`,
    `<label>Notas <input type="text" data-role="trait-edit-notes-${id}" value="${escapeAttribute(trait.notes ?? "")}" autocomplete="off"></label>`,
    `<button type="button" data-action="trait-update" data-trait-id="${id}">Salvar traço</button>`,
    "</div>",
  ].join("");
}

function renderRoleOptions(activeRole) {
  const knownRoles = TRAIT_ROLES.map(([value]) => value);
  const customRoleOption = typeof activeRole === "string" && activeRole !== "" && !knownRoles.includes(activeRole)
    ? [[activeRole, activeRole]]
    : [];
  return [...customRoleOption, ...TRAIT_ROLES].map(([value, label]) => {
    const selected = value === activeRole ? " selected" : "";
    return `<option value="${escapeAttribute(value)}"${selected}>${escapeText(label)}</option>`;
  }).join("");
}

function renderTraitDetails(trait) {
  const details = [];
  if (trait.points !== undefined && trait.points !== null) details.push(`${formatValue(trait.points)} pts`);
  if (trait.levels !== undefined && trait.levels !== null) details.push(`Nv ${formatValue(trait.levels)}`);
  if (trait.notes) details.push(trait.notes);
  if (Array.isArray(trait.tags) && trait.tags.length > 0) details.push(`Tags ${trait.tags.join(", ")}`);
  if (details.length === 0) return "";
  return ` <small>${escapeText(details.join(" · "))}</small>`;
}

function readTraitPatch(root, traitId, character) {
  const suffix = escapeSelectorValue(traitId);
  const existingTrait = findTrait(character, traitId);
  const points = readInputNumber(root, `[data-role="trait-edit-points-${suffix}"]`, null);
  const levels = readInputNumber(root, `[data-role="trait-edit-levels-${suffix}"]`, null);
  const patch = {
    name: readInputValue(root, `[data-role="trait-edit-name-${suffix}"]`),
    role: readInputValue(root, `[data-role="trait-edit-role-${suffix}"]`) || existingTrait?.role || "advantage",
    points,
    levels,
    notes: readInputValue(root, `[data-role="trait-edit-notes-${suffix}"]`),
    tags: splitTextList(readInputValue(root, `[data-role="trait-edit-tags-${suffix}"]`)),
    pointValue: {
      declaredPoints: points,
      levels,
    },
  };

  preserveExistingTraitField(patch, existingTrait, "selfControl");
  preserveExistingTraitField(patch, existingTrait, "frequency");
  preserveExistingTraitField(patch, existingTrait, "roundCostDown");
  preserveExistingTraitField(patch, existingTrait, "source");
  if (Array.isArray(existingTrait?.choices)) patch.choices = [...existingTrait.choices];

  return patch;
}

function preserveExistingTraitField(patch, trait, field) {
  if (
    trait !== null &&
    trait !== undefined &&
    Object.prototype.hasOwnProperty.call(trait, field) &&
    trait[field] !== undefined
  ) {
    patch[field] = trait[field];
  }
}

function findTrait(character, traitId) {
  return (character?.traits ?? []).find(trait => trait.id === traitId) ?? null;
}

function localizedTraitRole(role) {
  if (role === "advantage") return "Vantagem";
  if (role === "disadvantage") return "Desvantagem";
  if (role === "perk") return "Peculiaridade positiva";
  if (role === "quirk") return "Peculiaridade negativa";
  if (role === "feature") return "Característica";
  return role || "Traço";
}

function setMobileRootAttributes(root, session, mode) {
  root.setAttribute?.("data-session-id", session.id);
  root.setAttribute?.("data-character-id", session.character.identity.id);
  root.setAttribute?.("data-mode", mode);
}

function resolveMobileRoot(documentOption) {
  const documentRef = documentOption ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile trait edit bootstrap requires a document");
  }
  const root = documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile trait edit bootstrap root was not found");
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
