export function createCommandEnvelope(input = {}) {
  requirePlainObject(input, "Command envelope");

  const envelope = {
    id: normalizeRequiredString(input.id, "Command id"),
    type: normalizeRequiredString(input.type, "Command type"),
    expectedRevision: normalizeRevision(input.expectedRevision),
    issuedAt: normalizeTimestamp(input.issuedAt),
    payload: cloneApplicationValue(input.payload ?? {}),
  };

  validateCommandEnvelope(envelope);
  return deepFreeze(envelope);
}

export function validateCommandEnvelope(envelope) {
  requirePlainObject(envelope, "Command envelope");
  normalizeRequiredString(envelope.id, "Command id");
  normalizeRequiredString(envelope.type, "Command type");
  normalizeRevision(envelope.expectedRevision);
  normalizeTimestamp(envelope.issuedAt);
  requirePlainObject(envelope.payload, "Command payload");
  cloneApplicationValue(envelope.payload);
  return true;
}

export function serializeCommandEnvelope(envelope) {
  validateCommandEnvelope(envelope);
  return cloneApplicationValue(envelope);
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      "Command expectedRevision must be a non-negative safe integer",
    );
  }
  return value;
}

function normalizeTimestamp(value) {
  const normalized = value instanceof Date ? value.toISOString() : value;
  if (
    typeof normalized !== "string" ||
    normalized === "" ||
    Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error("Command issuedAt must be a valid timestamp");
  }
  return normalized;
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be a plain object`);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneApplicationValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) {
    throw new Error("Command values must not contain cycles");
  }

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(cloneApplicationValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  requirePlainObject(value, "Command value");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = cloneApplicationValue(item, seen);
  });
  seen.delete(value);
  return clone;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
