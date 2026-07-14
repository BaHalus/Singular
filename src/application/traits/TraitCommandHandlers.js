import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeTraits } from "../../domain/character/Traits.js";
import {
  applyTraitCostBasisCommands,
} from "../../domain/character/TraitCostBasisCommands.js";
import {
  applyTraitModifierCommands,
} from "../../domain/character/TraitModifierCommands.js";
import { serializeTraitModifiers } from "../../domain/character/TraitModifiers.js";
import {
  addTrait,
  findTraitById,
  removeTrait,
  reorderTrait,
  updateTrait,
} from "../../domain/character/TraitsOperations.js";

export const TRAIT_COMMAND_TYPES = Object.freeze({
  ADD: "trait.add",
  UPDATE: "trait.update",
  REMOVE: "trait.remove",
  REORDER: "trait.reorder",
  ADD_MODIFIER: "trait.modifier.add",
  EDIT_MODIFIER: "trait.modifier.edit",
  REMOVE_MODIFIER: "trait.modifier.remove",
  REORDER_MODIFIER: "trait.modifier.reorder",
  SET_MODIFIER_ENABLED: "trait.modifier.enabled.set",
  SET_COST_BASIS_MODE: "trait.cost-basis.mode.set",
  SET_BASE_POINTS: "trait.cost-basis.base-points.set",
  SET_POINTS_PER_LEVEL: "trait.cost-basis.points-per-level.set",
  SET_COST_BASIS_LEVELS: "trait.cost-basis.levels.set",
});

export function createTraitCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: TRAIT_COMMAND_TYPES.ADD,
      handler: handleAddTraitCommand,
    }),
    Object.freeze({
      type: TRAIT_COMMAND_TYPES.UPDATE,
      handler: handleUpdateTraitCommand,
    }),
    Object.freeze({
      type: TRAIT_COMMAND_TYPES.REMOVE,
      handler: handleRemoveTraitCommand,
    }),
    Object.freeze({
      type: TRAIT_COMMAND_TYPES.REORDER,
      handler: handleReorderTraitCommand,
    }),
    entry(TRAIT_COMMAND_TYPES.ADD_MODIFIER, payloadHandler(
      TRAIT_COMMAND_TYPES.ADD_MODIFIER,
      ["traitId", "modifier", "index"],
      payload => ({ type: "add", modifier: payload.modifier, index: payload.index }),
      "modifier",
    )),
    entry(TRAIT_COMMAND_TYPES.EDIT_MODIFIER, payloadHandler(
      TRAIT_COMMAND_TYPES.EDIT_MODIFIER,
      ["traitId", "modifierId", "patch"],
      payload => ({ type: "edit", id: payload.modifierId, patch: payload.patch }),
      "modifier",
    )),
    entry(TRAIT_COMMAND_TYPES.REMOVE_MODIFIER, payloadHandler(
      TRAIT_COMMAND_TYPES.REMOVE_MODIFIER,
      ["traitId", "modifierId"],
      payload => ({ type: "remove", id: payload.modifierId }),
      "modifier",
    )),
    entry(TRAIT_COMMAND_TYPES.REORDER_MODIFIER, payloadHandler(
      TRAIT_COMMAND_TYPES.REORDER_MODIFIER,
      ["traitId", "modifierId", "toIndex"],
      payload => ({ type: "reorder", id: payload.modifierId, toIndex: payload.toIndex }),
      "modifier",
    )),
    entry(TRAIT_COMMAND_TYPES.SET_MODIFIER_ENABLED, payloadHandler(
      TRAIT_COMMAND_TYPES.SET_MODIFIER_ENABLED,
      ["traitId", "modifierId", "enabled"],
      payload => ({ type: "set-enabled", id: payload.modifierId, enabled: payload.enabled }),
      "modifier",
    )),
    entry(TRAIT_COMMAND_TYPES.SET_COST_BASIS_MODE, payloadHandler(
      TRAIT_COMMAND_TYPES.SET_COST_BASIS_MODE,
      ["traitId", "mode"],
      payload => ({ type: "set-mode", mode: payload.mode }),
      "cost-basis",
    )),
    entry(TRAIT_COMMAND_TYPES.SET_BASE_POINTS, payloadHandler(
      TRAIT_COMMAND_TYPES.SET_BASE_POINTS,
      ["traitId", "value"],
      payload => ({ type: "set-base-points", value: payload.value }),
      "cost-basis",
    )),
    entry(TRAIT_COMMAND_TYPES.SET_POINTS_PER_LEVEL, payloadHandler(
      TRAIT_COMMAND_TYPES.SET_POINTS_PER_LEVEL,
      ["traitId", "value"],
      payload => ({ type: "set-points-per-level", value: payload.value }),
      "cost-basis",
    )),
    entry(TRAIT_COMMAND_TYPES.SET_COST_BASIS_LEVELS, payloadHandler(
      TRAIT_COMMAND_TYPES.SET_COST_BASIS_LEVELS,
      ["traitId", "value"],
      payload => ({ type: "set-levels", value: payload.value }),
      "cost-basis",
    )),
  ]);
}

function payloadHandler(expectedType, payloadKeys, createDomainCommand, family) {
  return context => handleTraitDetailCommand(
    context,
    expectedType,
    payloadKeys,
    createDomainCommand,
    family,
  );
}

export function handleAddTraitCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    TRAIT_COMMAND_TYPES.ADD,
  );
  validateExactPayloadKeys(command.payload, ["trait"]);
  const nextTraits = addTrait(session.character.traits, command.payload.trait);
  const added = nextTraits.at(-1);

  return appliedResult(session.character, nextTraits, {
    operation: "add-trait",
    traitId: added.id,
    role: added.role,
    index: nextTraits.length - 1,
  });
}

export function handleUpdateTraitCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    TRAIT_COMMAND_TYPES.UPDATE,
  );
  validateExactPayloadKeys(command.payload, ["traitId", "patch"]);
  const traitId = normalizeTraitId(command.payload.traitId);
  const previous = findTraitById(session.character.traits, traitId);
  const nextTraits = updateTrait(
    session.character.traits,
    traitId,
    command.payload.patch,
  );
  const current = findTraitById(nextTraits, traitId);

  if (portableEqual(previous, current)) {
    return noOpResult("update-trait-no-op", traitId, "unchanged-trait");
  }

  return appliedResult(session.character, nextTraits, {
    operation: "update-trait",
    traitId,
    role: current.role,
    index: nextTraits.findIndex(trait => trait.id === traitId),
  });
}

export function handleRemoveTraitCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    TRAIT_COMMAND_TYPES.REMOVE,
  );
  validateExactPayloadKeys(command.payload, ["traitId"]);
  const traitId = normalizeTraitId(command.payload.traitId);
  const previous = findTraitById(session.character.traits, traitId);
  const previousIndex = session.character.traits.findIndex(
    trait => trait.id === traitId,
  );
  const nextTraits = removeTrait(session.character.traits, traitId);

  return appliedResult(session.character, nextTraits, {
    operation: "remove-trait",
    traitId,
    role: previous.role,
    previousIndex,
  });
}

export function handleReorderTraitCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    TRAIT_COMMAND_TYPES.REORDER,
  );
  validateExactPayloadKeys(command.payload, ["traitId", "targetIndex"]);
  const traitId = normalizeTraitId(command.payload.traitId);
  const previousIndex = session.character.traits.findIndex(
    trait => trait.id === traitId,
  );
  const nextTraits = reorderTrait(
    session.character.traits,
    traitId,
    command.payload.targetIndex,
  );

  if (nextTraits === session.character.traits) {
    return noOpResult("reorder-trait-no-op", traitId, "already-at-index");
  }

  return appliedResult(session.character, nextTraits, {
    operation: "reorder-trait",
    traitId,
    previousIndex,
    targetIndex: command.payload.targetIndex,
  });
}

function handleTraitDetailCommand(
  context,
  expectedType,
  payloadKeys,
  createDomainCommand,
  family,
) {
  const { session, command } = validateCommandContext(context, expectedType);
  validateExactPayloadKeys(command.payload, payloadKeys);
  const traitId = normalizeTraitId(command.payload.traitId);
  const previous = findTraitById(session.character.traits, traitId);
  if (previous === null) throw new Error("Trait not found");
  const domainCommand = createDomainCommand(command.payload);
  const current = family === "modifier"
    ? updateTraitWithModifierCommand(previous, domainCommand)
    : applyTraitCostBasisCommands(previous, [domainCommand]);

  if (portableEqual(previous, current)) {
    return noOpResult(`${expectedType}-no-op`, traitId, "unchanged-trait-detail");
  }

  const patch = family === "modifier"
    ? {
        modifiers: serializeTraitModifiers(current.modifiers),
        pointValue: current.pointValue,
      }
    : { pointValue: current.pointValue };
  const nextTraits = updateTrait(session.character.traits, traitId, patch);
  return appliedResult(session.character, nextTraits, {
    operation: expectedType,
    traitId,
    family,
    detailId: domainCommand.id ?? null,
    domainCommandType: domainCommand.type,
  });
}

function updateTraitWithModifierCommand(trait, domainCommand) {
  const modifiers = applyTraitModifierCommands(trait.modifiers, [domainCommand]);
  if (portableEqual(trait.modifiers, modifiers)) return trait;
  return updateTrait([trait], trait.id, {
    modifiers: serializeTraitModifiers(modifiers),
    pointValue: {
      ...trait.pointValue,
      calculatedPoints: null,
      finalCostAuthority: null,
    },
  })[0];
}

function appliedResult(character, traits, receipt) {
  const snapshot = serializeCharacter(character);
  delete snapshot.advantages;
  delete snapshot.perks;
  delete snapshot.disadvantages;
  delete snapshot.quirks;

  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      traits: serializeTraits(traits),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, traitId, reason) {
  return {
    status: "no-op",
    receipt: { operation, traitId, reason },
    diagnostics: [],
  };
}

function entry(type, handler) {
  return Object.freeze({ type, handler });
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Trait command context");
  requirePlainObject(context.session, "Trait command session");
  requirePlainObject(context.command, "Trait command");

  if (context.command.type !== expectedType) {
    throw new Error(`Trait command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Trait command payload");
  requirePlainObject(context.session.character, "Trait command Character");
  if (!Array.isArray(context.session.character.traits)) {
    throw new Error("Trait command Character traits must be an array");
  }
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Trait command payload contains unsupported properties");
  }
}

function normalizeTraitId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Trait command traitId must be a non-empty string");
  }
  return value;
}

function portableEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null) return false;
  if (typeof left !== "object" || typeof right !== "object") return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return left.length === right.length &&
      left.every((item, index) => portableEqual(item, right[index]));
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && portableEqual(left[key], right[key]));
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
