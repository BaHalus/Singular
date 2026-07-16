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
  const run = type => payload => execute(
    type,
    payload === undefined ? {} : payload,
  );

  return Object.freeze({
    setCurrentPool: run(POOL_COMMAND_TYPES.SET_CURRENT),
    adjustCurrentPool: run(POOL_COMMAND_TYPES.ADJUST_CURRENT),
    resetCurrentPoolToMaximum: run(POOL_COMMAND_TYPES.RESET_CURRENT_TO_MAXIMUM),

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
    updateAttack: run(ATTACK_COMMAND_TYPES.UPDATE),

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
      const item = {
        id: input.id ?? generateId(runtime.idGenerator, "equipment"),
        kind,
        containerKind: kind === "container" ? "physical" : null,
        name: input.name ?? "",
        quantity: input.quantity ?? 1,
        weightKg: input.weightKg ?? 0,
        cost: input.cost ?? 0,
        state: input.state ?? "carried",
        notes: input.notes ?? "",
      };
      const containerId = normalizeOptionalText(input.containerId);
      if (containerId !== null) {
        return execute(EQUIPMENT_COMMAND_TYPES.ADD_CHILD, {
          containerId,
          item,
        });
      }
      return execute(EQUIPMENT_COMMAND_TYPES.ADD, { item });
    },
    updateEquipment: run(EQUIPMENT_COMMAND_TYPES.UPDATE),
    renameEquipment: run(EQUIPMENT_COMMAND_TYPES.RENAME),
    setEquipmentQuantity: run(EQUIPMENT_COMMAND_TYPES.SET_QUANTITY),
    setEquipmentState(input = {}) {
      requirePlainObject(input, "Alpha mobile equipment state");
      return execute(EQUIPMENT_COMMAND_TYPES.SET_STATE, {
        itemId: input.itemId,
        state: input.state,
      });
    },

    removeEquipment(input = {}) {
      requirePlainObject(input, "Alpha mobile equipment removal");
      return execute(EQUIPMENT_COMMAND_TYPES.REMOVE, {
        itemId: input.itemId,
      });
    },
    moveEquipment: run(EQUIPMENT_COMMAND_TYPES.MOVE),

    reorderEquipment(input = {}) {
      requirePlainObject(input, "Alpha mobile equipment reorder");
      return execute(EQUIPMENT_COMMAND_TYPES.REORDER, {
        itemId: input.itemId,
        targetIndex: input.targetIndex,
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
    updateSpell: run(SPELL_COMMAND_TYPES.UPDATE),

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

    addPower(input = {}) {
      requirePlainObject(input, "Alpha mobile power addition");
      return execute(POWER_COMMAND_TYPES.ADD, {
        power: {
          id: input.id ?? generateId(runtime.idGenerator, "power"),
          name: input.name ?? "",
          source: input.source ?? "",
          powerModifier: createPowerModifier(input),
          talentTraitId: normalizeOptionalText(input.talentTraitId),
          memberTraitIds: splitTextList(input.memberTraitIds),
          notes: input.notes ?? "",
          tags: splitTextList(input.tags),
        },
      });
    },

    renamePower(input = {}) {
      requirePlainObject(input, "Alpha mobile power rename");
      return execute(POWER_COMMAND_TYPES.RENAME, {
        powerId: input.powerId,
        name: input.name ?? "",
      });
    },
    updatePower: run(POWER_COMMAND_TYPES.UPDATE),

    reorderPower(input = {}) {
      requirePlainObject(input, "Alpha mobile power reorder");
      return execute(POWER_COMMAND_TYPES.REORDER, {
        powerId: input.powerId,
        targetIndex: input.targetIndex,
      });
    },

    removePower(input = {}) {
      requirePlainObject(input, "Alpha mobile power removal");
      return execute(POWER_COMMAND_TYPES.REMOVE, {
        powerId: input.powerId,
      });
    },

    addTrait: run(TRAIT_COMMAND_TYPES.ADD),
    updateTrait: run(TRAIT_COMMAND_TYPES.UPDATE),
    removeTrait: run(TRAIT_COMMAND_TYPES.REMOVE),
    reorderTrait: run(TRAIT_COMMAND_TYPES.REORDER),
    addTraitModifier(input = {}) {
      requirePlainObject(input, "Alpha mobile Trait modifier addition");
      const trait = persistence.getActiveSession().character.traits
        .find(item => item.id === input.traitId);
      return execute(TRAIT_COMMAND_TYPES.ADD_MODIFIER, {
        traitId: input.traitId,
        modifier: {
          id: input.id ?? generateId(runtime.idGenerator, "trait-modifier"),
          name: input.name ?? "",
          kind: input.kind ?? "enhancement",
          valueType: "percentage",
          value: input.value,
          source: input.source ?? null,
          notes: input.notes ?? "",
          enabled: input.enabled ?? true,
          affects: input.affects ?? "total",
        },
        index: input.index ?? trait?.modifiers?.length ?? 0,
      });
    },
    editTraitModifier: run(TRAIT_COMMAND_TYPES.EDIT_MODIFIER),
    removeTraitModifier: run(TRAIT_COMMAND_TYPES.REMOVE_MODIFIER),
    reorderTraitModifier: run(TRAIT_COMMAND_TYPES.REORDER_MODIFIER),
    setTraitModifierEnabled: run(TRAIT_COMMAND_TYPES.SET_MODIFIER_ENABLED),
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

function createPowerModifier(input) {
  const name = normalizeOptionalText(input.powerModifierName);
  const valuePercent = input.powerModifierValuePercent;
  const notes = input.powerModifierNotes ?? "";
  if (name === null && (valuePercent === null || valuePercent === undefined) && notes === "") return null;
  return {
    name: name ?? "",
    valuePercent: valuePercent === undefined ? null : valuePercent,
    notes,
  };
}

function splitTextList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function requirePlainObject(value, label) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
