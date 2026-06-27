import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializePowers } from "../../domain/character/Powers.js";
import {
  addPower,
  addPowerMemberTrait,
  addPowerTag,
  removePower,
  removePowerMemberTrait,
  removePowerTag,
  renamePower,
  setPowerModifier,
  setPowerSource,
  setPowerTalentTrait,
  updatePowerNotes,
} from "../../domain/character/PowersOperations.js";

export const POWER_COMMAND_TYPES = Object.freeze({
  ADD: "power.add",
  RENAME: "power.rename",
  SET_SOURCE: "power.source.set",
  SET_MODIFIER: "power.modifier.set",
  SET_TALENT_TRAIT: "power.talentTrait.set",
  UPDATE_NOTES: "power.notes.update",
  ADD_MEMBER_TRAIT: "power.memberTrait.add",
  REMOVE_MEMBER_TRAIT: "power.memberTrait.remove",
  ADD_TAG: "power.tag.add",
  REMOVE_TAG: "power.tag.remove",
  REMOVE: "power.remove",
});

export function createPowerCommandHandlerEntries() {
  return Object.freeze([
    entry(POWER_COMMAND_TYPES.ADD, handleAddPowerCommand),
    entry(POWER_COMMAND_TYPES.RENAME, handleRenamePowerCommand),
    entry(POWER_COMMAND_TYPES.SET_SOURCE, handleSetPowerSourceCommand),
    entry(POWER_COMMAND_TYPES.SET_MODIFIER, handleSetPowerModifierCommand),
    entry(POWER_COMMAND_TYPES.SET_TALENT_TRAIT, handleSetPowerTalentTraitCommand),
    entry(POWER_COMMAND_TYPES.UPDATE_NOTES, handleUpdatePowerNotesCommand),
    entry(POWER_COMMAND_TYPES.ADD_MEMBER_TRAIT, handleAddPowerMemberTraitCommand),
    entry(POWER_COMMAND_TYPES.REMOVE_MEMBER_TRAIT, handleRemovePowerMemberTraitCommand),
    entry(POWER_COMMAND_TYPES.ADD_TAG, handleAddPowerTagCommand),
    entry(POWER_COMMAND_TYPES.REMOVE_TAG, handleRemovePowerTagCommand),
    entry(POWER_COMMAND_TYPES.REMOVE, handleRemovePowerCommand),
  ]);
}

export function handleAddPowerCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.ADD);
  validateExactPayloadKeys(command.payload, ["power"]);
  requireExplicitPowerId(command.payload.power, "power");
  const nextPowers = addPower(session.character.powers, command.payload.power);
  const added = nextPowers.at(-1);
  return appliedResult(session.character, nextPowers, {
    operation: "add-power",
    powerId: added.id,
    index: nextPowers.length - 1,
  });
}

export function handleRenamePowerCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.RENAME);
  validateExactPayloadKeys(command.payload, ["powerId", "name"]);
  const powerId = normalizePowerId(command.payload.powerId, "powerId");
  const previous = requirePower(session.character.powers, powerId);
  const nextPowers = renamePower(session.character.powers, powerId, command.payload.name);
  return appliedOrNoOp(session.character, nextPowers, previous, powerId, "rename-power", "unchanged-name", power => power.name);
}

export function handleSetPowerSourceCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.SET_SOURCE);
  validateExactPayloadKeys(command.payload, ["powerId", "source"]);
  const powerId = normalizePowerId(command.payload.powerId, "powerId");
  const previous = requirePower(session.character.powers, powerId);
  const nextPowers = setPowerSource(session.character.powers, powerId, command.payload.source);
  return appliedOrNoOp(session.character, nextPowers, previous, powerId, "set-power-source", "unchanged-source", power => power.source);
}

export function handleSetPowerModifierCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.SET_MODIFIER);
  validateExactPayloadKeys(command.payload, ["powerId", "powerModifier"]);
  const powerId = normalizePowerId(command.payload.powerId, "powerId");
  const previous = requirePower(session.character.powers, powerId);
  const nextPowers = setPowerModifier(session.character.powers, powerId, command.payload.powerModifier);
  return appliedOrNoOp(session.character, nextPowers, previous, powerId, "set-power-modifier", "unchanged-power-modifier", power => power.powerModifier);
}

export function handleSetPowerTalentTraitCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.SET_TALENT_TRAIT);
  validateExactPayloadKeys(command.payload, ["powerId", "talentTraitId"]);
  const powerId = normalizePowerId(command.payload.powerId, "powerId");
  const previous = requirePower(session.character.powers, powerId);
  const talentTraitId = normalizeNullablePowerId(command.payload.talentTraitId, "talentTraitId");
  const nextPowers = setPowerTalentTrait(session.character.powers, powerId, talentTraitId);
  return appliedOrNoOp(session.character, nextPowers, previous, powerId, "set-power-talent-trait", "unchanged-talent-trait", power => power.talentTraitId);
}

export function handleUpdatePowerNotesCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.UPDATE_NOTES);
  validateExactPayloadKeys(command.payload, ["powerId", "notes"]);
  const powerId = normalizePowerId(command.payload.powerId, "powerId");
  const previous = requirePower(session.character.powers, powerId);
  const nextPowers = updatePowerNotes(session.character.powers, powerId, command.payload.notes);
  return appliedOrNoOp(session.character, nextPowers, previous, powerId, "update-power-notes", "unchanged-notes", power => power.notes);
}

export function handleAddPowerMemberTraitCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.ADD_MEMBER_TRAIT);
  validateExactPayloadKeys(command.payload, ["powerId", "traitId"]);
  return applySimpleMembership(context, addPowerMemberTrait, "add-power-member-trait", "unchanged-member-traits");
}

export function handleRemovePowerMemberTraitCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.REMOVE_MEMBER_TRAIT);
  validateExactPayloadKeys(command.payload, ["powerId", "traitId"]);
  return applySimpleMembership({ session, command }, removePowerMemberTrait, "remove-power-member-trait", "unchanged-member-traits");
}

export function handleAddPowerTagCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.ADD_TAG);
  validateExactPayloadKeys(command.payload, ["powerId", "tag"]);
  return applySimpleTag({ session, command }, addPowerTag, "add-power-tag", "unchanged-tags");
}

export function handleRemovePowerTagCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.REMOVE_TAG);
  validateExactPayloadKeys(command.payload, ["powerId", "tag"]);
  return applySimpleTag({ session, command }, removePowerTag, "remove-power-tag", "unchanged-tags");
}

export function handleRemovePowerCommand(context) {
  const { session, command } = validateCommandContext(context, POWER_COMMAND_TYPES.REMOVE);
  validateExactPayloadKeys(command.payload, ["powerId"]);
  const powerId = normalizePowerId(command.payload.powerId, "powerId");
  const previousIndex = findPowerIndex(session.character.powers, powerId);
  const nextPowers = removePower(session.character.powers, powerId);
  return appliedResult(session.character, nextPowers, {
    operation: "remove-power",
    powerId,
    previousIndex,
  });
}

function applySimpleMembership(context, operation, receiptOperation, noOpReason) {
  const powerId = normalizePowerId(context.command.payload.powerId, "powerId");
  const previous = requirePower(context.session.character.powers, powerId);
  const nextPowers = operation(context.session.character.powers, powerId, context.command.payload.traitId);
  return appliedOrNoOp(context.session.character, nextPowers, previous, powerId, receiptOperation, noOpReason, power => power.memberTraitIds);
}

function applySimpleTag(context, operation, receiptOperation, noOpReason) {
  const powerId = normalizePowerId(context.command.payload.powerId, "powerId");
  const previous = requirePower(context.session.character.powers, powerId);
  const nextPowers = operation(context.session.character.powers, powerId, context.command.payload.tag);
  return appliedOrNoOp(context.session.character, nextPowers, previous, powerId, receiptOperation, noOpReason, power => power.tags);
}

function appliedOrNoOp(character, nextPowers, previous, powerId, operation, noOpReason, readField) {
  const current = requirePower(nextPowers, powerId);
  if (portableEqual(readField(previous), readField(current))) {
    return noOpResult(`${operation}-no-op`, powerId, noOpReason);
  }
  return appliedResult(character, nextPowers, {
    operation,
    powerId,
    previous: serializePowers([previous])[0],
    current: serializePowers([current])[0],
  });
}

function appliedResult(character, powers, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({ ...snapshot, powers: serializePowers(powers) }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, powerId, reason) {
  return { status: "no-op", receipt: { operation, powerId, reason }, diagnostics: [] };
}

function entry(type, handler) {
  return Object.freeze({ type, handler });
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Power command context");
  requirePlainObject(context.session, "Power command session");
  requirePlainObject(context.command, "Power command");
  if (context.command.type !== expectedType) throw new Error(`Power command type must be ${expectedType}`);
  requirePlainObject(context.command.payload, "Power command payload");
  if (!Array.isArray(context.session.character?.powers)) throw new Error("Power command Character powers must be an array");
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (keys.length !== expectedKeys.length || keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))) {
    throw new Error("Power command payload contains unsupported properties");
  }
}

function requireExplicitPowerId(power, label) {
  requirePlainObject(power, `Power command ${label}`);
  normalizePowerId(power.id, `${label}.id`);
}

function requirePower(powers, powerId) {
  return powers[findPowerIndex(powers, powerId)];
}

function findPowerIndex(powers, powerId) {
  const index = powers.findIndex(power => power.id === powerId);
  if (index === -1) throw new Error("Power not found");
  return index;
}

function normalizePowerId(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Power command ${field} must be a non-empty string`);
  return value;
}

function normalizeNullablePowerId(value, field) {
  if (value === null) return null;
  return normalizePowerId(value, field);
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be a plain object`);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function portableEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== typeof right) return false;
  if (typeof left !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => portableEqual(item, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && portableEqual(left[key], right[key]));
}
