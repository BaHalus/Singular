import { createCharacter } from "../../domain/character/Character.js";
import { executeCommand } from "../../application/commands/CommandExecutor.js";
import { createCommandRegistry } from "../../application/commands/CommandRegistry.js";
import {
  generateId,
  readClock,
} from "../../application/ports/RuntimePorts.js";
import {
  createPoolCommandHandlerEntries,
  POOL_COMMAND_TYPES,
} from "../../application/pools/PoolCommandHandlers.js";
import {
  createApplicationSession,
  validateApplicationSession,
} from "../../application/session/ApplicationSession.js";
import { createCryptoIdGenerator } from "../../infrastructure/runtime/CryptoIdGenerator.js";
import { createSystemClock } from "../../infrastructure/runtime/SystemClock.js";
import { projectCharacterForMobileSheet } from "./CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";
import { renderCharacterMobileSheetHtml } from "./CharacterMobileSheetHtml.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const MOBILE_MODES = Object.freeze(["creation", "table"]);
const POOL_CONTROL_SELECTOR = "[data-pool-adjust][data-pool-key]";

/**
 * Monta a aplicação mobile executável da SINGULAR.
 *
 * O Character atual pertence à ApplicationSession. Intenções operacionais
 * atravessam CommandExecutor e handlers canônicos antes de a UI rerenderizar.
 */
export function mountCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile app options");

  const root = options.root;
  requireMountRoot(root);

  const runtime = options.runtime ?? createDefaultMobileRuntime();
  const registry = options.registry ?? createDefaultMobileCommandRegistry();
  let session = createInitialSession(options, runtime);
  let mode = normalizeMode(options.mode ?? "creation");
  let destroyed = false;

  function render() {
    const html = renderCharacterMobileApp(session.character, { mode });
    root.innerHTML = html;
    setRootAttribute(root, "data-singular-mounted", "true");
    setRootAttribute(root, "data-character-id", session.character.identity.id);
    setRootAttribute(root, "data-session-id", session.id);
    setRootAttribute(root, "data-session-revision", String(session.revision));
    setRootAttribute(root, "data-mode", mode);
    return html;
  }

  function adjustPoolCurrent(poolKey, delta) {
    assertActive();
    const result = executeCommand(
      session,
      {
        id: generateId(runtime.idGenerator, "command"),
        type: POOL_COMMAND_TYPES.ADJUST_CURRENT,
        expectedRevision: session.revision,
        issuedAt: readClock(runtime.clock),
        payload: { poolKey, delta },
      },
      registry,
      runtime,
    );

    setRootAttribute(root, "data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) {
      session = result.session;
    }
    if (result.status === "applied") {
      render();
    }
    return result;
  }

  function setMode(nextMode) {
    assertActive();
    mode = normalizeMode(nextMode);
    return render();
  }

  function destroy() {
    if (destroyed) return;
    if (typeof root.removeEventListener === "function") {
      root.removeEventListener("click", handleRootClick);
    }
    destroyed = true;
    setRootAttribute(root, "data-singular-mounted", "false");
  }

  function assertActive() {
    if (destroyed) {
      throw new Error("Character mobile app is destroyed");
    }
  }

  function handleRootClick(event) {
    const control = findPoolControl(event?.target, root);
    if (control === null) return;
    event.preventDefault?.();

    const poolKey = control.getAttribute("data-pool-key");
    const delta = Number(control.getAttribute("data-pool-adjust"));
    adjustPoolCurrent(poolKey, delta);
  }

  if (typeof root.addEventListener === "function") {
    root.addEventListener("click", handleRootClick);
  }

  render();

  return Object.freeze({
    get character() {
      return session.character;
    },
    get session() {
      return session;
    },
    get mode() {
      return mode;
    },
    get html() {
      return root.innerHTML;
    },
    adjustPoolCurrent,
    setMode,
    destroy,
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
    session: options.session,
    sessionId: options.sessionId,
    runtime: options.runtime,
    registry: options.registry,
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

export function createDefaultMobileRuntime() {
  return Object.freeze({
    clock: createSystemClock(),
    idGenerator: createCryptoIdGenerator(),
  });
}

export function createDefaultMobileCommandRegistry() {
  return createCommandRegistry(createPoolCommandHandlerEntries());
}

export function getCharacterMobileRootSelector() {
  return MOBILE_ROOT_SELECTOR;
}

export function getCharacterMobileModes() {
  return [...MOBILE_MODES];
}

function createInitialSession(options, runtime) {
  if (options.session !== undefined && options.session !== null) {
    if (options.character !== undefined || options.sessionId !== undefined) {
      throw new Error(
        "Character mobile app session cannot be combined with character or sessionId",
      );
    }
    validateApplicationSession(options.session);
    return options.session;
  }

  return createApplicationSession({
    id: options.sessionId ?? generateId(runtime.idGenerator, "session"),
    character: options.character ?? createCharacter(),
  });
}

function findPoolControl(target, root) {
  if (!target || typeof target.closest !== "function") return null;
  const control = target.closest(POOL_CONTROL_SELECTOR);
  if (control === null) return null;
  if (typeof root.contains === "function" && !root.contains(control)) {
    return null;
  }
  return control;
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
