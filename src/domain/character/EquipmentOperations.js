import {
  createEquipment,
  getEquipmentStates,
  validateEquipment,
} from "./Equipment.js";

export function addEquipment(equipment, item) {
  validateEquipment(equipment);
  return createEquipment([...equipment, item]);
}

export function removeEquipment(equipment, itemId) {
  validateEquipment(equipment);
  return createEquipment(removeItemRecursive(equipment, itemId));
}

export function renameEquipment(equipment, itemId, name) {
  validateEquipment(equipment);
  return createEquipment(updateItemRecursive(equipment, itemId, item => ({
    ...item,
    name: String(name),
  })));
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
