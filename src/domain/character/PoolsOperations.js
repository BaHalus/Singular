/**
 * Pools Operations
 * ----------------
 * Operações puras sobre Pools.
 *
 * Nenhuma função altera o objeto recebido.
 */

export function setPoolCurrent(pools, key, value) {
  assertPoolExists(pools, key);
  assertNullableNumber(value, `Invalid current value for pool: ${key}`);

  return {
    ...pools,
    [key]: {
      ...pools[key],
      current: value,
    },
  };
}

export function setPoolMaximum(pools, key, value) {
  assertPoolExists(pools, key);
  assertNullableNumber(value, `Invalid maximum value for pool: ${key}`);

  return {
    ...pools,
    [key]: {
      ...pools[key],
      maximum: value,
    },
  };
}

export function addPool(pools, key, pool = {}) {
  if (pools[key] !== undefined) {
    throw new Error(`Pool already exists: ${key}`);
  }

  return {
    ...pools,
    [key]: {
      current: pool.current ?? null,
      maximum: pool.maximum ?? null,
    },
  };
}

export function removePool(pools, key) {
  if (key === "HP" || key === "FP") {
    throw new Error(`Cannot remove required pool: ${key}`);
  }

  assertPoolExists(pools, key);

  const {
    [key]: removed,
    ...remaining
  } = pools;

  return remaining;
}

function assertPoolExists(pools, key) {
  if (!pools || typeof pools !== "object") {
    throw new Error("Pools must be an object");
  }

  if (!pools[key]) {
    throw new Error(`Missing pool: ${key}`);
  }
}

function assertNullableNumber(value, message) {
  if (value !== null && typeof value !== "number") {
    throw new Error(message);
  }
}
