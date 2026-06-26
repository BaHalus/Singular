import {
  executeCommand,
} from "../commands/CommandExecutor.js";
import {
  createCommandRegistry,
} from "../commands/CommandRegistry.js";
import {
  createCharacterSummaryCommandHandlerEntries,
  CHARACTER_SUMMARY_COMMAND_TYPES,
} from "../character/CharacterSummaryCommandHandlers.js";
import {
  createPoolCommandHandlerEntries,
  POOL_COMMAND_TYPES,
} from "../pools/PoolCommandHandlers.js";
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

  const createCoordinator = initialSession => createLocalPersistenceCoordinator({
    initialSession,
    characterRepository,
    sessionRepository,
    rollbackSessionSave,
    inspectPersistence,
    createCharacterExport: createSingularCharacterExport,
    parseCharacterExport: parseSingularCharacterExport,
    createImportedSession,
  });

  let coordinator = createCoordinator(options.initialSession);
  const persistence = createActiveSessionPersistenceFacade({
    getCoordinator: () => coordinator,
    replaceCoordinator(nextSession) {
      coordinator = createCoordinator(nextSession);
    },
  });
  const registry = createCommandRegistry([
    ...createPoolCommandHandlerEntries(),
    ...createCharacterSummaryCommandHandlerEntries(),
  ]);
  const commands = createAlphaMobileCommands({
    persistence,
    registry,
    runtime,
  });

  return Object.freeze({
    persistence,
    commands,
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

function createActiveSessionPersistenceFacade(options) {
  const coordinator = () => options.getCoordinator();
  const facade = {
    getActiveSession() {
      return coordinator().getActiveSession();
    },
    getRepositories() {
      return coordinator().getRepositories();
    },
    initialize() {
      return coordinator().initialize();
    },
    saveActiveSession() {
      return coordinator().saveActiveSession();
    },
    listSavedSessions() {
      return coordinator().listSavedSessions();
    },
    openSession(id) {
      return coordinator().openSession(id);
    },
    removeSession(id) {
      return coordinator().removeSession(id);
    },
    exportActiveCharacter() {
      return coordinator().exportActiveCharacter();
    },
    importCharacter(input) {
      return coordinator().importCharacter(input);
    },
    inspect() {
      return coordinator().inspect();
    },
    replaceActiveSession(nextSession) {
      validateApplicationSession(nextSession);
      const currentSession = coordinator().getActiveSession();
      if (nextSession.id !== currentSession.id) {
        throw new Error(
          "Active session replacement must preserve the ApplicationSession id",
        );
      }
      options.replaceCoordinator(nextSession);
      return coordinator().getActiveSession();
    },
  };
  return Object.freeze(facade);
}

function createAlphaMobileCommands({ persistence, registry, runtime }) {
  const execute = (type, payload) => {
    const activeSession = persistence.getActiveSession();
    const result = executeCommand(
      activeSession,
      {
        id: generateId(runtime.idGenerator, "command"),
        type,
        expectedRevision: activeSession.revision,
        issuedAt: readClock(runtime.clock),
        payload,
      },
      registry,
      runtime,
    );

    if (result.status === "applied") {
      persistence.replaceActiveSession(result.session);
    }
    return result;
  };

  return Object.freeze({
    adjustPoolCurrent(input = {}) {
      requirePlainObject(input, "Alpha mobile pool adjustment");
      return execute(POOL_COMMAND_TYPES.ADJUST_CURRENT, {
        poolKey: input.poolKey,
        delta: input.delta,
      });
    },

    setCharacterSummary(input = {}) {
      requirePlainObject(input, "Alpha mobile character summary");
      return execute(CHARACTER_SUMMARY_COMMAND_TYPES.SET, {
        name: input.name,
        concept: input.concept,
      });
    },
  });
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
