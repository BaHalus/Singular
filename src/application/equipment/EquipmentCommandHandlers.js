import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeEquipment } from "../../domain/character/Equipment.js";
import {
  applyEquipmentModifierCommands,
} from "../../domain/character/EquipmentModifierCommands.js";
import {
  createEquipmentModifierList,
  serializeEquipmentModifierList,
} from "../../domain/character/EquipmentModifiers.js";
import {
  addChildEquipment,
  addEquipment,
  findEquipmentItem,
  moveEquipment,
  removeEquipment,
  renameEquipment,
  reorderEquipment,
  setEquipmentQuantity,
  setEquipmentState,
  updateEquipment,
} from "../../domain/character/EquipmentOperations.js";

export const EQUIPMENT_COMMAND_TYPES = Object.freeze({
  ADD: "equipment.add",
  ADD_CHILD: "equipment.add-child",
  UPDATE: "equipment.update",
  RENAME: "equipment.rename",
  SET_QUANTITY: "equipment.quantity.set",
  SET_STATE: "equipment.state.set",
  REMOVE: "equipment.remove",
  MOVE: "equipment.move",
  REORDER: "equipment.reorder",
  ADD_MODIFIER: "equipment.modifier.add",
  EDIT_MODIFIER: "equipment.modifier.edit",
  REMOVE_MODIFIER: "equipment.modifier.remove",
  REORDER_MODIFIER: "equipment.modifier.reorder",
  SET_MODIFIER_ENABLED: "equipment.modifier.enabled.set",
});

export function createEquipmentCommandHandlerEntries() {
  return Object.freeze([
    entry(EQUIPMENT_COMMAND_TYPES.ADD, handleAddEquipmentCommand),
    entry(EQUIPMENT_COMMAND_TYPES.ADD_CHILD, handleAddChildEquipmentCommand),
    entry(EQUIPMENT_COMMAND_TYPES.UPDATE, handleUpdateEquipmentCommand),
    entry(EQUIPMENT_COMMAND_TYPES.RENAME, handleRenameEquipmentCommand),
    entry(EQUIPMENT_COMMAND_TYPES.SET_QUANTITY, handleSetEquipmentQuantityCommand),
    entry(EQUIPMENT_COMMAND_TYPES.SET_STATE, handleSetEquipmentStateCommand),
    entry(EQUIPMENT_COMMAND_TYPES.REMOVE, handleRemoveEquipmentCommand),
    entry(EQUIPMENT_COMMAND_TYPES.MOVE, handleMoveEquipmentCommand),
    entry(EQUIPMENT_COMMAND_TYPES.REORDER, handleReorderEquipmentCommand),
    entry(EQUIPMENT_COMMAND_TYPES.ADD_MODIFIER, handleAddEquipmentModifierCommand),
    entry(EQUIPMENT_COMMAND_TYPES.EDIT_MODIFIER, handleEditEquipmentModifierCommand),
    entry(EQUIPMENT_COMMAND_TYPES.REMOVE_MODIFIER, handleRemoveEquipmentModifierCommand),
    entry(EQUIPMENT_COMMAND_TYPES.REORDER_MODIFIER, handleReorderEquipmentModifierCommand),
    entry(EQUIPMENT_COMMAND_TYPES.SET_MODIFIER_ENABLED, handleSetEquipmentModifierEnabledCommand),
  ]);
}

export function handleAddEquipmentModifierCommand(context) {
  return handleEquipmentModifierCommand(
    context,
    EQUIPMENT_COMMAND_TYPES.ADD_MODIFIER,
    ["itemId", "node", "parentId", "index"],
    payload => ({
      type: "add",
      node: payload.node,
      parentId: payload.parentId,
      index: payload.index,
    }),
  );
}

export function handleEditEquipmentModifierCommand(context) {
  return handleEquipmentModifierCommand(
    context,
    EQUIPMENT_COMMAND_TYPES.EDIT_MODIFIER,
    ["itemId", "modifierId", "patch"],
    payload => ({ type: "edit", id: payload.modifierId, patch: payload.patch }),
  );
}

export function handleRemoveEquipmentModifierCommand(context) {
  return handleEquipmentModifierCommand(
    context,
    EQUIPMENT_COMMAND_TYPES.REMOVE_MODIFIER,
    ["itemId", "modifierId"],
    payload => ({ type: "remove", id: payload.modifierId }),
  );
}

export function handleReorderEquipmentModifierCommand(context) {
  return handleEquipmentModifierCommand(
    context,
    EQUIPMENT_COMMAND_TYPES.REORDER_MODIFIER,
    ["itemId", "modifierId", "parentId", "toIndex"],
    payload => ({
      type: "reorder",
      id: payload.modifierId,
      parentId: payload.parentId,
      toIndex: payload.toIndex,
    }),
  );
}

export function handleSetEquipmentModifierEnabledCommand(context) {
  return handleEquipmentModifierCommand(
    context,
    EQUIPMENT_COMMAND_TYPES.SET_MODIFIER_ENABLED,
    ["itemId", "modifierId", "enabled"],
    payload => ({
      type: "set-enabled",
      id: payload.modifierId,
      enabled: payload.enabled,
    }),
  );
}

export function handleAddEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.ADD,
  );
  validateExactPayloadKeys(command.payload, ["item"]);
  const itemInput = requireExplicitEquipmentIds(command.payload.item, "item");
  const nextEquipment = addEquipment(session.character.equipment, itemInput);
  const added = nextEquipment.at(-1);

  return appliedResult(session.character, nextEquipment, {
    operation: "add-equipment",
    itemId: added.id,
    containerId: null,
    index: nextEquipment.length - 1,
  });
}

export function handleAddChildEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.ADD_CHILD,
  );
  validateExactPayloadKeys(command.payload, ["containerId", "item"]);
  const containerId = normalizeItemId(command.payload.containerId, "containerId");
  const itemInput = requireExplicitEquipmentIds(command.payload.item, "item");
  const nextEquipment = addChildEquipment(
    session.character.equipment,
    containerId,
    itemInput,
  );
  const container = findEquipmentItem(nextEquipment, containerId);
  const added = container.children.at(-1);

  return appliedResult(session.character, nextEquipment, {
    operation: "add-child-equipment",
    itemId: added.id,
    containerId,
    index: container.children.length - 1,
  });
}

export function handleUpdateEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.UPDATE,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "patch"]);
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  requirePlainObject(command.payload.patch, "Equipment command patch");
  const previous = requireItem(session.character.equipment, itemId);
  const nextEquipment = updateEquipment(
    session.character.equipment,
    itemId,
    command.payload.patch,
  );
  const current = requireItem(nextEquipment, itemId);

  if (portableEqual(previous, current)) {
    return noOpResult("update-equipment-no-op", itemId, "unchanged-equipment");
  }
  return appliedResult(session.character, nextEquipment, {
    operation: "update-equipment",
    itemId,
    previous: serializeEquipment([previous])[0],
    current: serializeEquipment([current])[0],
  });
}

export function handleRenameEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.RENAME,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "name"]);
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  const name = normalizeEquipmentName(command.payload.name);
  const previous = requireItem(session.character.equipment, itemId);
  const nextEquipment = renameEquipment(
    session.character.equipment,
    itemId,
    name,
  );
  const current = requireItem(nextEquipment, itemId);

  if (portableEqual(previous, current)) {
    return noOpResult("rename-equipment-no-op", itemId, "unchanged-name");
  }
  return appliedResult(session.character, nextEquipment, {
    operation: "rename-equipment",
    itemId,
    previousName: previous.name,
    name: current.name,
  });
}

export function handleSetEquipmentQuantityCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.SET_QUANTITY,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "quantity"]);
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  const previous = requireItem(session.character.equipment, itemId);
  const nextEquipment = setEquipmentQuantity(
    session.character.equipment,
    itemId,
    command.payload.quantity,
  );
  const current = requireItem(nextEquipment, itemId);

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
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  const previous = requireItem(session.character.equipment, itemId);
  const nextEquipment = setEquipmentState(
    session.character.equipment,
    itemId,
    command.payload.state,
  );
  const current = requireItem(nextEquipment, itemId);

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

export function handleRemoveEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.REMOVE,
  );
  validateExactPayloadKeys(command.payload, ["itemId"]);
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  const location = requireItemLocation(session.character.equipment, itemId);
  const nextEquipment = removeEquipment(session.character.equipment, itemId);

  return appliedResult(session.character, nextEquipment, {
    operation: "remove-equipment",
    itemId,
    previousContainerId: location.containerId,
    previousIndex: location.index,
  });
}

export function handleMoveEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.MOVE,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "targetContainerId"]);
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  const targetContainerId = normalizeNullableItemId(
    command.payload.targetContainerId,
    "targetContainerId",
  );
  const previousLocation = requireItemLocation(session.character.equipment, itemId);
  const nextEquipment = moveEquipment(
    session.character.equipment,
    itemId,
    targetContainerId,
  );
  const nextLocation = requireItemLocation(nextEquipment, itemId);

  if (portableEqual(session.character.equipment, nextEquipment)) {
    return noOpResult("move-equipment-no-op", itemId, "unchanged-location");
  }
  return appliedResult(session.character, nextEquipment, {
    operation: "move-equipment",
    itemId,
    previousContainerId: previousLocation.containerId,
    previousIndex: previousLocation.index,
    targetContainerId: nextLocation.containerId,
    targetIndex: nextLocation.index,
  });
}

export function handleReorderEquipmentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    EQUIPMENT_COMMAND_TYPES.REORDER,
  );
  validateExactPayloadKeys(command.payload, ["itemId", "targetIndex"]);
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  const targetIndex = normalizeTargetIndex(command.payload.targetIndex);
  const previousLocation = requireItemLocation(session.character.equipment, itemId);
  const nextEquipment = reorderEquipment(
    session.character.equipment,
    itemId,
    targetIndex,
  );
  const nextLocation = requireItemLocation(nextEquipment, itemId);

  if (portableEqual(session.character.equipment, nextEquipment)) {
    return noOpResult("reorder-equipment-no-op", itemId, "unchanged-index");
  }
  return appliedResult(session.character, nextEquipment, {
    operation: "reorder-equipment",
    itemId,
    containerId: nextLocation.containerId,
    previousIndex: previousLocation.index,
    targetIndex: nextLocation.index,
  });
}

function handleEquipmentModifierCommand(
  context,
  expectedType,
  payloadKeys,
  createDomainCommand,
) {
  const { session, command } = validateCommandContext(context, expectedType);
  validateExactPayloadKeys(command.payload, payloadKeys);
  const itemId = normalizeItemId(command.payload.itemId, "itemId");
  const previous = requireItem(session.character.equipment, itemId);
  const previousList = createEquipmentModifierList({
    id: `${itemId}:modifiers`,
    rows: previous.modifiers,
  });
  const nextList = applyEquipmentModifierCommands(
    previousList,
    [createDomainCommand(command.payload)],
  );
  const previousRows = serializeEquipmentModifierList(previousList).rows;
  const nextRows = serializeEquipmentModifierList(nextList).rows;

  if (portableEqual(previousRows, nextRows)) {
    return noOpResult(
      `${expectedType}-no-op`,
      itemId,
      "unchanged-equipment-modifiers",
    );
  }

  const nextEquipment = updateEquipment(
    session.character.equipment,
    itemId,
    { modifiers: nextRows },
  );
  const domainCommand = createDomainCommand(command.payload);
  return appliedResult(session.character, nextEquipment, {
    operation: expectedType,
    itemId,
    modifierId: domainCommand.id ?? domainCommand.node.id,
    modifierCommandType: domainCommand.type,
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

function entry(type, handler) {
  return Object.freeze({ type, handler });
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Equipment command context");
  requirePlainObject(context.session, "Equipment command session");
  requirePlainObject(context.command, "Equipment command");
  if (context.command.type !== expectedType) {
    throw new Error(`Equipment command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Equipment command payload");
  if (!Array.isArray(context.session.character?.equipment)) {
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

function requireExplicitEquipmentIds(item, label) {
  requirePlainObject(item, `Equipment command ${label}`);
  normalizeItemId(item.id, `${label}.id`);
  if (item.children !== undefined) {
    if (!Array.isArray(item.children)) {
      throw new Error(`Equipment command ${label}.children must be an array`);
    }
    item.children.forEach((child, index) =>
      requireExplicitEquipmentIds(child, `${label}.children[${index}]`));
  }
  return item;
}

function requireItem(equipment, itemId) {
  const item = findEquipmentItem(equipment, itemId);
  if (item === null) throw new Error("Equipment item not found");
  return item;
}

function requireItemLocation(equipment, itemId, containerId = null) {
  for (let index = 0; index < equipment.length; index += 1) {
    const item = equipment[index];
    if (item.id === itemId) return { item, containerId, index };
    const nested = requireItemLocationOrNull(item.children, itemId, item.id);
    if (nested !== null) return nested;
  }
  throw new Error("Equipment item not found");
}

function requireItemLocationOrNull(equipment, itemId, containerId) {
  for (let index = 0; index < equipment.length; index += 1) {
    const item = equipment[index];
    if (item.id === itemId) return { item, containerId, index };
    const nested = requireItemLocationOrNull(item.children, itemId, item.id);
    if (nested !== null) return nested;
  }
  return null;
}

function normalizeItemId(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Equipment command ${field} must be a non-empty string`);
  }
  return value;
}

function normalizeNullableItemId(value, field) {
  if (value === null) return null;
  return normalizeItemId(value, field);
}

function normalizeEquipmentName(value) {
  if (typeof value !== "string") {
    throw new Error("Equipment command name must be a string");
  }
  return value;
}

function normalizeTargetIndex(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Equipment command targetIndex must be a non-negative integer");
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
