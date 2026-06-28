import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const LANGUAGE_LEVELS = Object.freeze(["none", "broken", "accented", "native"]);

export async function bootstrapCharacterMobileLanguageCultureApp(options = {}) {
  requirePlainObject(options, "Character mobile language/culture bootstrap options");
  const app = await bootstrapCharacterMobileApp(options);
  const root = options.root ?? resolveMobileRoot(options.document);

  const render = () => {
    const session = app.persistence.getActiveSession();
    root.innerHTML = app.ui.render({ mode: app.mode });
    setMobileRootAttributes(root, session, app.mode);
    enhanceLanguageCultureSection(root, session.character, app.mode);
    app.modeSync.sync();
  };

  enhanceLanguageCultureSection(root, app.persistence.getActiveSession().character, app.mode);

  const observer = typeof options.MutationObserver === "function"
    ? new options.MutationObserver(() => {
      enhanceLanguageCultureSection(root, app.persistence.getActiveSession().character, app.mode);
    })
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
    if (!isLanguageCultureAction(action)) return null;
    event.preventDefault?.();

    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const result = executeLanguageCultureAction(action, actionTarget, root, app.commands);
    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    ...app,
    render,
    languageCulture: Object.freeze({
      enhance() {
        enhanceLanguageCultureSection(root, app.persistence.getActiveSession().character, app.mode);
      },
      destroy() {
        observer?.disconnect?.();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectLanguageCultureCreationControls(html, character, mode) {
  if (mode !== "creation") return html;
  const marker = 'data-card="languages-culture"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;
  const headerEnd = html.indexOf("</h2>", markerIndex);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  if (headerEnd < 0 || sectionEnd < 0) return html;

  const beforeBody = html.slice(0, headerEnd + "</h2>".length);
  const body = html.slice(headerEnd + "</h2>".length, sectionEnd);
  const afterBody = html.slice(sectionEnd);
  return [
    beforeBody,
    renderLanguageCultureEditors(),
    injectLanguageCultureItemControls(body, character),
    afterBody,
  ].join("");
}

function enhanceLanguageCultureSection(root, character, mode) {
  if (mode !== "creation") return;
  const section = root.querySelector?.('[data-card="languages-culture"]');
  if (section === null || section === undefined) return;
  if (section.querySelector?.('[data-role="language-editor"]') === null) {
    section.querySelector?.("h2")?.insertAdjacentHTML?.("afterend", renderLanguageCultureEditors());
  }
  enhanceLanguageCultureItems(section, character);
}

function enhanceLanguageCultureItems(section, character) {
  const languageIds = new Set((character.languages ?? []).map(language => language.id));
  const familiarityIds = new Set((character.familiarities ?? []).map(familiarity => familiarity.id));
  const languageItems = [...section.querySelectorAll?.('[data-entry-kind="language"][data-canonical-id]') ?? []];
  const familiarityItems = [...section.querySelectorAll?.('[data-entry-kind="familiarity"][data-canonical-id]') ?? []];

  languageItems.forEach((item, index) => {
    const languageId = item.getAttribute("data-canonical-id");
    if (!languageIds.has(languageId) || item.querySelector?.('[data-role="language-actions"]') !== null) return;
    item.querySelector?.("dd")?.insertAdjacentHTML?.(
      "beforeend",
      renderLanguageControls(languageId, index, languageItems.length, item.querySelector?.("dt")?.textContent ?? "idioma"),
    );
  });

  familiarityItems.forEach((item, index) => {
    const familiarityId = item.getAttribute("data-canonical-id");
    if (!familiarityIds.has(familiarityId) || item.querySelector?.('[data-role="familiarity-actions"]') !== null) return;
    item.querySelector?.("dd")?.insertAdjacentHTML?.(
      "beforeend",
      renderFamiliarityControls(familiarityId, index, familiarityItems.length, item.querySelector?.("dt")?.textContent ?? "familiaridade"),
    );
  });
}

function injectLanguageCultureItemControls(html, character) {
  let nextHtml = html;
  for (const [index, language] of (character.languages ?? []).entries()) {
    nextHtml = appendControlsToEntry(
      nextHtml,
      "language",
      language.id,
      renderLanguageControls(language.id, index, character.languages.length, language.name || "idioma"),
    );
  }
  for (const [index, familiarity] of (character.familiarities ?? []).entries()) {
    nextHtml = appendControlsToEntry(
      nextHtml,
      "familiarity",
      familiarity.id,
      renderFamiliarityControls(familiarity.id, index, character.familiarities.length, familiarity.name || "familiaridade"),
    );
  }
  return nextHtml;
}

function appendControlsToEntry(html, kind, id, controls) {
  const marker = `data-entry-kind="${escapeAttribute(kind)}" data-canonical-id="${escapeAttribute(id)}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;
  const itemEnd = html.indexOf("</dd>", markerIndex);
  if (itemEnd < 0) return html;
  return `${html.slice(0, itemEnd)}${controls}${html.slice(itemEnd)}`;
}

function renderLanguageCultureEditors() {
  return [
    '<div class="singular-mobile-sheet__language-editor" data-role="language-editor">',
    '<h3>Novo idioma</h3>',
    '<label>Nome<input type="text" data-role="language-name" autocomplete="off"></label>',
    `<label>Fala${renderLevelSelect("language-spoken-level")}</label>`,
    `<label>Escrita${renderLevelSelect("language-written-level")}</label>`,
    '<label>Nativo<select data-role="language-native"><option value="false">Não</option><option value="true">Sim</option></select></label>',
    '<label>Tags<input type="text" data-role="language-tags" autocomplete="off"></label>',
    '<label>Notas<input type="text" data-role="language-notes" autocomplete="off"></label>',
    '<button type="button" data-action="language-add">Adicionar idioma</button>',
    "</div>",
    '<div class="singular-mobile-sheet__familiarity-editor" data-role="familiarity-editor">',
    '<h3>Nova familiaridade cultural</h3>',
    '<label>Nome<input type="text" data-role="familiarity-name" autocomplete="off"></label>',
    '<label>Nativa<select data-role="familiarity-native"><option value="false">Não</option><option value="true">Sim</option></select></label>',
    '<label>Tags<input type="text" data-role="familiarity-tags" autocomplete="off"></label>',
    '<label>Notas<input type="text" data-role="familiarity-notes" autocomplete="off"></label>',
    '<button type="button" data-action="familiarity-add">Adicionar familiaridade</button>',
    "</div>",
  ].join("");
}

function renderLevelSelect(role) {
  return [
    `<select data-role="${role}">`,
    '<option value="none">Nenhum</option>',
    '<option value="broken">Rudimentar</option>',
    '<option value="accented">Com sotaque</option>',
    '<option value="native">Nativo</option>',
    "</select>",
  ].join("");
}

function renderLanguageControls(languageId, index, total, label) {
  const id = escapeAttribute(languageId);
  const name = escapeAttribute(label || "idioma");
  const up = index > 0
    ? `<button type="button" data-action="language-reorder" data-language-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="language-reorder" data-language-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__language-actions" data-role="language-actions">',
    up,
    down,
    `<button type="button" data-action="language-remove" data-language-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderFamiliarityControls(familiarityId, index, total, label) {
  const id = escapeAttribute(familiarityId);
  const name = escapeAttribute(label || "familiaridade");
  const up = index > 0
    ? `<button type="button" data-action="familiarity-reorder" data-familiarity-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="familiarity-reorder" data-familiarity-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__familiarity-actions" data-role="familiarity-actions">',
    up,
    down,
    `<button type="button" data-action="familiarity-remove" data-familiarity-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function executeLanguageCultureAction(action, actionTarget, root, commands) {
  if (action === "language-add") return commands.addLanguage(readLanguageDraft(root));
  if (action === "language-remove") return commands.removeLanguage({ languageId: readDataset(actionTarget, "languageId") });
  if (action === "language-reorder") {
    return commands.reorderLanguage({
      languageId: readDataset(actionTarget, "languageId"),
      targetIndex: readNumberDataset(actionTarget, "targetIndex"),
    });
  }
  if (action === "familiarity-add") return commands.addFamiliarity(readFamiliarityDraft(root));
  if (action === "familiarity-remove") return commands.removeFamiliarity({ familiarityId: readDataset(actionTarget, "familiarityId") });
  return commands.reorderFamiliarity({
    familiarityId: readDataset(actionTarget, "familiarityId"),
    targetIndex: readNumberDataset(actionTarget, "targetIndex"),
  });
}

function readLanguageDraft(root) {
  return {
    language: {
      name: readInputValue(root, '[data-role="language-name"]'),
      spokenLevel: normalizeLanguageLevel(readInputValue(root, '[data-role="language-spoken-level"]')),
      writtenLevel: normalizeLanguageLevel(readInputValue(root, '[data-role="language-written-level"]')),
      isNative: readInputValue(root, '[data-role="language-native"]') === "true",
      notes: readInputValue(root, '[data-role="language-notes"]'),
      tags: splitTextList(readInputValue(root, '[data-role="language-tags"]')),
    },
  };
}

function readFamiliarityDraft(root) {
  return {
    familiarity: {
      name: readInputValue(root, '[data-role="familiarity-name"]'),
      isNative: readInputValue(root, '[data-role="familiarity-native"]') === "true",
      notes: readInputValue(root, '[data-role="familiarity-notes"]'),
      tags: splitTextList(readInputValue(root, '[data-role="familiarity-tags"]')),
    },
  };
}

function isLanguageCultureAction(action) {
  return [
    "language-add",
    "language-remove",
    "language-reorder",
    "familiarity-add",
    "familiarity-remove",
    "familiarity-reorder",
  ].includes(action);
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
    throw new Error("Character mobile language/culture bootstrap requires a document");
  }
  const root = documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile language/culture bootstrap root was not found");
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

function normalizeLanguageLevel(value) {
  return LANGUAGE_LEVELS.includes(value) ? value : "none";
}

function splitTextList(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map(item => item.trim()).filter(Boolean);
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
