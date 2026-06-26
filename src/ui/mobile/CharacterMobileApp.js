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

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const MOBILE_MODES = Object.freeze(["creation", "table"]);

/**
 * Montagem estática preservada para testes e consumidores que já fornecem
 * um Character canônico. Não cria sessão nem persistência paralela.
 */
export function mountCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile app options");

  const root = options.root;
  requireMountRoot(root);

  const character = options.character ?? createCharacter();
  const mode = normalizeMode(options.mode ?? "creation");
  const html = renderCharacterMobileApp(character, { mode });

  root.innerHTML = html;
  if (typeof root.setAttribute === "function") {
    root.setAttribute("data-singular-mounted", "true");
    root.setAttribute("data-character-id", character.identity.id);
    root.setAttribute("data-mode", mode);
  }

  return Object.freeze({
    character,
    mode,
    html,
  });
}

/**
 * Bootstrap executável canônico da Alpha mobile.
 *
 * Cria uma única ApplicationSession inicial, compõe persistência e comandos,
 * restaura a última sessão válida e liga os controles transitórios de PV/PF.
 */
export async function bootstrapCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile bootstrap options");

  const root = options.root ?? resolveMobileRoot(options.document);
  requireInteractiveMountRoot(root);

  const mode = normalizeMode(options.mode ?? "creation");
  const initialSession = createInitialSession(options);
  const application = createAlphaMobilePersistenceBootstrap({
    initialSession,
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

  const renderActiveSession = () => {
    root.innerHTML = ui.render({ mode });
    const activeSession = application.persistence.getActiveSession();
    setRootAttribute(root, "data-singular-mounted", "true");
    setRootAttribute(root, "data-session-id", activeSession.id);
    setRootAttribute(root, "data-session-revision", String(activeSession.revision));
    setRootAttribute(root, "data-character-id", activeSession.character.identity.id);
    setRootAttribute(root, "data-mode", mode);
  };

  const handlePoolAdjustment = event => {
    const target = findPoolAdjustmentTarget(event?.target);
    if (target === null) return null;
    event.preventDefault?.();

    if (ui.getState().busy) {
      setRootAttribute(root, "data-last-command-status", "busy");
      return null;
    }

    const poolKey = readDataset(target, "poolKey");
    const delta = Number(readDataset(target, "poolAdjust"));
    const result = application.commands.adjustPoolCurrent({ poolKey, delta });
    setRootAttribute(root, "data-last-command-status", result.status);
    renderActiveSession();
    return result;
  };

  root.addEventListener("click", handlePoolAdjustment);
  renderActiveSession();

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
    mode,
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

function findPoolAdjustmentTarget(target) {
  let current = target ?? null;
  while (current !== null) {
    if (
      readDataset(current, "poolKey") !== null &&
      readDataset(current, "poolAdjust") !== null
    ) {
      return current;
    }
    current = current.parentElement ?? null;
  }
  return null;
}

function readDataset(target, key) {
  if (!target || typeof target !== "object") return null;
  const value = target.dataset?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function normalizeMode(value) {
  if (!MOBILE_MODES.includes(value)) {
    throw new Error("Character mobile app mode is invalid");
  }
  return value;
}

function requireMountRoot(root) {
  if (
    root === null ||
    typeof root !== "object" ||
    !("innerHTML" in root)
  ) {
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
  if (typeof root.setAttribute === "function") {
    root.setAttribute(name, value);
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
