export function validateClock(clock) {
  requirePlainObject(clock, "Clock");
  if (typeof clock.now !== "function") {
    throw new Error("Clock now must be a function");
  }
  return true;
}

export function readClock(clock) {
  validateClock(clock);
  const value = clock.now();
  const normalized = value instanceof Date ? value.toISOString() : value;
  if (
    typeof normalized !== "string" ||
    normalized === "" ||
    Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error("Clock now must return a valid timestamp or Date");
  }
  return normalized;
}

export function validateIdGenerator(generator) {
  requirePlainObject(generator, "Id generator");
  if (typeof generator.next !== "function") {
    throw new Error("Id generator next must be a function");
  }
  return true;
}

export function generateId(generator, prefix) {
  validateIdGenerator(generator);
  const normalizedPrefix = normalizeNonEmptyString(prefix, "ID prefix");
  const value = generator.next(normalizedPrefix);
  return normalizeNonEmptyString(value, "Generated ID");
}

export function validateApplicationRuntime(runtime) {
  requirePlainObject(runtime, "Application runtime");
  validateClock(runtime.clock);
  validateIdGenerator(runtime.idGenerator);
  return true;
}

function normalizeNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
