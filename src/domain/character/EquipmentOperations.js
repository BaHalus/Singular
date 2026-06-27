import {
  createEquipment,
  createEquipmentItem,
  getEquipmentStates,
  validateEquipment,
} from "./Equipment.js";

const EQUIPMENT_PATCH_KEYS = Object.freeze([
  "externalIds",
  "name",
  "quantity",
  "techLevel",
  "legalityClass",
  "reference",
  "cost",
  "weightKg",
  "state",
  "uses",
  "maxUses",
  "categories",
  "notes",
  "tags",
  "weapons",
  "features",
  "modifiers",
  "prereqs",
  "calc",
  "importMeta",
  "raw",
]);

export function addEquipment(equipment, item) {
  validateEquipment(equipment);
  return createEquipment([...equipment, item]);
}

export function updateEquipment(equipment, itemId, patch = {}) {
  validateEquipment(equipment);
  const normalizedId = requireEquipmentId(itemId);
  requirePlainObject(patch, "Equipment patch must be an object");
  assertPatchKeys(patch);

  const current = findEquipmentItem(equipment, normalizedId);
  if (!current) {
    throw new Error("Equipment item not found");
  }

  const nextItem = createEquipmentItem({
    ...current,
    ...patch,
    id: current.id,
    kind: current.kind,
    containerKind: current.containerKind,
    children: current.children,
  });

  return createEquipment(updateItemRecursive(
    equipment,
    normalizedId,
    () => nextItem,
  ));
}

export function removeEquipment(equipment, itemId) {
  validateEquipment(equipment);
  const normalizedId = requireEquipmentId(itemId);
  if (!findEquipmentItem(equipment, normalizedId)) {
    throw new Error("Equipment item not found");
  }
  return createEquipment(removeItemRecursive(equipment, normalizedId));
}

export function reorderEquipment(equipment, itemId, targetIndex) {
  validateEquipment(equipment);
  const normalizedId = requireEquipmentId(itemId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0) {
    throw new Error("Equipment target index is invalid");
  }

  const result = reorderItemRecursive(equipment, normalizedId, targetIndex);
  if (!result.found) {
    throw new Error("Equipment item not found");
  }
  if (result.noop) return equipment;
  return createEquipment(result.items);
}

export function renameEquipment(equipment, itemId, name) {
  validateEquipment(equipment);
  return updateEquipment(equipment, itemId, { name: String(name) });
}

export function setEquipmentQuantity(equipment, itemId, quantity) {
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Equipment quantity must be non-negative finite number");
  }

  return createEquipment(updateItemRecursive(equipment, itemId, item => ({
    ...item,
    quantity: Object.is(quantity, -0) ? 0 : quantity,
  })));
}

export function setEquipmentState(equipment, itemId, state) {
  if (!getEquipmentStates().includes(state)) {
    throw new Error("Equipment state is invalid");
  }

  return createEquipment(updateItemRecursive(equipment, itemId, item => ({
    ...item,
    state,
  })));
}

export function equipEquipment(equipment, itemId) {
  return setEquipmentState(equipment, itemId, "equipped");
}

export function carryEquipment(equipment, itemId) {
  return setEquipmentState(equipment, itemId, "carried");
}

export function storeEquipment(equipment, itemId) {
  return setEquipmentState(equipment, itemId, "stored");
}

export function dropEquipment(equipment, itemId) {
  return setEquipmentState(equipment, itemId, "dropped");
}

export function ignoreEquipment(equipment, itemId) {
  return setEquipmentState(equipment, itemId, "ignored");
}

export function addChildEquipment(equipment, containerId, childItem) {
  validateEquipment(equipment);
  const container = findEquipmentItem(equipment, containerId);
  if (!container) {
    throw new Error("Equipment container not found");
  }
  if (container.kind !== "container") {
    throw new Error("Only containers can receive child equipment");
  }

  return createEquipment(updateItemRecursive(equipment, containerId, item => ({
    ...item,
    children: [...item.children, childItem],
  })));
}

export function removeChildEquipment(equipment, childItemId) {
  return removeEquipment(equipment, childItemId);
}

export function moveEquipment(equipment, itemId, targetContainerId = null) {
  validateEquipment(equipment);
  const item = findEquipmentItem(equipment, itemId);
  if (!item) {
    throw new Error("Equipment item not found");
  }

  const currentLocation = findEquipmentItemLocation(equipment, itemId);
  if (currentLocation.containerId === targetContainerId) {
    return equipment;
  }

  if (targetContainerId !== null) {
    const target = findEquipmentItem(equipment, targetContainerId);
    if (!target) {
      throw new Error("Equipment container not found");
    }
    if (target.kind !== "container") {
      throw new Error("Only containers can receive child equipment");
    }
    if (targetContainerId === itemId || findEquipmentItem(item.children, targetContainerId)) {
      throw new Error("Equipment move must not create containment cycle");
    }
  }

  const withoutItem = removeItemRecursive(equipment, itemId);
  if (targetContainerId === null) {
    return createEquipment([...withoutItem, item]);
  }
  return addChildEquipment(withoutItem, targetContainerId, item);
}

export function findEquipmentItem(equipment, itemId) {
  for (const item of equipment) {
    if (item.id === itemId) return item;
    const child = findEquipmentItem(item.children ?? [], itemId);
    if (child) return child;
  }
  return null;
}

export function findEquipmentItemIndex(equipment, itemId) {
  return findEquipmentItemLocation(equipment, itemId)?.index ?? -1;
}

function findEquipmentItemLocation(equipment, itemId, containerId = null) {
  for (let index = 0; index < equipment.length; index += 1) {
    const item = equipment[index];
    if (item.id === itemId) return { item, containerId, index };
    const child = findEquipmentItemLocation(item.children ?? [], itemId, item.id);
    if (child) return child;
  }
  return null;
}

function reorderItemRecursive(equipment, itemId, targetIndex) {
  const currentIndex = equipment.findIndex(item => item.id === itemId);
  if (currentIndex >= 0) {
    if (targetIndex >= equipment.length) {
      throw new Error("Equipment target index is invalid");
    }
    if (currentIndex === targetIndex) {
      return { found: true, noop: true, items: equipment };
    }
    const next = [...equipment];
    const [item] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, item);
    return { found: true, noop: false, items: next };
  }

  let found = false;
  let noop = false;
  const next = equipment.map(item => {
    const result = reorderItemRecursive(item.children ?? [], itemId, targetIndex);
    if (!result.found) return item;
    found = true;
    noop = result.noop;
    if (result.noop) return item;
    return {
      ...item,
      children: result.items,
    };
  });

  return { found, noop, items: next };
}

function updateItemRecursive(equipment, itemId, updater) {
  return equipment.map(item => {
    if (item.id === itemId) return updater(item);
    return {
      ...item,
      children: updateItemRecursive(item.children ?? [], itemId, updater),
    };
  });
}

function removeItemRecursive(equipment, itemId) {
  return equipment
    .filter(item => item.id !== itemId)
    .map(item => ({
      ...item,
      children: removeItemRecursive(item.children ?? [], itemId),
    }));
}

function requireEquipmentId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Equipment id must be a non-empty string");
  }
  return value;
}

function requirePlainObject(value, errorMessage) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(errorMessage);
  }
}

function assertPatchKeys(patch) {
  const allowed = new Set(EQUIPMENT_PATCH_KEYS);
  if (Object.keys(patch).some(key => !allowed.has(key))) {
    throw new Error("Equipment patch has unsupported fields");
  }
}