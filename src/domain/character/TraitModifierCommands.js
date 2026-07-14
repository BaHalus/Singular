import {
  createTraitModifiers,
  serializeTraitModifiers,
} from "./TraitModifiers.js";

const COMMAND_TYPES = new Set([
  "add",
  "edit",
  "remove",
  "reorder",
  "set-enabled",
]);

export function applyTraitModifierCommands(modifiers, commands = []) {
  let working = serializeTraitModifiers(createTraitModifiers(modifiers));

  if (!Array.isArray(commands)) {
    throw new Error("Trait modifier commands must be array");
  }

  for (const [commandIndex, command] of commands.entries()) {
    validateCommand(command, commandIndex);
    working = applyCommand(working, command);
    working = serializeTraitModifiers(createTraitModifiers(working));
  }

  return createTraitModifiers(working);
}

export function addTraitModifier(modifiers, modifier, index = undefined) {
  return applyTraitModifierCommands(modifiers, [{
    type: "add",
    modifier,
    ...(index === undefined ? {} : { index }),
  }]);
}

export function editTraitModifier(modifiers, id, patch) {
  return applyTraitModifierCommands(modifiers, [{
    type: "edit",
    id,
    patch,
  }]);
}

export function removeTraitModifier(modifiers, id) {
  return applyTraitModifierCommands(modifiers, [{
    type: "remove",
    id,
  }]);
}

export function reorderTraitModifier(modifiers, id, toIndex) {
  return applyTraitModifierCommands(modifiers, [{
    type: "reorder",
    id,
    toIndex,
  }]);
}

export function setTraitModifierEnabled(modifiers, id, enabled) {
  return applyTraitModifierCommands(modifiers, [{
    type: "set-enabled",
    id,
    enabled,
  }]);
}

export function getTraitModifierCommandTypes() {
  return [...COMMAND_TYPES];
}

function applyCommand(modifiers, command) {
  switch (command.type) {
    case "add":
      return applyAdd(modifiers, command);
    case "edit":
      return applyEdit(modifiers, command);
    case "remove":
      return applyRemove(modifiers, command);
    case "reorder":
      return applyReorder(modifiers, command);
    case "set-enabled":
      return applySetEnabled(modifiers, command);
    default:
      throw new Error("Trait modifier command type is invalid");
  }
}

function applyAdd(modifiers, command) {
  const index = command.index ?? modifiers.length;
  validateInsertionIndex(index, modifiers.length);
  const next = [...modifiers];
  next.splice(index, 0, command.modifier);
  return next;
}

function applyEdit(modifiers, command) {
  const index = findModifierIndex(modifiers, command.id);
  requirePlainObject(command.patch, "Trait modifier edit patch");
  if (
    Object.prototype.hasOwnProperty.call(command.patch, "id") &&
    command.patch.id !== command.id
  ) {
    throw new Error("Trait modifier edit must preserve id");
  }
  const next = [...modifiers];
  next[index] = {
    ...next[index],
    ...command.patch,
    id: command.id,
  };
  return next;
}

function applyRemove(modifiers, command) {
  const index = findModifierIndex(modifiers, command.id);
  return modifiers.filter((_, itemIndex) => itemIndex !== index);
}

function applyReorder(modifiers, command) {
  const fromIndex = findModifierIndex(modifiers, command.id);
  validateDestinationIndex(command.toIndex, modifiers.length);
  const next = [...modifiers];
  const [modifier] = next.splice(fromIndex, 1);
  next.splice(command.toIndex, 0, modifier);
  return next;
}

function applySetEnabled(modifiers, command) {
  if (typeof command.enabled !== "boolean") {
    throw new Error("Trait modifier enabled state must be boolean");
  }
  const index = findModifierIndex(modifiers, command.id);
  const { disabled: _disabled, ...modifier } = modifiers[index];
  const next = [...modifiers];
  next[index] = {
    ...modifier,
    enabled: command.enabled,
  };
  return next;
}

function validateCommand(command, index) {
  requirePlainObject(command, `Trait modifier commands[${index}]`);
  if (!COMMAND_TYPES.has(command.type)) {
    throw new Error("Trait modifier command type is invalid");
  }
  if (command.type === "add") {
    requirePlainObject(command.modifier, "Trait modifier add input");
    return;
  }
  requireId(command.id);
}

function findModifierIndex(modifiers, id) {
  requireId(id);
  const index = modifiers.findIndex(modifier => modifier.id === id);
  if (index < 0) {
    throw new Error(`Trait modifier id not found: ${id}`);
  }
  return index;
}

function validateInsertionIndex(index, length) {
  if (!Number.isInteger(index) || index < 0 || index > length) {
    throw new Error("Trait modifier insertion index is invalid");
  }
}

function validateDestinationIndex(index, length) {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new Error("Trait modifier destination index is invalid");
  }
}

function requireId(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Trait modifier command id must be non-empty string");
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
