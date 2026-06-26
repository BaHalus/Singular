import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "../../application/bootstrap/AlphaMobilePersistenceBootstrap.js";
import { projectCharacterForMobileSheet } from "./CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";
import { renderCharacterMobileSheetHtml } from "./CharacterMobileSheetHtml.js";
import {
  mountAlphaMobilePersistenceUi,
} from "./AlphaMobilePersistenceUi.js";
import {
  mountCharacterMobileInteractionController,
} from "./CharacterMobileInteractionController.js";
import {
  createCharacterMobileModeSync,
} from "./CharacterMobileModeSync.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const MOBILE_MODES = Object.freeze(["creation", "table"]);

export function mountCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile app options");
  const root = options.root;
  requireMountRoot(root);

  const character = options.character ?? createCharacter();
  const mode = normalizeMode(options.mode ?? "creation");
  const html = renderCharacterMobileApp(character, { mode });

  root.innerHTML = html;
  setRootAttribute(root, "data-singular-mounted", "true");
  setRootAttribute(root, "data-character-id", character.identity.id);
  setRootAttribute(root, "data-mode", mode);

  return Object.freeze({ character, mode, html });
}

export async function bootstrapCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile bootstrap options");
  const root = options.root ?? resolveMobileRoot(options.document);
  requireInteractiveMountRoot(root);

  let mode = normalizeMode(options.mode ?? "creation");
  const application = createAlphaMobilePersistenceBootstrap({
    initialSession: createInitialSession(options),
    storage: options.storage,
    namespace: options.namespace,
    runtime: options.runtime,
    createImportedSession: options.createImportedSession,
  });
  const ui = await mountAlphaMobilePersistenceUi({
    root,
    persistence: application.persistence,
    downloadText: options.downloadText,
    mode,
  });

  const render = () => {
    root.innerHTML = ui.render({ mode });
    const activeSession = application.persistence.getActiveSession();
    setRootAttribute(root, "data-singular-mounted", "true");
    setRootAttribute(root, "data-session-id", activeSession.id);
    setRootAttribute(root, "data-character-id", activeSession.character.identity.id);
    setRootAttribute(root, "data-mode", mode);
  };
  const modeSync = createCharacterMobileModeSync({
    root,
    getMode: () => mode,
    render,
    MutationObserver: options.MutationObserver,
  });
  const interactions = mountCharacterMobileInteractionController({
    root,
    commands: application.commands,
    ui,
    getMode: () => mode,
    setMode(nextMode) {
      mode = normalizeMode(nextMode);
    },
    readCharacterSummary() {
      return {
        name: readInputValue(root, '[data-role="character-name"]'),
        concept: readInputValue(root, '[data-role="character-concept"]'),
      };
    },
    render,
    syncMode: modeSync.sync,
  });
  render();
  modeSync.sync();

  return Object.freeze({
    get character() {
      return application.persistence.getActiveSession().character;
    },
    get session() {
      return application.persistence.getActiveSession();
    },
    get html() {
      return root.innerHTML;
    },
    get mode() {
      return mode;
    },
    interactions,
    modeSync,
    ui,
    persistence: application.persistence,
    commands: application.commands,
    repositories: application.repositories,
    runtime: application.runtime,
  });
}

export function renderCharacterMobileApp(character, options = {}) {
  requirePlainObject(options, "Character mobile render options");
  const mode = normalizeMode(options.mode ?? "creation");
  const projection = projectCharacterForMobileSheet(character);
  const renderModel = createCharacterMobileSheetRenderModel(projection);
  return renderCharacterMobileSheetHtml(renderModel, { mode });
}

export function getCharacterMobileRootSelector() {
  return MOBILE_ROOT_SELECTOR;
}

export function getCharacterMobileModes() {
  return [...MOBILE_MODES];
}

function resolveMobileRoot(documentOption) {
  const documentRef = documentOption ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile bootstrap requires a document");
  }
  const root = documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile bootstrap root was not found");
  }
  return root;
}

function createInitialSession(options) {
  if (options.session !== undefined) {
    if (options.character !== undefined || options.sessionId !== undefined) {
      throw new Error(
        "Character mobile bootstrap session cannot be combined with character or sessionId",
      );
    }
    return options.session;
  }
  const character = options.character ?? createCharacter();
  return createApplicationSession({
    id: options.sessionId ?? `session:${character.identity.id}`,
    character,
    metadata: { source: "alpha-mobile-bootstrap" },
  });
}

function readInputValue(root, selector) {
  const input = root.querySelector?.(selector);
  return typeof input?.value === "string" ? input.value : "";
}

function normalizeMode(value) {
  if (!MOBILE_MODES.includes(value)) {
    throw new Error("Character mobile app mode is invalid");
  }
  return value;
}

function requireMountRoot(root) {
  if (root === null || typeof root !== "object" || !("innerHTML" in root)) {
    throw new Error("Character mobile app root must support innerHTML");
  }
}

function requireInteractiveMountRoot(root) {
  requireMountRoot(root);
  if (typeof root.addEventListener !== "function") {
    throw new Error("Character mobile app root must support addEventListener");
  }
}

function setRootAttribute(root, name, value) {
  root.setAttribute?.(name, value);
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
