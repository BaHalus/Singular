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
 * Cria uma única ApplicationSession inicial, compõe os repositórios concretos
 * e restaura a última sessão válida antes de concluir a montagem funcional.
 */
export async function bootstrapCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile bootstrap options");

  const documentRef = options.document ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile bootstrap requires a document");
  }

  const root = options.root ?? documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile bootstrap root was not found");
  }
  requireMountRoot(root);

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
  const session = application.persistence.getActiveSession();

  return Object.freeze({
    character: session.character,
    session,
    mode,
    html: root.innerHTML,
    ui,
    persistence: application.persistence,
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
