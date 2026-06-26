const REQUIRED_POOL_KEYS = new Set(["HP", "FP"]);

export function setPoolCurrent(pools, key, current) {
  validateOperationalPools(pools);
  assertPoolExists(pools, key);

  return updatePoolField(
    pools,
    key,
    "current",
    normalizeFiniteOrNull(
      current,
      `Invalid current value for pool: ${key}`,
    ),
  );
}

export function adjustPoolCurrent(pools, key, delta) {
  validateOperationalPools(pools);
  assertPoolExists(pools, key);

  const normalizedDelta = normalizeFiniteNumber(
    delta,
    `Invalid current adjustment for pool: ${key}`,
  );
  const current = pools[key].current;

  if (current === null) {
    throw new Error(`Cannot adjust pool with unknown current value: ${key}`);
  }

  const adjusted = current + normalizedDelta;
  if (!Number.isFinite(adjusted)) {
    throw new Error(`Adjusted current value is not finite for pool: ${key}`);
  }

  return updatePoolField(pools, key, "current", normalizeNegativeZero(adjusted));
}

export function setPoolMaximum(pools, key, maximum) {
  validateOperationalPools(pools);
  assertPoolExists(pools, key);

  return updatePoolField(
    pools,
    key,
    "maximum",
    normalizeFiniteOrNull(
      maximum,
      `Invalid maximum value for pool: ${key}`,
    ),
  );
}

export function resetPoolCurrentToMaximum(pools, key) {
  validateOperationalPools(pools);
  assertPoolExists(pools, key);

  const maximum = pools[key].maximum;
  if (maximum === null) {
    throw new Error(`Cannot reset pool with unknown maximum value: ${key}`);
  }

  return updatePoolField(pools, key, "current", maximum);
}

export function addPool(pools, key, pool = {}) {
  validateOperationalPools(pools);
  assertPoolKey(key);

  if (Object.prototype.hasOwnProperty.call(pools, key)) {
    throw new Error(`Pool already exists: ${key}`);
  }
  if (!pool || typeof pool !== "object" || Array.isArray(pool)) {
    throw new Error(`Invalid pool definition: ${key}`);
  }

  return {
    ...pools,
    [key]: {
      current: normalizeFiniteOrNull(
        pool.current ?? null,
        `Invalid current value for pool: ${key}`,
      ),
      maximum: normalizeFiniteOrNull(
        pool.maximum ?? null,
        `Invalid maximum value for pool: ${key}`,
      ),
    },
  };
}

export function removePool(pools, key) {
  validateOperationalPools(pools);
  assertPoolKey(key);

  if (REQUIRED_POOL_KEYS.has(key)) {
    throw new Error(`Cannot remove required pool: ${key}`);
  }

  assertPoolExists(pools, key);

  const {
    [key]: removed,
    ...remaining
  } = pools;

  return remaining;
}

export function validateOperationalPools(pools) {
  assertPoolsObject(pools);

  for (const key of REQUIRED_POOL_KEYS) {
    assertPoolExists(pools, key);
  }

  for (const [key, pool] of Object.entries(pools)) {
    assertPoolKey(key);
    assertPoolShape(pool, key);
    normalizeFiniteOrNull(
      pool.current,
      `Invalid current value for pool: ${key}`,
    );
    normalizeFiniteOrNull(
      pool.maximum,
      `Invalid maximum value for pool: ${key}`,
    );
  }

  return true;
}

function updatePoolField(pools, key, field, value) {
  return {
    ...pools,
    [key]: {
      ...pools[key],
      [field]: value,
    },
  };
}

function assertPoolsObject(pools) {
  if (!pools || typeof pools !== "object" || Array.isArray(pools)) {
    throw new Error("Pools must be an object");
  }
}

function assertPoolKey(key) {
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("Pool key must be a non-empty string");
  }
}

function assertPoolExists(pools, key) {
  assertPoolsObject(pools);
  assertPoolKey(key);

  if (!Object.prototype.hasOwnProperty.call(pools, key)) {
    throw new Error(`Missing pool: ${key}`);
  }

  assertPoolShape(pools[key], key);
}

function assertPoolShape(pool, key) {
  if (!pool || typeof pool !== "object" || Array.isArray(pool)) {
    throw new Error(`Invalid pool structure: ${key}`);
  }
  if (!Object.prototype.hasOwnProperty.call(pool, "current")) {
    throw new Error(`Missing current value for pool: ${key}`);
  }
  if (!Object.prototype.hasOwnProperty.call(pool, "maximum")) {
    throw new Error(`Missing maximum value for pool: ${key}`);
  }
}

function normalizeFiniteOrNull(value, message) {
  if (value === null) return null;
  return normalizeFiniteNumber(value, message);
}

function normalizeFiniteNumber(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(message);
  }
  return normalizeNegativeZero(value);
}

function normalizeNegativeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}
