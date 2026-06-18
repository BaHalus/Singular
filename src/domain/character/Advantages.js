/**
 * Advantages Aggregate
 * --------------------
 * Armazena as vantagens do personagem.
 *
 * Não calcula custos.
 * Não interpreta regras.
 * Não valida pré-requisitos.
 */

export function createAdvantages(input = []) {
  const advantages = input.map(createAdvantage);

  validateAdvantages(advantages);

  return advantages;
}

export function createAdvantage(input = {}) {
  return {
    id: input.id ?? cryptoRandomId(),
    name: input.name ?? "",
    notes: input.notes ?? "",
    tags: Array.isArray(input.tags)
      ? [...input.tags]
      : [],
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
    name: advantage.name,
    notes: advantage.notes,
    tags: [...advantage.tags],
  }));
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `adv_${Math.random().toString(36).slice(2, 10)}`;
}
