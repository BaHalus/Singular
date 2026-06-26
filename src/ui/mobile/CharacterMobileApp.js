import { createCharacter } from "../../domain/character/Character.js";
import { projectCharacterForMobileSheet } from "./CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";
import { renderCharacterMobileSheetHtml } from "./CharacterMobileSheetHtml.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const MOBILE_MODES = Object.freeze(["creation", "table"]);

/**
 * Monta a primeira aplicação mobile executável da SINGULAR.
 *
 * O fluxo sempre atravessa Character canônico -> projeção -> render model -> HTML.
 * Nenhuma regra de GURPS é calculada nesta camada.
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

export function bootstrapCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile bootstrap options");

  const documentRef = options.document ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile bootstrap requires a document");
  }

  const root = options.root ?? documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile bootstrap root was not found");
  }

  return mountCharacterMobileApp({
    root,
    character: options.character,
    mode: options.mode,
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
