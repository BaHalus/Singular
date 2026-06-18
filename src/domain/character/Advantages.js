export function createAdvantages(input = []) {
  const advantages = input.map(createAdvantage);

  validateAdvantages(advantages);

  return advantages;
}

export function createAdvantage(input = {}) {
  return {
    id: input.id ?? generateAdvantageId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    notes: input.notes ?? "",
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
  };
}

export function validateAdvantages(advantages) {
  if (!Array.isArray(advantages)) {
    throw new Error("Advantages must be an array");
  }

  for (const advantage of advantages) {
    validateAdvantage(advantage);
  }

  return true;
}

export function validateAdvantage(advantage) {
  if (!advantage || typeof advantage !== "object") {
    throw new Error("Advantage must be an object");
  }

  if (!advantage.id) {
    throw new Error("Advantage must have id");
  }

  if (!isPlainObject(advantage.externalIds)) {
    throw new Error("Advantage externalIds must be object");
  }

  if (typeof advantage.name !== "string") {
    throw new Error("Advantage name must be string");
  }

  if (typeof advantage.notes !== "string") {
    throw new Error("Advantage notes must be string");
  }

  if (!Array.isArray(advantage.tags)) {
    throw new Error("Advantage tags must be array");
  }

  return true;
}

export function serializeAdvantages(advantages) {
  validateAdvantages(advantages);

  return advantages.map(advantage => ({
    id: advantage.id,
    externalIds: { ...advantage.externalIds },
    name: advantage.name,
    notes: advantage.notes,
    tags: [...advantage.tags],
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Advantage externalIds must be object");
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

function generateAdvantageId() {
  return `adv_${Math.random().toString(36).slice(2, 10)}`;
}
