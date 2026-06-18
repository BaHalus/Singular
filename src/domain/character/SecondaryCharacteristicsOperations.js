/**
 * Secondary Characteristics Operations
 * ------------------------------------
 * Operações puras sobre SecondaryCharacteristics.
 *
 * Nenhuma função altera o objeto recebido.
 */

export function setSecondaryCharacteristicBase(
  secondaryCharacteristics,
  key,
  value
) {
  assertSecondaryCharacteristicKey(key);

  if (value !== null) {
    assertNumber(
      value,
      `Invalid base value for secondary characteristic: ${key}`
    );
  }

  return {
    ...secondaryCharacteristics,
    [key]: {
      ...secondaryCharacteristics[key],
      base: value,
    },
  };
}

export function setSecondaryCharacteristicOverride(
  secondaryCharacteristics,
  key,
  value
) {
  assertSecondaryCharacteristicKey(key);

  if (value !== null) {
    assertNumber(
      value,
      `Invalid override value for secondary characteristic: ${key}`
    );
  }

  return {
    ...secondaryCharacteristics,
    [key]: {
      ...secondaryCharacteristics[key],
      override: value,
    },
  };
}

export function clearSecondaryCharacteristicOverride(
  secondaryCharacteristics,
  key
) {
  assertSecondaryCharacteristicKey(key);

  return {
    ...secondaryCharacteristics,
    [key]: {
      ...secondaryCharacteristics[key],
      override: null,
    },
  };
}

function assertSecondaryCharacteristicKey(key) {
  const validKeys = [
    "HP",
    "FP",
    "Will",
    "Per",
    "BasicSpeed",
    "BasicMove",
  ];

  if (!validKeys.includes(key)) {
    throw new Error(`Invalid secondary characteristic key: ${key}`);
  }
}

function assertNumber(value, message) {
  if (typeof value !== "number") {
    throw new Error(message);
  }
}
