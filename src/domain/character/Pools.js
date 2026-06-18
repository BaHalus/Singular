/**
 * Pools Aggregate
 * ---------------
 * Armazena recursos consumíveis do personagem.
 *
 * Não calcula máximos.
 * Não aplica dano.
 * Não aplica cura.
 * Não valida morte, inconsciência ou exaustão.
 */

export function createPools(input = {}) {
  const pools = {
    HP: createPool(input.HP),
    FP: createPool(input.FP),
  };

  if (input.EnergyReserve !== undefined) {
    pools.EnergyReserve = createPool(input.EnergyReserve);
  }

  validatePools(pools);

  return pools;
}

export function createPool(input = {}) {
  if (typeof input === "number") {
    return {
      current: input,
      maximum: input,
    };
  }

  return {
    current: input?.current ?? null,
    maximum: input?.maximum ?? null,
  };
}

export function validatePools(pools) {
  if (!pools || typeof pools !== "object") {
    throw new Error("Pools must be an object");
  }

  validatePool("HP", pools.HP);
  validatePool("FP", pools.FP);

  if (pools.EnergyReserve !== undefined) {
    validatePool("EnergyReserve", pools.EnergyReserve);
  }

  return true;
}

export function validatePool(key, pool) {
  if (!pool || typeof pool !== "object") {
    throw new Error(`Missing pool: ${key}`);
  }

  if (
    pool.current !== null &&
    typeof pool.current !== "number"
  ) {
    throw new Error(`Invalid current value for pool: ${key}`);
  }

  if (
    pool.maximum !== null &&
    typeof pool.maximum !== "number"
  ) {
    throw new Error(`Invalid maximum value for pool: ${key}`);
  }

  return true;
}

export function serializePools(pools) {
  validatePools(pools);

  const serialized = {
    HP: { ...pools.HP },
    FP: { ...pools.FP },
  };

  if (pools.EnergyReserve !== undefined) {
    serialized.EnergyReserve = {
      ...pools.EnergyReserve,
    };
  }

  return serialized;
}
