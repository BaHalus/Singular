const CHOICE_EVALUATION_STATUSES = ["ready", "incomplete"];

export function createTraitChoices(input = null) {
  const entries = normalizeChoiceEntries(input);
  const choices = entries.map(([fallbackKey, value]) => (
    createTraitChoice(value, fallbackKey)
  ));

  validateTraitChoices(choices);
  return deepFreeze(choices);
}

export function validateTraitChoices(choices) {
  if (!Array.isArray(choices)) {
    throw new Error("Trait choices must be array");
  }

  const keys = new Set();
  for (const choice of choices) {
    validateTraitChoice(choice);
    if (keys.has(choice.key)) {
      throw new Error(`Duplicate Trait choice key: ${choice.key}`);
    }
    keys.add(choice.key);
  }

  return true;
}

export function evaluateTraitChoices(choices) {
  validateTraitChoices(choices);
  const missingKeys = choices
    .filter(choice => choice.required && choice.value === null)
    .map(choice => choice.key);
  const complete = missingKeys.length === 0;
  const result = {
    status: complete ? "ready" : "incomplete",
    complete,
    missingKeys,
    choices: serializeTraitChoices(choices),
  };

  validateTraitChoicesEvaluation(result);
  return deepFreeze(result);
}

export function validateTraitChoicesEvaluation(result) {
  if (!isPlainObject(result)) {
    throw new Error("Trait choices evaluation must be object");
  }
  if (!CHOICE_EVALUATION_STATUSES.includes(result.status)) {
    throw new Error("Trait choices evaluation status is invalid");
  }
  if (typeof result.complete !== "boolean") {
    throw new Error("Trait choices evaluation complete must be boolean");
  }
  if (!Array.isArray(result.missingKeys)) {
    throw new Error("Trait choices evaluation missingKeys must be array");
  }
  if (result.missingKeys.some(key => typeof key !== "string" || key === "")) {
    throw new Error("Trait choices evaluation missingKeys must contain strings");
  }

  validateTraitChoices(result.choices);
  const expectedMissingKeys = result.choices
    .filter(choice => choice.required && choice.value === null)
    .map(choice => choice.key);
  const expectedComplete = expectedMissingKeys.length === 0;

  if (
    result.complete !== expectedComplete ||
    result.status !== (expectedComplete ? "ready" : "incomplete") ||
    !sameStrings(result.missingKeys, expectedMissingKeys)
  ) {
    throw new Error("Trait choices evaluation is stale or inconsistent");
  }

  return true;
}

export function serializeTraitChoices(choices) {
  validateTraitChoices(choices);
  return choices.map(choice => cloneValue(choice));
}

export function getTraitChoiceEvaluationStatuses() {
  return [...CHOICE_EVALUATION_STATUSES];
}

function createTraitChoice(input, fallbackKey) {
  const source = isPlainObject(input)
    ? cloneValue(input)
    : { value: input };
  const key = normalizeKey(source.key ?? fallbackKey);
  const value = normalizeChoiceValue(source.value);
  const required = normalizeRequired(source.required);

  return {
    ...source,
    key,
    value,
    required,
    ...(hasOwn(source, "label")
      ? { label: normalizeOptionalString(source.label, "Trait choice label") }
      : {}),
  };
}

function validateTraitChoice(choice) {
  if (!isPlainObject(choice)) {
    throw new Error("Trait choice must be object");
  }
  normalizeKey(choice.key);
  normalizeChoiceValue(choice.value);
  if (typeof choice.required !== "boolean") {
    throw new Error("Trait choice required must be boolean");
  }
  if (hasOwn(choice, "label") && typeof choice.label !== "string") {
    throw new Error("Trait choice label must be string");
  }
}

function normalizeChoiceEntries(input) {
  if (input === undefined || input === null) return [];

  if (Array.isArray(input)) {
    return input.map(value => [undefined, value]);
  }

  if (isPlainObject(input)) {
    return Object.entries(input);
  }

  throw new Error("Trait choices must be array, object or null");
}

function normalizeKey(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Trait choice key must be non-empty string");
  }
  return value;
}

function normalizeChoiceValue(value) {
  if (value === undefined || value === null || value === "") return null;
  if (["string", "number", "boolean", "bigint"].includes(typeof value)) {
    return String(value);
  }
  throw new Error("Trait choice value must be scalar or null");
}

function normalizeRequired(value) {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") {
    throw new Error("Trait choice required must be boolean");
  }
  return value;
}

function normalizeOptionalString(value, label) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label} must be string`);
  return value;
}

function sameStrings(actual, expected) {
  return actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function cloneValue(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    for (const item of value) result.push(cloneValue(item, seen));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneValue(item, seen);
    }
    return result;
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
