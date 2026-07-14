import {
  createEquipmentModifierList,
  serializeEquipmentModifierList,
} from "./EquipmentModifiers.js";

const COMMAND_TYPES = new Set([
  "add",
  "edit",
  "remove",
  "reorder",
  "set-enabled",
]);

const STRUCTURAL_PATCH_FIELDS = new Set([
  "schemaVersion",
  "type",
  "kind",
  "id",
  "children",
]);

export function applyEquipmentModifierCommands(list, commands = []) {
  if (!Array.isArray(commands)) {
    throw new Error("Equipment modifier commands must be array");
  }

  let working = serializeEquipmentModifierList(createEquipmentModifierList(list));

  for (const [commandIndex, command] of commands.entries()) {
    validateCommand(command, commandIndex);
    working = applyCommand(working, command);
    working = serializeEquipmentModifierList(createEquipmentModifierList(working));
  }

  return createEquipmentModifierList(working);
}

export function addEquipmentModifierNode(
  list,
  node,
  parentId,
  index,
) {
  return applyEquipmentModifierCommands(list, [{
    type: "add",
    node,
    parentId,
    index,
  }]);
}

export function editEquipmentModifierNode(list, id, patch) {
  return applyEquipmentModifierCommands(list, [{ type: "edit", id, patch }]);
}

export function removeEquipmentModifierNode(list, id) {
  return applyEquipmentModifierCommands(list, [{ type: "remove", id }]);
}

export function reorderEquipmentModifierNode(
  list,
  id,
  parentId,
  toIndex,
) {
  return applyEquipmentModifierCommands(list, [{
    type: "reorder",
    id,
    parentId,
    toIndex,
  }]);
}

export function setEquipmentModifierNodeEnabled(list, id, enabled) {
  return applyEquipmentModifierCommands(list, [{
    type: "set-enabled",
    id,
    enabled,
  }]);
}

export function getEquipmentModifierCommandTypes() {
  return [...COMMAND_TYPES];
}

function applyCommand(list, command) {
  switch (command.type) {
    case "add":
      return applyAdd(list, command);
    case "edit":
      return applyEdit(list, command);
    case "remove":
      return applyRemove(list, command);
    case "reorder":
      return applyReorder(list, command);
    case "set-enabled":
      return applySetEnabled(list, command);
    default:
      throw new Error("Equipment modifier command type is invalid");
  }
}

function applyAdd(list, command) {
  const target = resolveTargetCollection(list, command.parentId);
  validateInsertionIndex(command.index, target.length);
  const next = cloneList(list);
  const nextTarget = resolveTargetCollection(next, command.parentId);
  nextTarget.splice(command.index, 0, command.node);
  return next;
}

function applyEdit(list, command) {
  requirePlainObject(command.patch, "Equipment modifier edit patch");
  for (const field of STRUCTURAL_PATCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(command.patch, field)) {
      throw new Error(`Equipment modifier edit cannot change ${field}`);
    }
  }

  const next = cloneList(list);
  const location = findNode(next, command.id);
  location.collection[location.index] = {
    ...location.node,
    ...command.patch,
    id: command.id,
  };
  return next;
}

function applyRemove(list, command) {
  const next = cloneList(list);
  const location = findNode(next, command.id);
  location.collection.splice(location.index, 1);
  return next;
}

function applyReorder(list, command) {
  const source = findNode(list, command.id);
  const target = resolveTargetCollection(list, command.parentId);
  const sameCollection = source.collection === target;
  const targetLengthAfterRemoval = target.length - (sameCollection ? 1 : 0);
  validateInsertionIndex(command.toIndex, targetLengthAfterRemoval);

  if (
    source.node.kind === "container" &&
    command.parentId !== null &&
    containsNodeId(source.node, command.parentId)
  ) {
    throw new Error("Equipment modifier reorder must not create cycle");
  }

  const next = cloneList(list);
  const nextSource = findNode(next, command.id);
  const [node] = nextSource.collection.splice(nextSource.index, 1);
  const nextTarget = resolveTargetCollection(next, command.parentId);
  nextTarget.splice(command.toIndex, 0, node);
  return next;
}

function applySetEnabled(list, command) {
  if (typeof command.enabled !== "boolean") {
    throw new Error("Equipment modifier enabled state must be boolean");
  }
  const next = cloneList(list);
  const location = findNode(next, command.id);
  location.collection[location.index] = {
    ...location.node,
    enabled: command.enabled,
  };
  return next;
}

function validateCommand(command, index) {
  requirePlainObject(command, `Equipment modifier commands[${index}]`);
  if (!COMMAND_TYPES.has(command.type)) {
    throw new Error("Equipment modifier command type is invalid");
  }

  if (command.type === "add") {
    requirePlainObject(command.node, "Equipment modifier add node");
    validateAddedNodeType(command.node);
    requireParentId(command.parentId);
    if (!Object.prototype.hasOwnProperty.call(command, "index")) {
      throw new Error("Equipment modifier add index is required");
    }
    return;
  }

  requireId(command.id);
  if (command.type === "reorder") {
    requireParentId(command.parentId);
    if (!Object.prototype.hasOwnProperty.call(command, "toIndex")) {
      throw new Error("Equipment modifier reorder toIndex is required");
    }
  }
}

function validateAddedNodeType(node) {
  const declaredKind = node.kind ?? (
    node.type === "eqp_modifier_container"
      ? "container"
      : node.type === "eqp_modifier"
        ? "modifier"
        : null
  );
  if (!new Set(["modifier", "container"]).has(declaredKind)) {
    throw new Error("Equipment modifier add node type is invalid");
  }
  if (declaredKind === "modifier" && Object.hasOwn(node, "children")) {
    throw new Error("Equipment modifier leaf must not declare children");
  }
  if (
    declaredKind === "container" &&
    Object.hasOwn(node, "children") &&
    !Array.isArray(node.children)
  ) {
    throw new Error("Equipment modifier container children must be array");
  }
}

function resolveTargetCollection(list, parentId) {
  requireParentId(parentId);
  if (parentId === null) return list.rows;
  const parent = findNode(list, parentId).node;
  if (parent.kind !== "container") {
    throw new Error(`Equipment modifier parent must be container: ${parentId}`);
  }
  return parent.children;
}

function findNode(list, id) {
  requireId(id);
  const location = findNodeInCollection(list.rows, id, null);
  if (location === null) {
    throw new Error(`Equipment modifier id not found: ${id}`);
  }
  return location;
}

function findNodeInCollection(collection, id, parentId) {
  for (const [index, node] of collection.entries()) {
    if (node.id === id) return { node, collection, index, parentId };
    if (node.kind === "container") {
      const nested = findNodeInCollection(node.children, id, node.id);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function containsNodeId(container, id) {
  return container.children.some(node =>
    node.id === id ||
    (node.kind === "container" && containsNodeId(node, id)),
  );
}

function cloneList(list) {
  return serializeEquipmentModifierList(createEquipmentModifierList(list));
}

function validateInsertionIndex(index, length) {
  if (!Number.isInteger(index) || index < 0 || index > length) {
    throw new Error("Equipment modifier insertion index is invalid");
  }
}

function requireParentId(parentId) {
  if (parentId !== null && (typeof parentId !== "string" || parentId.trim() === "")) {
    throw new Error("Equipment modifier parentId must be non-empty string or null");
  }
}

function requireId(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Equipment modifier command id must be non-empty string");
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(`${label} must be object`);
  }
}
