import {
  bootstrapCharacterMobileSkillTechniqueEditApp,
} from "./CharacterMobileSkillTechniqueEditApp.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const LANGUAGE_LEVELS = Object.freeze(["none", "broken", "accented", "native"]);

export async function bootstrapCharacterMobileLanguageCultureEditApp(options = {}) {
  requirePlainObject(options, "Character mobile language culture edit bootstrap options");
  const app = await bootstrapCharacterMobileSkillTechniqueEditApp(options);
  const root = options.root ?? resolveMobileRoot(options.document);

  const render = () => {
    app.render();
    injectCurrentLanguageCultureControls(root, app);
  };

  injectCurrentLanguageCultureControls(root, app);

  const MutationObserverRef = options.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof MutationObserverRef === "function"
    ? new MutationObserverRef(() => injectCurrentLanguageCultureControls(root, app))
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
    if (!["language-update", "familiarity-update"].includes(action)) return null;
    event.preventDefault?.();

    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const result = action === "language-update"
      ? app.commands.updateLanguage({
        languageId: readDataset(actionTarget, "languageId"),
        patch: readLanguagePatch(root, readDataset(actionTarget, "languageId")),
      })
      : app.commands.updateFamiliarity({
        familiarityId: readDataset(actionTarget, "familiarityId"),
        patch: readFamiliarityPatch(root, readDataset(actionTarget, "familiarityId")),
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
    languageCultureEdit: Object.freeze({
      destroy() {
        observer?.disconnect?.();
        root.removeEventListener?.("click", handleClick);
        app.skillTechniqueEdit?.destroy?.();
      },
    }),
  });
}

export function injectMobileLanguageCultureEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const language of character.languages ?? []) {
    nextHtml = appendInlineEditorToEntry(
      nextHtml,
      "language",
      language.id,
      renderLanguageInlineEditor(language),
    );
  }
  for (const familiarity of character.familiarities ?? []) {
    nextHtml = appendInlineEditorToEntry(
      nextHtml,
      "familiarity",
      familiarity.id,
      renderFamiliarityInlineEditor(familiarity),
    );
  }
  return nextHtml;
}

function injectCurrentLanguageCultureControls(root, app) {
  root.innerHTML = injectMobileLanguageCultureEditControls(
    root.innerHTML,
    app.persistence.getActiveSession().character,
    app.mode,
  );
  app.modeSync.sync();
}

function appendInlineEditorToEntry(html, kind, id, editor) {
  const marker = `data-entry-kind="${escapeAttribute(kind)}" data-canonical-id="${escapeAttribute(id)}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;
  const ddEnd = html.indexOf("</dd>", markerIndex);
  if (ddEnd < 0) return html;
  const existingEditorMarker = kind === "language"
    ? `data-role="language-inline-editor" data-language-id="${escapeAttribute(id)}"`
    : `data-role="familiarity-inline-editor" data-familiarity-id="${escapeAttribute(id)}"`;
  const existingIndex = html.indexOf(existingEditorMarker, markerIndex);
  if (existingIndex >= 0 && existingIndex < ddEnd) return html;
  return `${html.slice(0, ddEnd)}${editor}${html.slice(ddEnd)}`;
}

function renderLanguageInlineEditor(language) {
  const id = escapeAttribute(language.id);
  const tags = Array.isArray(language.tags) ? language.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__language-culture-inline-editor" data-role="language-inline-editor" data-language-id="${id}">`,
    `<label>Nome <input type="text" data-role="language-edit-name-${id}" value="${escapeAttribute(language.name ?? "")}" autocomplete="off"></label>`,
    `<label>Fala ${renderLevelSelect(`language-edit-spoken-level-${id}`, language.spokenLevel)}</label>`,
    `<label>Escrita ${renderLevelSelect(`language-edit-written-level-${id}`, language.writtenLevel)}</label>`,
    `<label>Nativo <select data-role="language-edit-native-${id}"><option value="false"${language.isNative ? "" : " selected"}>Não</option><option value="true"${language.isNative ? " selected" : ""}>Sim</option></select></label>`,
    `<label>Tags <input type="text" data-role="language-edit-tags-${id}" value="${escapeAttribute(tags)}" autocomplete="off"></label>`,
    `<label>Notas <textarea data-role="language-edit-notes-${id}" autocomplete="off">${renderTextareaText(language.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="language-update" data-language-id="${id}">Salvar idioma</button>`,
    "</div>",
  ].join("");
}

function renderFamiliarityInlineEditor(familiarity) {
  const id = escapeAttribute(familiarity.id);
  const tags = Array.isArray(familiarity.tags) ? familiarity.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__language-culture-inline-editor" data-role="familiarity-inline-editor" data-familiarity-id="${id}">`,
    `<label>Nome <input type="text" data-role="familiarity-edit-name-${id}" value="${escapeAttribute(familiarity.name ?? "")}" autocomplete="off"></label>`,
    `<label>Nativa <select data-role="familiarity-edit-native-${id}"><option value="false"${familiarity.isNative ? "" : " selected"}>Não</option><option value="true"${familiarity.isNative ? " selected" : ""}>Sim</option></select></label>`,
    `<label>Tags <input type="text" data-role="familiarity-edit-tags-${id}" value="${escapeAttribute(tags)}" autocomplete="off"></label>`,
    `<label>Notas <textarea data-role="familiarity-edit-notes-${id}" autocomplete="off">${renderTextareaText(familiarity.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="familiarity-update" data-familiarity-id="${id}">Salvar familiaridade</button>`,
    "</div>",
  ].join("");
}

function renderLevelSelect(role, activeLevel) {
  return [
    `<select data-role="${escapeAttribute(role)}">`,
    LANGUAGE_LEVELS.map(level => {
      const selected = level === activeLevel ? " selected" : "";
      return `<option value="${escapeAttribute(level)}"${selected}>${escapeText(localizedLanguageLevel(level))}</option>`;
    }).join(""),
    "</select>",
  ].join("");
}

function readLanguagePatch(root, languageId) {
  const suffix = escapeSelectorValue(languageId);
  return {
    name: readInputValue(root, `[data-role="language-edit-name-${suffix}"]`),
    spokenLevel: normalizeLanguageLevel(readInputValue(root, `[data-role="language-edit-spoken-level-${suffix}"]`)),
    writtenLevel: normalizeLanguageLevel(readInputValue(root, `[data-role="language-edit-written-level-${suffix}"]`)),
    isNative: readInputValue(root, `[data-role="language-edit-native-${suffix}"]`) === "true",
    notes: readInputValue(root, `[data-role="language-edit-notes-${suffix}"]`),
    tags: splitTextList(readInputValue(root, `[data-role="language-edit-tags-${suffix}"]`)),
  };
}

function readFamiliarityPatch(root, familiarityId) {
  const suffix = escapeSelectorValue(familiarityId);
  return {
    name: readInputValue(root, `[data-role="familiarity-edit-name-${suffix}"]`),
    isNative: readInputValue(root, `[data-role="familiarity-edit-native-${suffix}"]`) === "true",
    notes: readInputValue(root, `[data-role="familiarity-edit-notes-${suffix}"]`),
    tags: splitTextList(readInputValue(root, `[data-role="familiarity-edit-tags-${suffix}"]`)),
  };
}

function localizedLanguageLevel(level) {
  if (level === "none") return "Nenhum";
  if (level === "broken") return "Rudimentar";
  if (level === "accented") return "Com sotaque";
  if (level === "native") return "Nativo";
  return level;
}

function normalizeLanguageLevel(value) {
  return LANGUAGE_LEVELS.includes(value) ? value : "none";
}

function resolveMobileRoot(documentOption) {
  const documentRef = documentOption ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile language culture edit bootstrap requires a document");
  }
  const root = documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile language culture edit bootstrap root was not found");
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

function renderTextareaText(value) {
  return `\n${escapeText(value)}`;
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