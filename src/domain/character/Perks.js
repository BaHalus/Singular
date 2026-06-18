export function createPerks(input = []) {
  const perks = input.map(createPerk);

  validatePerks(perks);

  return perks;
}

export function createPerk(input = {}) {
  return {
    id: input.id ?? generatePerkId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    notes: input.notes ?? "",
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
  };
}

export function validatePerks(perks) {
  if (!Array.isArray(perks)) {
    throw new Error("Perks must be an array");
  }

  for (const perk of perks) {
    validatePerk(perk);
  }

  return true;
}

export function validatePerk(perk) {
  if (!perk || typeof perk !== "object") {
    throw new Error("Perk must be an object");
  }

  if (!perk.id) {
    throw new Error("Perk must have id");
  }

  if (!isPlainObject(perk.externalIds)) {
    throw new Error("Perk externalIds must be object");
  }

  if (typeof perk.name !== "string") {
    throw new Error("Perk name must be string");
  }

  if (typeof perk.notes !== "string") {
    throw new Error("Perk notes must be string");
  }

  if (!Array.isArray(perk.tags)) {
    throw new Error("Perk tags must be array");
  }

  return true;
}

export function serializePerks(perks) {
  validatePerks(perks);

  return perks.map(perk => ({
    id: perk.id,
    externalIds: { ...perk.externalIds },
    name: perk.name,
    notes: perk.notes,
    tags: [...perk.tags],
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Perk externalIds must be object");
  }

  return { ...externalIds };
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function generatePerkId() {
  return `perk_${Math.random().toString(36).slice(2, 10)}`;
}
