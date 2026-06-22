import { validateClock } from "../../application/ports/RuntimePorts.js";

export function createFixedClock(value) {
  const timestamp = normalizeTimestamp(value);
  const clock = {
    now() {
      return timestamp;
    },
  };
  validateClock(clock);
  return Object.freeze(clock);
}

function normalizeTimestamp(value) {
  const normalized = value instanceof Date ? value.toISOString() : value;
  if (
    typeof normalized !== "string" ||
    normalized === "" ||
    Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error("Fixed clock value must be a valid timestamp or Date");
  }
  return normalized;
}
