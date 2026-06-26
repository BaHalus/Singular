import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeEquipment } from "../../domain/character/Equipment.js";
import {
  addEquipment,
  findEquipmentItem,
  findEquipmentItemIndex,
  moveEquipment,
  removeEquipment,
  reorderEquipment,
  setEquipmentQuantity,
  setEquipmentState,
  updateEquipment,
} from "../../domain/character/EquipmentOperations.js";

export const EQUIPMENT_COMMAND_TYPES = Object.freeze({
  ADD: "equipment.add",
  UPDATE: "equipment.update",
  REMOVE: "equipment.remove",
  REORDER: "equipment.reorder",
  SET_QUANTITY: "equipment.quantity.set",
  SET_STATE: "equipment.state.set",
  MOVE: "equipment.move",
});

export function createEquipmentCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: EQUIPMENT_COMMAND_TYPES.ADD,
      handler: handleAddEquipmentCommand,
    }),
    Object.freeze({
      type: EQUIPMENT_COMMAND_TYPES.UPDATE,
      handler: handleUpdateEquipmentCommand,
    }),
    Object.freeze({
      type: EQUIPMENT_COMMAND_TYPES.REMOVE,
      handler: handleRemoveEquipmentCommand,
    }),
    Object.freeze({
      type: EQUIPMENT_COMMAND_TYPES.REORDER,
      handler: handleReorderEquipmentCommand,
    }),
    Object.freeze({
      type: EQUIPMENT_COMMAND_TYPES.SET_QUANTITY,
      handler: handleSetEquipmentQuantityCommand,
    }),
    Object.freeze({
      type: EQUIPMENT_COMMAND_TYPES.SET_STATE,
      handler: handleSetEquipmentStateCommand,
    }),
    Object.freeze({
      type: EQUIPMENT_COMMAND_TYPES.MOVE,
      handler: handleMoveEquipmentCommand,
    }),
  ]);
}

export function handleAddEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.ADD,
  );
  validateExactPayloadKeys(command.payload, ["item"]);
  const nextEquipment = addEquipment(session.character.equipment, command.payload.item);
  const added = nextEquipment.at(-1);

  return appliedResult(session.character, nextEquipment, {
    operation: "add-equipment",
    itemId: added.id,
    index: nextEquipment.length - 1,
  });
}

export function handleUpdateEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.UPDATE,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "patch"]);
  const itemId = normalizeEquipmentId(command.payload.itemId);
  const previous = findRequiredEquipmentItem(session.character.equipment, itemId);
  const nextEquipment = updateEquipment(
    session.character.equipment,
    itemId,
    command.payload.patch,
  );
  const current = findRequiredEquipmentItem(nextEquipment, itemId);

  if (portableEqual(previous, current)) {
    return noOpResult("update-equipment-no-op", itemId, "unchanged-equipment");
  }

  return appliedResult(session.character, nextEquipment, {
    operation: "update-equipment",
    itemId,
    index: findEquipmentItemIndex(nextEquipment, itemId),
  });
}

export function handleRemoveEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.REMOVE,
  );
  validateExactPayloadKeys(command.payload, ["itemId"]);
  const itemId = normalizeEquipmentId(command.payload.itemId);
  const previousIndex = findEquipmentItemIndex(session.character.equipment, itemId);
  findRequiredEquipmentItem(session.character.equipment, itemId);
  const nextEquipment = removeEquipment(session.character.equipment, itemId);

  return appliedResult(session.character, nextEquipment, {
    operation: "remove-equipment",
    itemId,
    previousIndex,
  });
}

export function handleReorderEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.REORDER,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "targetIndex"]);
  const itemId = normalizeEquipmentId(command.payload.itemId);
  const previousIndex = findEquipmentItemIndex(session.character.equipment, itemId);
  findRequiredEquipmentItem(session.character.equipment, itemId);
  const nextEquipment = reorderEquipment(
    session.character.equipment,
    itemId,
    command.payload.targetIndex,
  );

  if (nextEquipment === session.character.equipment) {
    return noOpResult("reorder-equipment-no-op", itemId, "already-at-index");
  }

  return appliedResult(session.character, nextEquipment, {
    operation: "reorder-equipment",
    itemId,
    previousIndex,
    targetIndex: command.payload.targetIndex,
  });
}

export function handleSetEquipmentQuantityCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.SET_QUANTITY,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "quantity"]);
  const itemId = normalizeEquipmentId(command.payload.itemId);
  const previous = findRequiredEquipmentItem(session.character.equipment, itemId);
  const nextEquipment = setEquipmentQuantity(
    session.character.equipment,
    itemId,
    command.payload.quantity,
  );
  const current = findRequiredEquipmentItem(nextEquipment, itemId);

  if (Object.is(previous.quantity, current.quantity)) {
    return noOpResult("set-equipment-quantity-no-op", itemId, "unchanged-quantity");
  }

  return appliedResult(session.character, nextEquipment, {
    operation: "set-equipment-quantity",
    itemId,
    previousQuantity: previous.quantity,
    quantity: current.quantity,
  });
}

export function handleSetEquipmentStateCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.SET_STATE,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "state"]);
  const itemId = normalizeEquipmentId(command.payload.itemId);
  const previous = findRequiredEquipmentItem(session.character.equipment, itemId);
  const nextEquipment = setEquipmentState(
    session.character.equipment,
    itemId,
    command.payload.state,
  );
  const current = findRequiredEquipmentItem(nextEquipment, itemId);

  if (previous.state === current.state) {
    return noOpResult("set-equipment-state-no-op", itemId, "unchanged-state");
  }

  return appliedResult(session.character, nextEquipment, {
    operation: "set-equipment-state",
    itemId,
    previousState: previous.state,
    state: current.state,
  });
}

export function handleMoveEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.MOVE,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "targetContainerId"]);
  const itemId = normalizeEquipmentId(command.payload.itemId);
  const targetContainerId = normalizeNullableEquipmentId(
    command.payload.targetContainerId,
  );
  const previousIndex = findEquipmentItemIndex(session.character.equipment, itemId);
  findRequiredEquipmentItem(session.character.equipment, itemId);
  const nextEquipment = moveEquipment(
    session.character.equipment,
    itemId,
    targetContainerId,
  );

  if (portableEqual(session.character.equipment, nextEquipment)) {
    return noOpResult("move-equipment-no-op", itemId, "unchanged-container");
  }

  return appliedResult(session.character, nextEquipment, {
    operation: targetContainerId === null
      ? "withdraw-equipment"
      : "store-equipment",
    itemId,
    previousIndex,
    targetContainerId,
    index: findEquipmentItemIndex(nextEquipment, itemId),
  });
}

function appliedResult(character, equipment, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      equipment: serializeEquipment(equipment),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, itemId, reason) {
  return {
    status: "no-op",
    receipt: { operation, itemId, reason },
    diagnostics: [],
  };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Equipment command context");
  requirePlainObject(context.session, "Equipment command session");
  requirePlainObject(context.command, "Equipment command");

  if (context.command.type !== expectedType) {
    throw new Error(`Equipment command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Equipment command payload");
  requirePlainObject(context.session.character, "Equipment command Character");
  if (!Array.isArray(context.session.character.equipment)) {
    throw new Error("Equipment command Character equipment must be an array");
  }
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Equipment command payload contains unsupported properties");
  }
}

function normalizeEquipmentId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Equipment command itemId must be a non-empty string");
  }
  return value;
}

function normalizeNullableEquipmentId(value) {
  if (value === null) return null;
  return normalizeEquipmentId(value);
}

function findRequiredEquipmentItem(equipment, itemId) {
  const item = findEquipmentItem(equipment, itemId);
  if (item === null) {
    throw new Error("Equipment item not found");
  }
  return item;
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
