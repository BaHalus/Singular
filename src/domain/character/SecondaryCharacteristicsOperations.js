/**
 * Secondary Characteristics Operations
 * ------------------------------------
 * Operações puras sobre SecondaryCharacteristics.
 *
 * Nenhuma função altera o objeto recebido.
 * Nenhuma função calcula derivados de GURPS.
 */

const VALID_SECONDARY_KEYS = Object.freeze([
  "HP",
  "FP",
  "Will",
  "Per",
  "BasicSpeed",
  "BasicMove",
]);

export function setSecondaryCharacteristicBase(
  secondaryCharacteristics,
  key,
  value,
) {
  assertSecondaryCharacteristicsObject(secondaryCharacteristics);
  assertSecondaryCharacteristicKey(key);
  assertSecondaryCharacteristicShape(secondaryCharacteristics[key], key);

  return setSecondaryCharacteristicField(
    secondaryCharacteristics,
    key,
    "base",
    normalizeFiniteOrNull(
      value,
      `Invalid base value for secondary characteristic: ${key}`,
    ),
  );
}

export function setSecondaryCharacteristicOverride(
  secondaryCharacteristics,
  key,
  value,
) {
  assertSecondaryCharacteristicsObject(secondaryCharacteristics);
  assertSecondaryCharacteristicKey(key);
  assertSecondaryCharacteristicShape(secondaryCharacteristics[key], key);

  return setSecondaryCharacteristicField(
    secondaryCharacteristics,
    key,
    "override",
    normalizeFiniteOrNull(
      value,
      `Invalid override value for secondary characteristic: ${key}`,
    ),
  );
}

export function clearSecondaryCharacteristicOverride(
  secondaryCharacteristics,
  key,
) {
  assertSecondaryCharacteristicsObject(secondaryCharacteristics);
  assertSecondaryCharacteristicKey(key);
  assertSecondaryCharacteristicShape(secondaryCharacteristics[key], key);

  return setSecondaryCharacteristicField(secondaryCharacteristics, key, "override", null);
}

export function findSecondaryCharacteristic(secondaryCharacteristics, key) {
  assertSecondaryCharacteristicsObject(secondaryCharacteristics);
  assertSecondaryCharacteristicKey(key);
  assertSecondaryCharacteristicShape(secondaryCharacteristics[key], key);

  return secondaryCharacteristics[key];
}

function setSecondaryCharacteristicField(secondaryCharacteristics, key, field, value) {
  return {
    ...secondaryCharacteristics,
    [key]: {
      ...secondaryCharacteristics[key],
      [field]: value,
    },
  };
}

function assertSecondaryCharacteristicsObject(secondaryCharacteristics) {
  if (!secondaryCharacteristics || typeof secondaryCharacteristics !== "object" || Array.isArray(secondaryCharacteristics)) {
    throw new Error("SecondaryCharacteristics must be an object");
  }
}

function assertSecondaryCharacteristicKey(key) {
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("Secondary characteristic key must be a non-empty string");
  }
  if (!VALID_SECONDARY_KEYS.includes(key)) {
    throw new Error(`Invalid secondary characteristic key: ${key}`);
  }
}

function assertSecondaryCharacteristicShape(characteristic, key) {
  if (!characteristic || typeof characteristic !== "object" || Array.isArray(characteristic)) {
    throw new Error(`Missing secondary characteristic: ${key}`);
  }
  if (!Object.prototype.hasOwnProperty.call(characteristic, "base")) {
    throw new Error(`Missing base value for secondary characteristic: ${key}`);
  }
  if (!Object.prototype.hasOwnProperty.call(characteristic, "override")) {
    throw new Error(`Missing override value for secondary characteristic: ${key}`);
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
  return Object.is(value, -0) ? 0 : value;
}
