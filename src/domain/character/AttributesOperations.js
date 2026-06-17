/**
 * Attributes Operations
 * ---------------------
 * Operações puras sobre Attributes.
 *
 * Nenhuma função altera o objeto recebido.
 */

export function setAttributeBase(attributes, key, value) {
  assertAttributeKey(key);
  assertNumber(value, `Invalid base value for attribute: ${key}`);

  return {
    ...attributes,
    [key]: {
      ...attributes[key],
      base: value,
    },
  };
}

export function setAttributeOverride(attributes, key, value) {
  assertAttributeKey(key);

  if (value !== null) {
    assertNumber(value, `Invalid override value for attribute: ${key}`);
  }

  return {
    ...attributes,
    [key]: {
      ...attributes[key],
      override: value,
    },
  };
}

export function clearAttributeOverride(attributes, key) {
  assertAttributeKey(key);

  return {
    ...attributes,
    [key]: {
      ...attributes[key],
      override: null,
    },
  };
}

function assertAttributeKey(key) {
  const validKeys = ["ST", "DX", "IQ", "HT"];

  if (!validKeys.includes(key)) {
    throw new Error(`Invalid attribute key: ${key}`);
  }
}

function assertNumber(value, message) {
  if (typeof value !== "number") {
    throw new Error(message);
  }
}
