import {
  executeCommand,
} from "../commands/CommandExecutor.js";
import {
  createCommandRegistry,
} from "../commands/CommandRegistry.js";
import {
  createAttackCommandHandlerEntries,
  ATTACK_COMMAND_TYPES,
} from "../attacks/AttackCommandHandlers.js";
import {
  createAttributeCommandHandlerEntries,
  ATTRIBUTE_COMMAND_TYPES,
} from "../attributes/AttributeCommandHandlers.js";
import {
  createCharacterSummaryCommandHandlerEntries,
  CHARACTER_SUMMARY_COMMAND_TYPES,
} from "../character/CharacterSummaryCommandHandlers.js";
import {
  createEquipmentCommandHandlerEntries,
  EQUIPMENT_COMMAND_TYPES,
} from "../equipment/EquipmentCommandHandlers.js";
import {
  createPoolCommandHandlerEntries,
  POOL_COMMAND_TYPES,
} from "../pools/PoolCommandHandlers.js";
import {
  createSpellCommandHandlerEntries,
  SPELL_COMMAND_TYPES,
} from "../spells/SpellCommandHandlers.js";
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
    ...createAttributeCommandHandlerEntries(),
    ...createAttackCommandHandlerEntries(),
    ...createEquipmentCommandHandlerEntries(),
    ...createSpellCommandHandlerEntries(),
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

    adjustAttributeBase(input = {}) {
      requirePlainObject(input, "Alpha mobile attribute adjustment");
      return execute(ATTRIBUTE_COMMAND_TYPES.ADJUST_BASE, {
        attributeKey: input.attributeKey,
        delta: input.delta,
      });
    },

    addAttack(input = {}) {
      requirePlainObject(input, "Alpha mobile attack addition");
      return execute(ATTACK_COMMAND_TYPES.ADD, {
        attack: {
          id: input.id ?? generateId(runtime.idGenerator, "attack"),
          name: input.name ?? "",
          category: input.category ?? "melee",
          skillId: normalizeOptionalText(input.skillId),
          source: {
            kind: "manual",
            id: null,
          },
          damage: {
            value: input.damageValue ?? "",
            type: input.damageType ?? "",
          },
          reach: normalizeOptionalText(input.reach),
          range: normalizeOptionalText(input.range),
          notes: input.notes ?? "",
        },
      });
    },

    removeAttack(input = {}) {
      requirePlainObject(input, "Alpha mobile attack removal");
      return execute(ATTACK_COMMAND_TYPES.REMOVE, {
        attackId: input.attackId,
      });
    },

    reorderAttack(input = {}) {
      requirePlainObject(input, "Alpha mobile attack reorder");
      return execute(ATTACK_COMMAND_TYPES.REORDER, {
        attackId: input.attackId,
        targetIndex: input.targetIndex,
      });
    },

    addEquipment(input = {}) {
      requirePlainObject(input, "Alpha mobile equipment addition");
      const kind = input.kind === "container" ? "container" : "item";
      return execute(EQUIPMENT_COMMAND_TYPES.ADD, {
        item: {
          id: input.id ?? generateId(runtime.idGenerator, "equipment"),
          kind,
          containerKind: kind === "container" ? "physical" : null,
          name: input.name ?? "",
          quantity: input.quantity ?? 1,
          weightKg: input.weightKg ?? 0,
          cost: input.cost ?? 0,
          state: input.state ?? "carried",
          notes: input.notes ?? "",
        },
      });
    },

    removeEquipment(input = {}) {
      requirePlainObject(input, "Alpha mobile equipment removal");
      return execute(EQUIPMENT_COMMAND_TYPES.REMOVE, {
        itemId: input.itemId,
      });
    },

    reorderEquipment(input = {}) {
      requirePlainObject(input, "Alpha mobile equipment reorder");
      return execute(EQUIPMENT_COMMAND_TYPES.REORDER, {
        itemId: input.itemId,
        targetIndex: input.targetIndex,
      });
    },

    setEquipmentState(input = {}) {
      requirePlainObject(input, "Alpha mobile equipment state");
      return execute(EQUIPMENT_COMMAND_TYPES.SET_STATE, {
        itemId: input.itemId,
        state: input.state,
      });
    },

    addSpell(input = {}) {
      requirePlainObject(input, "Alpha mobile spell addition");
      return execute(SPELL_COMMAND_TYPES.ADD, {
        spell: {
          id: input.id ?? generateId(runtime.idGenerator, "spell"),
          spellType: input.spellType === "ritualMagic" ? "ritualMagic" : "standard",
          name: input.name ?? "",
          attribute: normalizeOptionalText(input.attribute),
          difficulty: normalizeOptionalText(input.difficulty),
          points: input.points ?? 0,
          spellClass: input.spellClass ?? "",
          resistance: input.resistance ?? "",
          castingCost: input.castingCost ?? "",
          maintenanceCost: input.maintenanceCost ?? "",
          castingTime: input.castingTime ?? "",
          duration: input.duration ?? "",
          notes: input.notes ?? "",
        },
      });
    },

    removeSpell(input = {}) {
      requirePlainObject(input, "Alpha mobile spell removal");
      return execute(SPELL_COMMAND_TYPES.REMOVE, {
        spellId: input.spellId,
      });
    },

    reorderSpell(input = {}) {
      requirePlainObject(input, "Alpha mobile spell reorder");
      return execute(SPELL_COMMAND_TYPES.REORDER, {
        spellId: input.spellId,
        targetIndex: input.targetIndex,
      });
    },
  });
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
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