import {
  createAlphaCommandCatalogEntries,
} from "../alpha/AlphaCommandCatalog.js";
import {
  executeCommand,
} from "../commands/CommandExecutor.js";
import {
  createCommandRegistry,
} from "../commands/CommandRegistry.js";
import {
  ATTACK_COMMAND_TYPES,
} from "../attacks/AttackCommandHandlers.js";
import {
  ATTRIBUTE_COMMAND_TYPES,
} from "../attributes/AttributeCommandHandlers.js";
import {
  CHARACTER_SUMMARY_COMMAND_TYPES,
} from "../character/CharacterSummaryCommandHandlers.js";
import {
  EQUIPMENT_COMMAND_TYPES,
} from "../equipment/EquipmentCommandHandlers.js";
import {
  LANGUAGE_CULTURE_COMMAND_TYPES,
} from "../languages/LanguageCultureCommandHandlers.js";
import {
  NOTES_COMMAND_TYPES,
} from "../notes/NotesCommandHandlers.js";
import {
  POOL_COMMAND_TYPES,
} from "../pools/PoolCommandHandlers.js";
import {
  POWER_COMMAND_TYPES,
} from "../powers/PowerCommandHandlers.js";
import {
  SECONDARY_COMMAND_TYPES,
} from "../secondary/SecondaryCommandHandlers.js";
import {
  SKILL_COMMAND_TYPES,
} from "../skills/SkillCommandHandlers.js";
import {
  SPELL_COMMAND_TYPES,
} from "../spells/SpellCommandHandlers.js";
import {
  TRAIT_COMMAND_TYPES,
} from "../traits/TraitCommandHandlers.js";
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
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
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
  const run = type => payload => {
    const receipt = executeCommand({
      session: persistence.getActiveSession(),
      registry,
      type,
      payload,
      runtime,
    });
    persistence.replaceActiveSession(receipt.session);
    return receipt;
  };

  return Object.freeze({
    setCurrentPool: run(POOL_COMMAND_TYPES.SET_CURRENT),
    adjustCurrentPool: run(POOL_COMMAND_TYPES.ADJUST_CURRENT),
    resetCurrentPoolToMaximum: run(POOL_COMMAND_TYPES.RESET_CURRENT_TO_MAXIMUM),
    setCharacterSummary: run(CHARACTER_SUMMARY_COMMAND_TYPES.SET),
    adjustAttributeBase: run(ATTRIBUTE_COMMAND_TYPES.ADJUST_BASE),
    addAttack: run(ATTACK_COMMAND_TYPES.ADD),
    updateAttack: run(ATTACK_COMMAND_TYPES.UPDATE),
    removeAttack: run(ATTACK_COMMAND_TYPES.REMOVE),
    reorderAttack: run(ATTACK_COMMAND_TYPES.REORDER),
    addEquipment: run(EQUIPMENT_COMMAND_TYPES.ADD),
    renameEquipment: run(EQUIPMENT_COMMAND_TYPES.RENAME),
    setEquipmentQuantity: run(EQUIPMENT_COMMAND_TYPES.SET_QUANTITY),
    setEquipmentState: run(EQUIPMENT_COMMAND_TYPES.SET_STATE),
    removeEquipment: run(EQUIPMENT_COMMAND_TYPES.REMOVE),
    moveEquipment: run(EQUIPMENT_COMMAND_TYPES.MOVE),
    reorderEquipment: run(EQUIPMENT_COMMAND_TYPES.REORDER),
    addSpell: run(SPELL_COMMAND_TYPES.ADD),
    updateSpell: run(SPELL_COMMAND_TYPES.UPDATE),
    removeSpell: run(SPELL_COMMAND_TYPES.REMOVE),
    reorderSpell: run(SPELL_COMMAND_TYPES.REORDER),
    addPower: run(POWER_COMMAND_TYPES.ADD),
    renamePower: run(POWER_COMMAND_TYPES.RENAME),
    removePower: run(POWER_COMMAND_TYPES.REMOVE),
    addTrait: run(TRAIT_COMMAND_TYPES.ADD),
    updateTrait: run(TRAIT_COMMAND_TYPES.UPDATE),
    removeTrait: run(TRAIT_COMMAND_TYPES.REMOVE),
    reorderTrait: run(TRAIT_COMMAND_TYPES.REORDER),
    addSkill: run(SKILL_COMMAND_TYPES.ADD_SKILL),
    updateSkill: run(SKILL_COMMAND_TYPES.UPDATE_SKILL),
    removeSkill: run(SKILL_COMMAND_TYPES.REMOVE_SKILL),
    reorderSkill: run(SKILL_COMMAND_TYPES.REORDER_SKILL),
    addTechnique: run(SKILL_COMMAND_TYPES.ADD_TECHNIQUE),
    updateTechnique: run(SKILL_COMMAND_TYPES.UPDATE_TECHNIQUE),
    removeTechnique: run(SKILL_COMMAND_TYPES.REMOVE_TECHNIQUE),
    reorderTechnique: run(SKILL_COMMAND_TYPES.REORDER_TECHNIQUE),
    addLanguage: run(LANGUAGE_CULTURE_COMMAND_TYPES.ADD_LANGUAGE),
    updateLanguage: run(LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_LANGUAGE),
    removeLanguage: run(LANGUAGE_CULTURE_COMMAND_TYPES.REMOVE_LANGUAGE),
    reorderLanguage: run(LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_LANGUAGE),
    addFamiliarity: run(LANGUAGE_CULTURE_COMMAND_TYPES.ADD_FAMILIARITY),
    updateFamiliarity: run(LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_FAMILIARITY),
    removeFamiliarity: run(LANGUAGE_CULTURE_COMMAND_TYPES.REMOVE_FAMILIARITY),
    reorderFamiliarity: run(LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_FAMILIARITY),
    setSecondaryBase: run(SECONDARY_COMMAND_TYPES.SET_SECONDARY_BASE),
    setSecondaryOverride: run(SECONDARY_COMMAND_TYPES.SET_SECONDARY_OVERRIDE),
    clearSecondaryOverride: run(SECONDARY_COMMAND_TYPES.CLEAR_SECONDARY_OVERRIDE),
    setPoolMaximum: run(SECONDARY_COMMAND_TYPES.SET_POOL_MAXIMUM),
    setGeneralNotes: run(NOTES_COMMAND_TYPES.SET_GENERAL),
    addStructuredNote: run(NOTES_COMMAND_TYPES.ADD_STRUCTURED),
    updateStructuredNote: run(NOTES_COMMAND_TYPES.UPDATE_STRUCTURED),
    removeStructuredNote: run(NOTES_COMMAND_TYPES.REMOVE_STRUCTURED),
    reorderStructuredNote: run(NOTES_COMMAND_TYPES.REORDER_STRUCTURED),
  });
}

function requirePlainObject(value, label) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
