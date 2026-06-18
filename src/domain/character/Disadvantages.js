export function createDisadvantages(input = []) {
  const disadvantages = input.map(createDisadvantage);

  validateDisadvantages(disadvantages);

  return disadvantages;
}

export function createDisadvantage(input = {}) {
  return {
    id: input.id ?? generateDisadvantageId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    notes: input.notes ?? "",
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
  };
}

export function validateDisadvantages(disadvantages) {
  if (!Array.isArray(disadvantages)) {
    throw new Error("Disadvantages must be an array");
  }

  for (const disadvantage of disadvantages) {
    validateDisadvantage(disadvantage);
  }

  return true;
}

export function validateDisadvantage(disadvantage) {
  if (!disadvantage || typeof disadvantage !== "object") {
    throw new Error("Disadvantage must be an object");
  }

  if (!disadvantage.id) {
    throw new Error("Disadvantage must have id");
  }

  if (!isPlainObject(disadvantage.externalIds)) {
    throw new Error("Disadvantage externalIds must be object");
  }

  if (typeof disadvantage.name !== "string") {
    throw new Error("Disadvantage name must be string");
  }

  if (typeof disadvantage.notes !== "string") {
    throw new Error("Disadvantage notes must be string");
  }

  if (!Array.isArray(disadvantage.tags)) {
    throw new Error("Disadvantage tags must be array");
  }

  return true;
}

export function serializeDisadvantages(disadvantages) {
  validateDisadvantages(disadvantages);

  return disadvantages.map(disadvantage => ({
    id: disadvantage.id,
    externalIds: { ...disadvantage.externalIds },
    name: disadvantage.name,
    notes: disadvantage.notes,
    tags: [...disadvantage.tags],
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Disadvantage externalIds must be object");
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

function generateDisadvantageId() {
  return `disadv_${Math.random().toString(36).slice(2, 10)}`;
}
