import {
  createApplicationSession,
  serializeApplicationSession,
  validateApplicationSession,
} from "../session/ApplicationSession.js";
import {
  generateId,
  readClock,
  validateApplicationRuntime,
} from "../ports/RuntimePorts.js";
import {
  createBrowserLocalCharacterRepository,
  createBrowserLocalPersistenceAdapter,
  createBrowserLocalSessionRepository,
  createSingularCharacterExport,
  inspectBrowserLocalPersistence,
  parseSingularCharacterExport,
} from "../../infrastructure/persistence/browser/BrowserLocalPersistence.js";
import {
  createLocalPersistenceCoordinator,
} from "../persistence/LocalPersistenceCoordinator.js";

/**
 * Composition root explícito da integração de persistência da Alpha mobile.
 * Cada chamada cria uma instância independente; não há singleton global.
 */
export function createAlphaMobilePersistenceBootstrap(options = {}) {
  requirePlainObject(options, "Alpha mobile persistence bootstrap options");
  validateApplicationSession(options.initialSession);

  const storage = options.storage ?? globalThis.localStorage;
  const namespace = options.namespace;
  const runtime = options.runtime ?? createBrowserApplicationRuntime();
  validateApplicationRuntime(runtime);

  const persistenceOptions = namespace === undefined
    ? { storage }
    : { storage, namespace };

  const characterRepository = createBrowserLocalCharacterRepository(
    persistenceOptions,
  );
  const sessionRepository = createBrowserLocalSessionRepository(
    persistenceOptions,
  );
  const rollbackAdapter = createBrowserLocalPersistenceAdapter(
    persistenceOptions,
  );
  const inspectPersistence = () => inspectBrowserLocalPersistence(
    persistenceOptions,
  );
  const rollbackSessionSave = ({ id, previousSession }) => {
    if (previousSession === null) {
      rollbackAdapter.remove("session", id);
      return;
    }
    rollbackAdapter.save(
      "session",
      id,
      serializeApplicationSession(previousSession),
    );
  };

  const createImportedSession = options.createImportedSession ?? ((input) => {
    const importedAt = readClock(runtime.clock);
    return createApplicationSession({
      id: generateId(runtime.idGenerator, "session"),
      revision: 0,
      character: input.character,
      history: [],
      future: [],
      dirty: true,
      lastReceipt: null,
      metadata: {
        source: "singular-character-import",
        importedAt,
        importedCharacterId: input.character.identity.id,
        previousSessionId: input.currentSession.id,
      },
    });
  });

  const persistence = createLocalPersistenceCoordinator({
    initialSession: options.initialSession,
    characterRepository,
    sessionRepository,
    rollbackSessionSave,
    inspectPersistence,
    createCharacterExport: createSingularCharacterExport,
    parseCharacterExport: parseSingularCharacterExport,
    createImportedSession,
  });

  return Object.freeze({
    persistence,
    repositories: Object.freeze({
      character: characterRepository,
      session: sessionRepository,
    }),
    runtime,
  });
}

export function createBrowserApplicationRuntime(options = {}) {
  requirePlainObject(options, "Browser application runtime options");
  const clock = options.clock ?? Object.freeze({
    now: () => new Date().toISOString(),
  });
  let sequence = 0;
  const idGenerator = options.idGenerator ?? Object.freeze({
    next(prefix) {
      sequence += 1;
      const randomPart = globalThis.crypto?.randomUUID?.()
        ?? `${Date.now().toString(36)}-${sequence.toString(36)}`;
      return `${prefix}:${randomPart}`;
    },
  });
  const runtime = { clock, idGenerator };
  validateApplicationRuntime(runtime);
  return Object.freeze(runtime);
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
