import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createSpell,
  createSpells,
  serializeSpells,
} from "../../domain/character/Spells.js";

export const SPELL_COMMAND_TYPES = Object.freeze({
  ADD: "spell.add",
  UPDATE: "spell.update",
  REMOVE: "spell.remove",
  REORDER: "spell.reorder",
});

const SPELL_MUTABLE_KEYS = Object.freeze([
  "externalIds",
  "spellType",
  "name",
  "techLevel",
  "attribute",
  "difficulty",
  "points",
  "importedLevel",
  "importedRelativeLevel",
  "importedRelativeLevelText",
  "colleges",
  "powerSource",
  "spellClass",
  "resistance",
  "castingCost",
  "maintenanceCost",
  "castingTime",
  "duration",
  "item",
  "baseSkill",
  "prereqCount",
  "reference",
  "notes",
  "tags",
  "categories",
  "weapons",
  "features",
  "modifiers",
  "prereqs",
  "study",
  "thirdParty",
  "calc",
  "importMeta",
  "raw",
]);

export function createSpellCommandHandlerEntries() {
  return Object.freeze([
    entry(SPELL_COMMAND_TYPES.ADD, handleAddSpellCommand),
    entry(SPELL_COMMAND_TYPES.UPDATE, handleUpdateSpellCommand),
    entry(SPELL_COMMAND_TYPES.REMOVE, handleRemoveSpellCommand),
    entry(SPELL_COMMAND_TYPES.REORDER, handleReorderSpellCommand),
  ]);
}

export function handleAddSpellCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SPELL_COMMAND_TYPES.ADD,
  );
  validateExactPayloadKeys(command.payload, ["spell"]);
  const spellInput = requireExplicitSpellId(command.payload.spell, "spell");
  const nextSpells = createSpells([
    ...serializeSpells(session.character.spells),
    spellInput,
  ]);
  const added = nextSpells.at(-1);

  return appliedResult(session.character, nextSpells, {
    operation: "add-spell",
    spellId: added.id,
    index: nextSpells.length - 1,
  });
}

export function handleUpdateSpellCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SPELL_COMMAND_TYPES.UPDATE,
  );
  validateExactPayloadKeys(command.payload, ["spellId", "patch"]);
  const spellId = normalizeSpellId(command.payload.spellId, "spellId");
  const patch = normalizeSpellPatch(command.payload.patch);
  const previousIndex = findSpellIndex(session.character.spells, spellId);
  const previous = session.character.spells[previousIndex];
  const updated = createSpell({
    ...serializeSpells([previous])[0],
    ...patch,
    id: previous.id,
  });

  if (portableEqual(previous, updated)) {
    return noOpResult("update-spell-no-op", spellId, "unchanged-spell");
  }

  const serialized = serializeSpells(session.character.spells);
  serialized[previousIndex] = serializeSpells([updated])[0];
  const nextSpells = createSpells(serialized);

  return appliedResult(session.character, nextSpells, {
    operation: "update-spell",
    spellId,
    previous: serializeSpells([previous])[0],
    current: serializeSpells([updated])[0],
  });
}

export function handleRemoveSpellCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SPELL_COMMAND_TYPES.REMOVE,
  );
  validateExactPayloadKeys(command.payload, ["spellId"]);
  const spellId = normalizeSpellId(command.payload.spellId, "spellId");
  const previousIndex = findSpellIndex(session.character.spells, spellId);
  const nextSpells = createSpells(
    serializeSpells(session.character.spells)
      .filter(spell => spell.id !== spellId),
  );

  return appliedResult(session.character, nextSpells, {
    operation: "remove-spell",
    spellId,
    previousIndex,
  });
}

export function handleReorderSpellCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SPELL_COMMAND_TYPES.REORDER,
  );
  validateExactPayloadKeys(command.payload, ["spellId", "targetIndex"]);
  const spellId = normalizeSpellId(command.payload.spellId, "spellId");
  const targetIndex = normalizeTargetIndex(command.payload.targetIndex);
  const previousIndex = findSpellIndex(session.character.spells, spellId);

  if (targetIndex >= session.character.spells.length) {
    throw new Error("Spell command targetIndex is out of range");
  }
  if (previousIndex === targetIndex) {
    return noOpResult("reorder-spell-no-op", spellId, "unchanged-index");
  }

  const serialized = serializeSpells(session.character.spells);
  const [moved] = serialized.splice(previousIndex, 1);
  serialized.splice(targetIndex, 0, moved);
  const nextSpells = createSpells(serialized);
  const nextIndex = findSpellIndex(nextSpells, spellId);

  return appliedResult(session.character, nextSpells, {
    operation: "reorder-spell",
    spellId,
    previousIndex,
    targetIndex: nextIndex,
  });
}

function appliedResult(character, spells, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      spells: serializeSpells(spells),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, spellId, reason) {
  return {
    status: "no-op",
    receipt: { operation, spellId, reason },
    diagnostics: [],
  };
}

function entry(type, handler) {
  return Object.freeze({ type, handler });
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Spell command context");
  requirePlainObject(context.session, "Spell command session");
  requirePlainObject(context.command, "Spell command");
  if (context.command.type !== expectedType) {
    throw new Error(`Spell command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Spell command payload");
  if (!Array.isArray(context.session.character?.spells)) {
    throw new Error("Spell command Character spells must be an array");
  }
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Spell command payload contains unsupported properties");
  }
}

function requireExplicitSpellId(spell, label) {
  requirePlainObject(spell, `Spell command ${label}`);
  normalizeSpellId(spell.id, `${label}.id`);
  return spell;
}

function normalizeSpellPatch(patch) {
  requirePlainObject(patch, "Spell command patch");
  if (Reflect.ownKeys(patch).length === 0) {
    throw new Error("Spell command patch must not be empty");
  }

  for (const key of Reflect.ownKeys(patch)) {
    if (typeof key !== "string" || !SPELL_MUTABLE_KEYS.includes(key)) {
      throw new Error("Spell command patch contains unsupported properties");
    }
  }
  return clonePortableValue(patch, "Spell command patch");
}

function findSpellIndex(spells, spellId) {
  const index = spells.findIndex(spell => spell.id === spellId);
  if (index === -1) throw new Error("Spell not found");
  return index;
}

function normalizeSpellId(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Spell command ${field} must be a non-empty string`);
  }
  return value;
}

function normalizeTargetIndex(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Spell command targetIndex must be a non-negative integer");
  }
  return value;
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be a plain object`);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function portableEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null) return false;
  if (typeof left !== typeof right) return false;
  if (typeof left !== "object") return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => portableEqual(item, right[index]));
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => (
    key === rightKeys[index] && portableEqual(left[key], right[key])
  ));
}

function clonePortableValue(value, label, seen = new WeakMap()) {
  assertPortableValue(value, label);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) {
    throw new Error(`${label} must not contain cycles`);
  }

  const clone = Array.isArray(value) ? [] : {};
  seen.set(value, clone);
  if (Array.isArray(value)) {
    value.forEach(item => clone.push(clonePortableValue(item, label, seen)));
  } else {
    Object.entries(value).forEach(([key, item]) => {
      clone[key] = clonePortableValue(item, label, seen);
    });
  }
  seen.delete(value);
  return clone;
}

function assertPortableValue(value, label, seen = new WeakSet()) {
  if (value === null) return true;
  const type = typeof value;
  if (["string", "boolean"].includes(type)) return true;
  if (type === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} must be JSON portable`);
    return true;
  }
  if (type !== "object") throw new Error(`${label} must be JSON portable`);
  if (seen.has(value)) throw new Error(`${label} must not contain cycles`);
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw new Error(`${label} must not contain sparse entries`);
      }
      assertPortableValue(value[index], `${label}[${index}]`, seen);
    }
  } else {
    requirePlainObject(value, label);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") throw new Error(`${label} must be JSON portable`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable) throw new Error(`${label} must be JSON portable`);
      assertPortableValue(value[key], `${label}.${key}`, seen);
    }
  }

  seen.delete(value);
  return true;
}
