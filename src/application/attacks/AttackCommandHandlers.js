import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeAttacks } from "../../domain/character/Attacks.js";
import {
  addAttack,
  findAttackById,
  removeAttack,
  reorderAttack,
  updateAttack,
} from "../../domain/character/AttacksOperations.js";

export const ATTACK_COMMAND_TYPES = Object.freeze({
  ADD: "attack.add",
  UPDATE: "attack.update",
  REMOVE: "attack.remove",
  REORDER: "attack.reorder",
});

export function createAttackCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: ATTACK_COMMAND_TYPES.ADD,
      handler: handleAddAttackCommand,
    }),
    Object.freeze({
      type: ATTACK_COMMAND_TYPES.UPDATE,
      handler: handleUpdateAttackCommand,
    }),
    Object.freeze({
      type: ATTACK_COMMAND_TYPES.REMOVE,
      handler: handleRemoveAttackCommand,
    }),
    Object.freeze({
      type: ATTACK_COMMAND_TYPES.REORDER,
      handler: handleReorderAttackCommand,
    }),
  ]);
}

export function handleAddAttackCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    ATTACK_COMMAND_TYPES.ADD,
  );
  validateExactPayloadKeys(command.payload, ["attack"]);
  const nextAttacks = addAttack(session.character.attacks, command.payload.attack);
  const added = nextAttacks.at(-1);

  return appliedResult(session.character, nextAttacks, {
    operation: "add-attack",
    attackId: added.id,
    index: nextAttacks.length - 1,
  });
}

export function handleUpdateAttackCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    ATTACK_COMMAND_TYPES.UPDATE,
  );
  validateExactPayloadKeys(command.payload, ["attackId", "patch"]);
  const attackId = normalizeAttackId(command.payload.attackId);
  const previous = findAttackById(session.character.attacks, attackId);
  const nextAttacks = updateAttack(
    session.character.attacks,
    attackId,
    command.payload.patch,
  );
  const current = findAttackById(nextAttacks, attackId);

  if (portableEqual(previous, current)) {
    return noOpResult("update-attack-no-op", attackId, "unchanged-attack");
  }

  return appliedResult(session.character, nextAttacks, {
    operation: "update-attack",
    attackId,
    index: nextAttacks.findIndex(attack => attack.id === attackId),
  });
}

export function handleRemoveAttackCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    ATTACK_COMMAND_TYPES.REMOVE,
  );
  validateExactPayloadKeys(command.payload, ["attackId"]);
  const attackId = normalizeAttackId(command.payload.attackId);
  const previousIndex = session.character.attacks.findIndex(
    attack => attack.id === attackId,
  );
  const nextAttacks = removeAttack(session.character.attacks, attackId);

  return appliedResult(session.character, nextAttacks, {
    operation: "remove-attack",
    attackId,
    previousIndex,
  });
}

export function handleReorderAttackCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    ATTACK_COMMAND_TYPES.REORDER,
  );
  validateExactPayloadKeys(command.payload, ["attackId", "targetIndex"]);
  const attackId = normalizeAttackId(command.payload.attackId);
  const previousIndex = session.character.attacks.findIndex(
    attack => attack.id === attackId,
  );
  const nextAttacks = reorderAttack(
    session.character.attacks,
    attackId,
    command.payload.targetIndex,
  );

  if (nextAttacks === session.character.attacks) {
    return noOpResult("reorder-attack-no-op", attackId, "already-at-index");
  }

  return appliedResult(session.character, nextAttacks, {
    operation: "reorder-attack",
    attackId,
    previousIndex,
    targetIndex: command.payload.targetIndex,
  });
}

function appliedResult(character, attacks, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      attacks: serializeAttacks(attacks),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, attackId, reason) {
  return {
    status: "no-op",
    receipt: { operation, attackId, reason },
    diagnostics: [],
  };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Attack command context");
  requirePlainObject(context.session, "Attack command session");
  requirePlainObject(context.command, "Attack command");

  if (context.command.type !== expectedType) {
    throw new Error(`Attack command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Attack command payload");
  requirePlainObject(context.session.character, "Attack command Character");
  if (!Array.isArray(context.session.character.attacks)) {
    throw new Error("Attack command Character attacks must be an array");
  }
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Attack command payload contains unsupported properties");
  }
}

function normalizeAttackId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Attack command attackId must be a non-empty string");
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
