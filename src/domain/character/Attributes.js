/**
 * Attributes Aggregate
 * --------------------
 * Armazena os quatro atributos básicos de GURPS 4e.
 *
 * Não calcula custos.
 * Não calcula derivados.
 * Não aplica regras de GURPS.
 */

export function createAttributes(input = {}) {
  const attributes = {
    ST: createAttribute(input.ST, 10),
    DX: createAttribute(input.DX, 10),
    IQ: createAttribute(input.IQ, 10),
    HT: createAttribute(input.HT, 10),
  };

  validateAttributes(attributes);

  return attributes;
}

export function createAttribute(input, defaultBase) {
  if (typeof input === "number") {
    return {
      base: input,
      override: null,
    };
  }

  return {
    base: input?.base ?? defaultBase,
    override: input?.override ?? null,
  };
}

export function validateAttributes(attributes) {
  if (!attributes || typeof attributes !== "object") {
    throw new Error("Attributes must be an object");
  }

  for (const key of ["ST", "DX", "IQ", "HT"]) {
    validateAttribute(key, attributes[key]);
  }

  return true;
}

export function validateAttribute(key, attribute) {
  if (!attribute || typeof attribute !== "object") {
    throw new Error(`Missing attribute: ${key}`);
  }

  if (typeof attribute.base !== "number") {
    throw new Error(`Invalid base value for attribute: ${key}`);
  }

  if (
    attribute.override !== null &&
    typeof attribute.override !== "number"
  ) {
    throw new Error(`Invalid override value for attribute: ${key}`);
  }

  return true;
}

export function serializeAttributes(attributes) {
  validateAttributes(attributes);

  return {
    ST: { ...attributes.ST },
    DX: { ...attributes.DX },
    IQ: { ...attributes.IQ },
    HT: { ...attributes.HT },
  };
}
