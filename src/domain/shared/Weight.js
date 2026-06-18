const GURPS_POUNDS_PER_KILOGRAM = 2;

export function poundsToKilograms(pounds) {
  assertNumber(pounds, "Pounds must be number");

  return pounds / GURPS_POUNDS_PER_KILOGRAM;
}

export function kilogramsToPounds(kilograms) {
  assertNumber(kilograms, "Kilograms must be number");

  return kilograms * GURPS_POUNDS_PER_KILOGRAM;
}

export function parseGcsWeight(value) {
  if (typeof value === "number") {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (typeof value !== "string") {
    throw new Error("Weight must be number or string");
  }

  const normalized = value.trim().toLowerCase();

  const poundsMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds)$/);

  if (poundsMatch) {
    return poundsToKilograms(Number(poundsMatch[1]));
  }

  const kilogramsMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms)$/);

  if (kilogramsMatch) {
    return Number(kilogramsMatch[1]);
  }

  const numberMatch = normalized.match(/^(-?\d+(?:\.\d+)?)$/);

  if (numberMatch) {
    return Number(numberMatch[1]);
  }

  throw new Error("Unsupported weight format");
}

export function normalizeWeightKg(value) {
  const weightKg = parseGcsWeight(value);

  if (weightKg < 0) {
    throw new Error("Weight must be non-negative");
  }

  return weightKg;
}

function assertNumber(value, message) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }
}
