export function consumeFormTransitionCosts(character, costs) {
  validateCharacterPools(character);

  if (!Array.isArray(costs)) {
    throw new Error("Form transition execution costs must be array");
  }

  const totals = new Map();

  for (const cost of costs) {
    if (!cost || typeof cost !== "object" || Array.isArray(cost)) {
      throw new Error("Form transition execution cost must be object");
    }

    if (typeof cost.resourceKey !== "string" || cost.resourceKey === "") {
      throw new Error("Form transition execution cost resourceKey is invalid");
    }

    if (
      typeof cost.amount !== "number" ||
      !Number.isFinite(cost.amount) ||
      cost.amount < 0
    ) {
      throw new Error("Form transition execution cost amount is invalid");
    }

    const current = totals.get(cost.resourceKey) ?? {
      resourceKey: cost.resourceKey,
      amount: 0,
      costIds: [],
    };

    current.amount += cost.amount;
    current.costIds.push(cost.id ?? null);
    totals.set(cost.resourceKey, current);
  }

  const pools = cloneValue(character.pools);
  const consumedResources = [];

  for (const total of totals.values()) {
    const pool = pools[total.resourceKey];

    if (!pool || typeof pool !== "object") {
      throw new Error(`Form transition resource pool not found: ${total.resourceKey}`);
    }

    if (typeof pool.current !== "number" || !Number.isFinite(pool.current)) {
      throw new Error(`Form transition resource current value is invalid: ${total.resourceKey}`);
    }

    if (pool.current < total.amount) {
      throw new Error(`Form transition resource is insufficient: ${total.resourceKey}`);
    }

    const before = pool.current;
    const after = before - total.amount;
    pool.current = after;

    consumedResources.push({
      resourceKey: total.resourceKey,
      amount: total.amount,
      before,
      after,
      costIds: [...total.costIds],
    });
  }

  return {
    pools,
    consumedResources,
  };
}

function validateCharacterPools(character) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new Error("Character must be object");
  }

  if (!character.pools || typeof character.pools !== "object" || Array.isArray(character.pools)) {
    throw new Error("Character pools must be object");
  }
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }

  return value;
}
