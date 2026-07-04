import { bootstrapCharacterMobileApp, renderCharacterMobileApp } from "./CharacterMobileApp.js";
import { createCharacterMobilePostRenderLifecycle } from "./CharacterMobilePostRenderLifecycle.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const LANGUAGE_LEVELS = Object.freeze(["none", "broken", "accented", "native"]);

export async function bootstrapCharacterMobileLanguageCultureApp(options = {}) {
  requirePlainObject(options, "Character mobile language/culture bootstrap options");
  const postRenderLifecycle = resolvePostRenderLifecycle(options.postRenderLifecycle);
  const app = await bootstrapCharacterMobileApp(Object.freeze({
    ...disableObserverConstructorOption(options),
    postRenderLifecycle,
  }));
  return mountCharacterMobileLanguageCultureApp(exposePostRenderLifecycle(app, postRenderLifecycle), options);
}

export function mountCharacterMobileLanguageCultureApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(options.document);
  const postRenderLifecycle = resolvePostRenderLifecycle(app.postRenderLifecycle);
  const lifecycleApp = exposePostRenderLifecycle(app, postRenderLifecycle);

  const mountLanguageCultureControls = context => {
    enhanceLanguageCultureSection(context.root, context.character, context.mode);
  };
  const unregisterPostRender = postRenderLifecycle.register(mountLanguageCultureControls);

  const render = (renderOptions = {}) => {
    const session = readActiveSession(lifecycleApp);
    if (typeof lifecycleApp.render === "function") {
      lifecycleApp.render({
        ...renderOptions,
        skipPostRenderLifecycle: true,
      });
    } else {
      const renderMode = renderOptions.mode ?? lifecycleApp.mode;
      root.innerHTML = renderCharacterMobileApp(session.character, { mode: renderMode });
      setMobileRootAttributes(root, session, renderMode);
    }
    if (!renderOptions.skipPostRenderLifecycle) {
      runPostRenderLifecycle(postRenderLifecycle, root, lifecycleApp, renderOptions);
    }
    lifecycleApp.modeSync.sync();
  };

  mountLanguageCultureControls(readPostRenderContext(root, lifecycleApp));

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
    if (!isLanguageCultureAction(action)) return null;
    event.preventDefault?.();

    if (lifecycleApp.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (lifecycleApp.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const result = executeLanguageCultureAction(action, actionTarget, root, lifecycleApp.commands);
    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    get character() {
      return lifecycleApp.character;
    },
    get session() {
      return lifecycleApp.session;
    },
    get html() {
      return root.innerHTML;
    },
    get mode() {
      return lifecycleApp.mode;
    },
    interactions: lifecycleApp.interactions,
    modeSync: lifecycleApp.modeSync,
    ui: lifecycleApp.ui,
    persistence: lifecycleApp.persistence,
    commands: lifecycleApp.commands,
    repositories: lifecycleApp.repositories,
    runtime: lifecycleApp.runtime,
    postRenderLifecycle,
    render,
    languageCulture: Object.freeze({
      enhance() {
        mountLanguageCultureControls(readPostRenderContext(root, lifecycleApp));
      },
      destroy() {
        unregisterPostRender();
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
  const languageItems = Array.from(section.querySelectorAll?.('[data-entry-kind="language"][data-canonical-id]') ?? []);
  const familiarityItems = Array.from(section.querySelectorAll?.('[data-entry-kind="familiarity"][data-canonical-id]') ?? []);

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

function runPostRenderLifecycle(postRenderLifecycle, root, app, renderOptions = {}) {
  postRenderLifecycle.run(readPostRenderContext(root, app, renderOptions));
}

function readPostRenderContext(root, app, renderOptions = {}) {
  const session = readActiveSession(app);
  return {
    root,
    character: session?.character ?? app.character,
    session,
    mode: renderOptions.mode ?? app.mode,
  };
}

function readActiveSession(app) {
  return typeof app.persistence?.getActiveSession === "function"
    ? app.persistence.getActiveSession()
    : app.session;
}

function setMobileRootAttributes(root, session, mode) {
  root.setAttribute?.("data-singular-mounted", "true");
  root.setAttribute?.("data-session-id", session.id);
  root.setAttribute?.("data-character-id", session.character.identity.id);
  root.setAttribute?.("data-mode", mode);
}

function resolvePostRenderLifecycle(postRenderLifecycle) {
  if (postRenderLifecycle === undefined) {
    return createCharacterMobilePostRenderLifecycle();
  }
  return requirePostRenderLifecycle(postRenderLifecycle);
}

function requirePostRenderLifecycle(postRenderLifecycle) {
  if (postRenderLifecycle === null || typeof postRenderLifecycle !== "object") {
    throw new Error("Character mobile language/culture requires a post-render lifecycle");
  }
  if (typeof postRenderLifecycle.register !== "function") {
    throw new Error("Character mobile language/culture post-render lifecycle must register enhancers");
  }
  if (typeof postRenderLifecycle.run !== "function") {
    throw new Error("Character mobile language/culture post-render lifecycle must run enhancers");
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

function disableObserverConstructorOption(options) {
  return {
    ...options,
    [["Mutation", "Observer"].join("")]: false,
  };
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
