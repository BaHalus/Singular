export function calculateBasicLiftKg({ ST, liftingSTBonus = 0 }) {
  assertNumber(ST, "ST must be number");
  assertNumber(liftingSTBonus, "liftingSTBonus must be number");

  const effectiveLiftingST = ST + liftingSTBonus;

  if (effectiveLiftingST < 0) {
    throw new Error("effectiveLiftingST must be non-negative");
  }

  const rawBasicLiftKg = effectiveLiftingST ** 2 / 10;
  const basicLiftKg = rawBasicLiftKg >= 5
    ? Math.round(rawBasicLiftKg)
    : rawBasicLiftKg;

  return {
    effectiveLiftingST,
    rawBasicLiftKg,
    basicLiftKg,
  };
}

export function calculateEquipmentLoad({ ST, liftingSTBonus = 0, equipment = [] }) {
  const lift = calculateBasicLiftKg({ ST, liftingSTBonus });
  const weights = calculateEquipmentWeights(equipment);
  const encumbrance = calculateEncumbrance(weights.loadWeightKg, lift.basicLiftKg);

  return {
    ...lift,
    ...weights,
    ...encumbrance,
  };
}

export function calculateEquipmentWeights(equipment = []) {
  if (!Array.isArray(equipment)) {
    throw new Error("Equipment must be an array");
  }

  const totals = {
    equippedWeightKg: 0,
    carriedWeightKg: 0,
    storedWeightKg: 0,
    droppedWeightKg: 0,
    ignoredWeightKg: 0,
    loadWeightKg: 0,
  };

  for (const item of equipment) {
    const itemTotals = calculateItemWeight(item, null);

    totals.equippedWeightKg += itemTotals.equippedWeightKg;
    totals.carriedWeightKg += itemTotals.carriedWeightKg;
    totals.storedWeightKg += itemTotals.storedWeightKg;
    totals.droppedWeightKg += itemTotals.droppedWeightKg;
    totals.ignoredWeightKg += itemTotals.ignoredWeightKg;
    totals.loadWeightKg += itemTotals.loadWeightKg;
  }

  return totals;
}

export function calculateEncumbrance(loadWeightKg, basicLiftKg) {
  assertNumber(loadWeightKg, "loadWeightKg must be number");
  assertNumber(basicLiftKg, "basicLiftKg must be number");

  if (basicLiftKg <= 0) {
    throw new Error("basicLiftKg must be positive");
  }

  const thresholds = {
    noneMaxKg: basicLiftKg,
    lightMaxKg: basicLiftKg * 2,
    mediumMaxKg: basicLiftKg * 3,
    heavyMaxKg: basicLiftKg * 6,
    extraHeavyMaxKg: basicLiftKg * 10,
  };

  let encumbranceLevel;
  let encumbranceName;

  if (loadWeightKg <= thresholds.noneMaxKg) {
    encumbranceLevel = 0;
    encumbranceName = "none";
  } else if (loadWeightKg <= thresholds.lightMaxKg) {
    encumbranceLevel = 1;
    encumbranceName = "light";
  } else if (loadWeightKg <= thresholds.mediumMaxKg) {
    encumbranceLevel = 2;
    encumbranceName = "medium";
  } else if (loadWeightKg <= thresholds.heavyMaxKg) {
    encumbranceLevel = 3;
    encumbranceName = "heavy";
  } else if (loadWeightKg <= thresholds.extraHeavyMaxKg) {
    encumbranceLevel = 4;
    encumbranceName = "extra-heavy";
  } else {
    encumbranceLevel = 5;
    encumbranceName = "overloaded";
  }

  return {
    ...thresholds,
    encumbranceLevel,
    encumbranceName,
  };
}

function calculateItemWeight(item, inheritedLoadState) {
  if (!item || typeof item !== "object") {
    throw new Error("Equipment item must be object");
  }

  const state = inheritedLoadState ?? item.state ?? "carried";
  const ownWeightKg = getItemTotalOwnWeightKg(item);
  const children = Array.isArray(item.children) ? item.children : [];

  const totals = {
    equippedWeightKg: 0,
    carriedWeightKg: 0,
    storedWeightKg: 0,
    droppedWeightKg: 0,
    ignoredWeightKg: 0,
    loadWeightKg: 0,
  };

  addWeightByState(totals, state, ownWeightKg);

  const childInheritedState = shouldPropagateLoadState(item, state)
    ? state
    : null;

  for (const child of children) {
    const childTotals = calculateItemWeight(child, childInheritedState);

    totals.equippedWeightKg += childTotals.equippedWeightKg;
    totals.carriedWeightKg += childTotals.carriedWeightKg;
    totals.storedWeightKg += childTotals.storedWeightKg;
    totals.droppedWeightKg += childTotals.droppedWeightKg;
    totals.ignoredWeightKg += childTotals.ignoredWeightKg;
    totals.loadWeightKg += childTotals.loadWeightKg;
  }

  return totals;
}

function shouldPropagateLoadState(item, state) {
  if (item.kind !== "container") {
    return false;
  }

  if (item.containerKind === "group") {
    return false;
  }

  return state === "equipped" || state === "carried";
}

function getItemTotalOwnWeightKg(item) {
  const quantity = item.quantity ?? 1;

  assertNumber(quantity, "Equipment quantity must be number");

  if (quantity < 0) {
    throw new Error("Equipment quantity must be non-negative");
  }

  const weightKg = item.weightKg ?? 0;

  assertNumber(weightKg, "Equipment weightKg must be number");

  if (weightKg < 0) {
    throw new Error("Equipment weightKg must be non-negative");
  }

  return weightKg * quantity;
}

function addWeightByState(totals, state, weightKg) {
  switch (state) {
    case "equipped":
      totals.equippedWeightKg += weightKg;
      totals.loadWeightKg += weightKg;
      break;
    case "carried":
      totals.carriedWeightKg += weightKg;
      totals.loadWeightKg += weightKg;
      break;
    case "stored":
      totals.storedWeightKg += weightKg;
      break;
    case "dropped":
      totals.droppedWeightKg += weightKg;
      break;
    case "ignored":
      totals.ignoredWeightKg += weightKg;
      break;
    default:
      throw new Error("Equipment state is invalid");
  }
}

function assertNumber(value, message) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }
}
