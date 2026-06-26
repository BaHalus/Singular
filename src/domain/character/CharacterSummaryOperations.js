const EDITABLE_SUMMARY_FIELDS = Object.freeze(["name", "concept"]);

export function setCharacterSummary(currentSummary, input = {}) {
  requireCurrentSummary(currentSummary);
  requirePlainObject(input, "Character summary input");
  validateExactKeys(input, EDITABLE_SUMMARY_FIELDS, "Character summary input");

  return {
    ...currentSummary,
    name: normalizeName(input.name),
    concept: normalizeConcept(input.concept),
  };
}

export function validateEditableCharacterSummary(input) {
  requirePlainObject(input, "Editable character summary");
  validateExactKeys(input, EDITABLE_SUMMARY_FIELDS, "Editable character summary");
  normalizeName(input.name);
  normalizeConcept(input.concept);
  return true;
}

function normalizeName(value) {
  if (typeof value !== "string") {
    throw new Error("Character name must be a string");
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new Error("Character name must be a non-empty string");
  }
  return normalized;
}

function normalizeConcept(value) {
  if (typeof value !== "string") {
    throw new Error("Character concept must be a string");
  }
  return value.trim();
}

function requireCurrentSummary(value) {
  requirePlainObject(value, "Current character summary");
  if (typeof value.id !== "string" || value.id.trim() === "") {
    throw new Error("Character id must be a non-empty string");
  }
  if (typeof value.name !== "string" || value.name.trim() === "") {
    throw new Error("Character name must be a non-empty string");
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
