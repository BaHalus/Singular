export const HIT_LOCATIONS = [
  "torso",
  "skull",
  "face",
  "eyes",
  "neck",
  "rightArm",
  "leftArm",
  "rightHand",
  "leftHand",
  "rightLeg",
  "leftLeg",
  "rightFoot",
  "leftFoot",
  "groin",
];

export function createEmptyProtectionMap() {
  return Object.fromEntries(
    HIT_LOCATIONS.map(location => [location, 0])
  );
}

export function calculateProtection({ equipment = [] } = {}) {
  if (!Array.isArray(equipment)) {
    throw new Error("Equipment must be an array");
  }

  const protection = createEmptyProtectionMap();

  for (const item of flattenEquipment(equipment)) {
    if (item.state !== "equipped") {
      continue;
    }

    applyEquipmentProtection(protection, item);
  }

  return protection;
}

export function extractDrBonuses(item) {
  if (!item || typeof item !== "object") {
    throw new Error("Equipment item must be object");
  }

  const features = item.features ?? [];

  if (!Array.isArray(features)) {
    throw new Error("Equipment features must be array");
  }

  return features
    .filter(feature => feature?.type === "dr_bonus")
    .map(normalizeDrBonus);
}

function applyEquipmentProtection(protection, item) {
  const bonuses = extractDrBonuses(item);

  for (const bonus of bonuses) {
    for (const location of bonus.locations) {
      protection[location] += bonus.amount;
    }
  }
}

function normalizeDrBonus(feature) {
  const amount = feature.amount ?? feature.bonus ?? feature.value;

  if (typeof amount !== "number" || amount < 0) {
    throw new Error("DR bonus amount must be non-negative number");
  }

  const locations = normalizeLocations(feature.locations ?? feature.location ?? ["torso"]);

  return {
    amount,
    locations,
  };
}

function normalizeLocations(value) {
  const locations = Array.isArray(value) ? value : [value];

  return locations.map(normalizeLocation);
}

function normalizeLocation(location) {
  if (typeof location !== "string") {
    throw new Error("DR location must be string");
  }

  const normalized = location.trim();

  if (!HIT_LOCATIONS.includes(normalized)) {
    throw new Error("DR location is invalid");
  }

  return normalized;
}

function flattenEquipment(equipment) {
  const result = [];

  for (const item of equipment) {
    result.push(item);

    if (Array.isArray(item.children)) {
      result.push(...flattenEquipment(item.children));
    }
  }

  return result;
}
