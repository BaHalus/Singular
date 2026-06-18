export function addEquipment(equipment, item) {
  return [
    ...equipment,
    item,
  ];
}

export function removeEquipment(equipment, itemId) {
  return removeItemRecursive(equipment, itemId);
}

export function renameEquipment(equipment, itemId, name) {
  return updateItemRecursive(equipment, itemId, item => ({
    ...item,
    name: String(name),
  }));
}

export function setEquipmentQuantity(equipment, itemId, quantity) {
  if (typeof quantity !== "number" || quantity < 0) {
    throw new Error("Equipment quantity must be non-negative number");
  }

  return updateItemRecursive(equipment, itemId, item => ({
    ...item,
    quantity,
  }));
}

export function setEquipmentState(equipment, itemId, state) {
  return updateItemRecursive(equipment, itemId, item => ({
    ...item,
    state,
  }));
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
  return updateItemRecursive(equipment, containerId, item => {
    if (item.kind !== "container") {
      throw new Error("Only containers can receive child equipment");
    }

    return {
      ...item,
      children: [
        ...item.children,
        childItem,
      ],
    };
  });
}

export function removeChildEquipment(equipment, childItemId) {
  return removeEquipment(equipment, childItemId);
}

export function moveEquipment(equipment, itemId, targetContainerId = null) {
  const item = findEquipmentItem(equipment, itemId);

  if (!item) {
    throw new Error("Equipment item not found");
  }

  const withoutItem = removeEquipment(equipment, itemId);

  if (targetContainerId === null) {
    return [
      ...withoutItem,
      item,
    ];
  }

  return addChildEquipment(withoutItem, targetContainerId, item);
}

export function findEquipmentItem(equipment, itemId) {
  for (const item of equipment) {
    if (item.id === itemId) {
      return item;
    }

    const child = findEquipmentItem(item.children ?? [], itemId);

    if (child) {
      return child;
    }
  }

  return null;
}

function updateItemRecursive(equipment, itemId, updater) {
  return equipment.map(item => {
    if (item.id === itemId) {
      return updater(item);
    }

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
