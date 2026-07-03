import {
  bootstrapCharacterMobileSkillTechniqueEditApp,
} from "./CharacterMobileSkillTechniqueEditApp.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "./CharacterMobilePostRenderLifecycle.js";
import {
  appendInlineEditorToDefinitionListItem,
  appendInlineEditorToDefinitionListItemNode,
  escapeAttribute,
  escapeSelectorValue,
  findDataTarget,
  readDataset,
  readInputValue,
  renderTextareaText,
  requirePlainObject,
  resolveMobileRoot,
  splitTextList,
} from "./MobileInlineEditHelpers.js";

const LANGUAGE_LEVELS = Object.freeze(["none", "broken", "accented", "native"]);

export async function bootstrapCharacterMobileLanguageCultureEditApp(options = {}) {
  requirePlainObject(options, "Character mobile language culture edit bootstrap options");
  const app = await bootstrapCharacterMobileSkillTechniqueEditApp(options);
  const postRenderLifecycle = resolvePostRenderLifecycle(app.postRenderLifecycle);
  const mounted = mountCharacterMobileLanguageCultureEditApp(
    exposePostRenderLifecycle(app, postRenderLifecycle),
    options,
  );
  const previousDestroy = app.skillTechniqueEdit?.destroy;

  return Object.freeze({
    get character() { return mounted.character; },
    get session() { return mounted.session; },
    get html() { return mounted.html; },
    get mode() { return mounted.mode; },
    interactions: mounted.interactions,
    modeSync: mounted.modeSync,
    ui: mounted.ui,
    persistence: mounted.persistence,
    commands: mounted.commands,
    repositories: mounted.repositories,
    runtime: mounted.runtime,
    postRenderLifecycle: mounted.postRenderLifecycle,
    render: mounted.render,
    languageCultureEdit: Object.freeze({
      destroy() {
        mounted.languageCultureEdit.destroy();
        previousDestroy?.();
      },
    }),
  });
}

export function mountCharacterMobileLanguageCultureEditApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(
    options.document,
    "Character mobile language culture edit bootstrap root was not found",
  );
  const postRenderLifecycle = resolvePostRenderLifecycle(app.postRenderLifecycle);
  const lifecycleApp = exposePostRenderLifecycle(app, postRenderLifecycle);

  const mountLanguageCultureEditors = context => {
    injectCurrentLanguageCultureControls(context.root, {
      character: context.character,
      mode: context.mode,
      modeSync: lifecycleApp.modeSync,
    });
  };
  const unregisterPostRender = postRenderLifecycle.register(mountLanguageCultureEditors);

  const render = (renderOptions = {}) => {
    const result = lifecycleApp.render({
      ...renderOptions,
      skipPostRenderLifecycle: true,
    });
    if (!renderOptions.skipPostRenderLifecycle) {
      runPostRenderLifecycle(postRenderLifecycle, root, lifecycleApp, renderOptions);
    }
    return result;
  };

  mountLanguageCultureEditors(readPostRenderContext(root, lifecycleApp));

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
    if (!["language-update", "familiarity-update"].includes(action)) return null;
    event.preventDefault?.();

    if (lifecycleApp.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (lifecycleApp.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const result = action === "language-update"
      ? lifecycleApp.commands.updateLanguage({
        languageId: readDataset(actionTarget, "languageId"),
        patch: readLanguagePatch(root, readDataset(actionTarget, "languageId")),
      })
      : lifecycleApp.commands.updateFamiliarity({
        familiarityId: readDataset(actionTarget, "familiarityId"),
        patch: readFamiliarityPatch(root, readDataset(actionTarget, "familiarityId")),
      });

    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    get character() { return lifecycleApp.character; },
    get session() { return lifecycleApp.session; },
    get html() { return root.innerHTML; },
    get mode() { return lifecycleApp.mode; },
    interactions: lifecycleApp.interactions,
    modeSync: lifecycleApp.modeSync,
    ui: lifecycleApp.ui,
    persistence: lifecycleApp.persistence,
    commands: lifecycleApp.commands,
    repositories: lifecycleApp.repositories,
    runtime: lifecycleApp.runtime,
    postRenderLifecycle,
    render,
    languageCultureEdit: Object.freeze({
      destroy() {
        unregisterPostRender();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectMobileLanguageCultureEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const language of character.languages ?? []) {
    nextHtml = appendInlineEditorToLanguage(nextHtml, language);
  }
  for (const familiarity of character.familiarities ?? []) {
    nextHtml = appendInlineEditorToFamiliarity(nextHtml, familiarity);
  }
  return nextHtml;
}

function injectCurrentLanguageCultureControls(root, { character, mode, modeSync }) {
  if (mode !== "creation") {
    modeSync.sync();
    return;
  }

  for (const language of character.languages ?? []) {
    appendLanguageInlineEditorNode(root, language);
  }
  for (const familiarity of character.familiarities ?? []) {
    appendFamiliarityInlineEditorNode(root, familiarity);
  }
  modeSync.sync();
}

function appendLanguageInlineEditorNode(root, language) {
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: language.id,
    entryKind: "language",
    markerAttribute: "data-canonical-id",
    editorRole: "language-inline-editor",
    renderEditor: () => renderLanguageInlineEditor(language),
  });
}

function appendFamiliarityInlineEditorNode(root, familiarity) {
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: familiarity.id,
    entryKind: "familiarity",
    markerAttribute: "data-canonical-id",
    editorRole: "familiarity-inline-editor",
    renderEditor: () => renderFamiliarityInlineEditor(familiarity),
  });
}

function appendInlineEditorToLanguage(html, language) {
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: language.id,
    entryKind: "language",
    markerAttribute: "data-canonical-id",
    editorRole: "language-inline-editor",
    renderEditor: () => renderLanguageInlineEditor(language),
  });
}

function appendInlineEditorToFamiliarity(html, familiarity) {
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: familiarity.id,
    entryKind: "familiarity",
    markerAttribute: "data-canonical-id",
    editorRole: "familiarity-inline-editor",
    renderEditor: () => renderFamiliarityInlineEditor(familiarity),
  });
}

function renderLanguageInlineEditor(language) {
  const id = escapeAttribute(language.id);
  const tags = Array.isArray(language.tags) ? language.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__language-culture-inline-editor" data-role="language-inline-editor" data-canonical-id="${id}">`,
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
    `<div class="singular-mobile-sheet__language-culture-inline-editor" data-role="familiarity-inline-editor" data-canonical-id="${id}">`,
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
      return `<option value="${escapeAttribute(level)}"${selected}>${localizedLanguageLevel(level)}</option>`;
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

function runPostRenderLifecycle(postRenderLifecycle, root, app, renderOptions = {}) {
  postRenderLifecycle.run(readPostRenderContext(root, app, renderOptions));
}

function readPostRenderContext(root, app, renderOptions = {}) {
  const session = typeof app.persistence?.getActiveSession === "function"
    ? app.persistence.getActiveSession()
    : app.session;
  const character = session?.character ?? app.character;
  return {
    root,
    character,
    session,
    mode: renderOptions.mode ?? app.mode,
  };
}

function resolvePostRenderLifecycle(postRenderLifecycle) {
  if (postRenderLifecycle === undefined) {
    return createCharacterMobilePostRenderLifecycle();
  }
  return requirePostRenderLifecycle(postRenderLifecycle);
}

function requirePostRenderLifecycle(postRenderLifecycle) {
  if (postRenderLifecycle === null || typeof postRenderLifecycle !== "object") {
    throw new Error("Character mobile language culture edit requires a post-render lifecycle");
  }
  if (typeof postRenderLifecycle.register !== "function") {
    throw new Error("Character mobile language culture edit post-render lifecycle must register enhancers");
  }
  if (typeof postRenderLifecycle.run !== "function") {
    throw new Error("Character mobile language culture edit post-render lifecycle must run enhancers");
  }
  return postRenderLifecycle;
}

function exposePostRenderLifecycle(app, postRenderLifecycle) {
  const descriptors = Object.getOwnPropertyDescriptors(app);
  descriptors.postRenderLifecycle = {
    value: postRenderLifecycle,
    enumerable: true,
    configurable: false,
    writable: false,
  };
  return Object.freeze(Object.defineProperties({}, descriptors));
}
