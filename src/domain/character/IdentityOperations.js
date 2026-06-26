const EDITABLE_IDENTITY_FIELDS = Object.freeze(["name", "concept"]);

export function setIdentitySummary(identity, input = {}) {
  requireIdentity(identity);
  requirePlainObject(input, "Identity summary input");
  validateExactKeys(input, EDITABLE_IDENTITY_FIELDS, "Identity summary input");

  const name = normalizeName(input.name);
  const concept = normalizeConcept(input.concept);

  return {
    ...identity,
    name,
    concept,
  };
}

export function validateEditableIdentitySummary(input) {
  requirePlainObject(input, "Editable identity summary");
  validateExactKeys(input, EDITABLE_IDENTITY_FIELDS, "Editable identity summary");
  normalizeName(input.name);
  normalizeConcept(input.concept);
  return true;
}

function normalizeName(value) {
  if (typeof value !== "string") {
    throw new Error("Identity name must be a string");
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new Error("Identity name must be a non-empty string");
  }
  return normalized;
}

function normalizeConcept(value) {
  if (typeof value !== "string") {
    throw new Error("Identity concept must be a string");
  }
  return value.trim();
}

function requireIdentity(value) {
  requirePlainObject(value, "Identity");
  if (typeof value.id !== "string" || value.id.trim() === "") {
    throw new Error("Identity id must be a non-empty string");
  }
  if (typeof value.name !== "string" || value.name.trim() === "") {
    throw new Error("Identity name must be a non-empty string");
  }
}

function validateExactKeys(value, expected, label) {
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expected.length ||
    keys.some(key => typeof key !== "string" || !expected.includes(key))
  ) {
    throw new Error(`${label} contains unsupported properties`);
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
