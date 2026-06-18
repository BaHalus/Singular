/**
 * Secondary Characteristics Aggregate
 * -----------------------------------
 * Armazena as características secundárias básicas de GURPS 4e.
 *
 * Não calcula derivados.
 * Não aplica regras de GURPS.
 * Não representa pools atuais.
 */

export function createSecondaryCharacteristics(input = {}) {
  const secondaryCharacteristics = {
    HP: createSecondaryCharacteristic(input.HP),
    FP: createSecondaryCharacteristic(input.FP),
    Will: createSecondaryCharacteristic(input.Will),
    Per: createSecondaryCharacteristic(input.Per),
    BasicSpeed: createSecondaryCharacteristic(input.BasicSpeed),
    BasicMove: createSecondaryCharacteristic(input.BasicMove),
  };

  validateSecondaryCharacteristics(secondaryCharacteristics);

  return secondaryCharacteristics;
}

export function createSecondaryCharacteristic(input) {
  if (typeof input === "number") {
    return {
      base: input,
      override: null,
    };
  }

  return {
    base: input?.base ?? null,
    override: input?.override ?? null,
  };
}

export function validateSecondaryCharacteristics(secondaryCharacteristics) {
  if (
    !secondaryCharacteristics ||
    typeof secondaryCharacteristics !== "object"
  ) {
    throw new Error("SecondaryCharacteristics must be an object");
  }

  for (const key of [
    "HP",
    "FP",
    "Will",
    "Per",
    "BasicSpeed",
    "BasicMove",
  ]) {
    validateSecondaryCharacteristic(
      key,
      secondaryCharacteristics[key]
    );
  }

  return true;
}

export function validateSecondaryCharacteristic(key, characteristic) {
  if (!characteristic || typeof characteristic !== "object") {
    throw new Error(`Missing secondary characteristic: ${key}`);
  }

  if (
    characteristic.base !== null &&
    typeof characteristic.base !== "number"
  ) {
    throw new Error(
      `Invalid base value for secondary characteristic: ${key}`
    );
  }

  if (
    characteristic.override !== null &&
    typeof characteristic.override !== "number"
  ) {
    throw new Error(
      `Invalid override value for secondary characteristic: ${key}`
    );
  }

  return true;
}

export function serializeSecondaryCharacteristics(secondaryCharacteristics) {
  validateSecondaryCharacteristics(secondaryCharacteristics);

  return {
    HP: { ...secondaryCharacteristics.HP },
    FP: { ...secondaryCharacteristics.FP },
    Will: { ...secondaryCharacteristics.Will },
    Per: { ...secondaryCharacteristics.Per },
    BasicSpeed: { ...secondaryCharacteristics.BasicSpeed },
    BasicMove: { ...secondaryCharacteristics.BasicMove },
  };
}
