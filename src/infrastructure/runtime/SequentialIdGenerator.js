import { validateIdGenerator } from "../../application/ports/RuntimePorts.js";

export function createSequentialIdGenerator(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new Error("Sequential ID generator options must be a plain object");
  }

  let counter = normalizeCounter(options.initialValue ?? 0);
  const separator = normalizeSeparator(options.separator ?? ":");
  const width = normalizeWidth(options.width ?? 0);

  const generator = {
    next(prefix) {
      if (typeof prefix !== "string" || prefix.trim() === "") {
        throw new Error("Sequential ID prefix must be a non-empty string");
      }
      if (counter === Number.MAX_SAFE_INTEGER) {
        throw new Error("Sequential ID generator exhausted");
      }
      counter += 1;
      const suffix = width === 0
        ? String(counter)
        : String(counter).padStart(width, "0");
      return `${prefix}${separator}${suffix}`;
    },
  };

  validateIdGenerator(generator);
  return Object.freeze(generator);
}

function normalizeCounter(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      "Sequential ID initialValue must be a non-negative safe integer",
    );
  }
  return value;
}

function normalizeSeparator(value) {
  if (typeof value !== "string") {
    throw new Error("Sequential ID separator must be a string");
  }
  return value;
}

function normalizeWidth(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Sequential ID width must be a non-negative safe integer");
  }
  return value;
}
