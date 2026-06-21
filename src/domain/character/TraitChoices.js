const CHOICE_STATUSES = ["ready", "incomplete"];

export function createTraitChoices(input = null) {
  const entries = normalizeChoiceEntries(input).map(createTraitChoice);
  validateTraitChoices(entries);
  return deepFreeze(entries);
}

export function createTraitChoice(input) {
  if (!isPlainObject(input)) {
    throw new Error("Trait choice must be object");
  }

  const source = cloneValue(input);
  const choice = {
    ...source,
    key: normalizeChoiceKey(source.key),
    value: normalizeChoiceValue(source.value),
    required: normalizeRequired(source.required),
  };

  validateTraitChoice(choice);
  return deepFreeze(choice);
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

export function validateTraitChoice(choice) {
  if (!isPlainObject(choice)) {
    throw new Error("Trait choice must be object");
  }
  normalizeChoiceKey(choice.key);
  normalizeChoiceValue(choice.value);
  if (typeof choice.required !== "boolean") {
    throw new Error("Trait choice required must be boolean");
  }
  return true;
}

export function evaluateTraitChoices(choices) {
  validateTraitChoices(choices);
  const missingKeys = choices
    .filter(choice => choice.required && isChoiceValueEmpty(choice.value))
    .map(choice => choice.key);
  const status = missingKeys.length === 0 ? "ready" : "incomplete";
  const result = {
    status,
    complete: status === "ready",
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
  if (!CHOICE_STATUSES.includes(result.status)) {
    throw new Error("Trait choices evaluation status is invalid");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Trait choices evaluation complete flag is inconsistent");
  }
  if (!Array.isArray(result.missingKeys)) {
    throw new Error("Trait choices evaluation missingKeys must be array");
  }
  const unique = new Set(result.missingKeys);
  if (
    unique.size !== result.missingKeys.length ||
    result.missingKeys.some(key => typeof key !== "string" || key === "")
  ) {
    throw new Error("Trait choices evaluation missingKeys must be unique strings");
  }
  validateTraitChoices(result.choices);
  const expected = result.choices
    .filter(choice => choice.required && isChoiceValueEmpty(choice.value))
    .map(choice => choice.key);
  if (JSON.stringify(expected) !== JSON.stringify(result.missingKeys)) {
    throw new Error("Trait choices evaluation is stale or inconsistent");
  }
  return true;
}

export function serializeTraitChoices(choices) {
  validateTraitChoices(choices);
  return choices.map(choice => cloneValue(choice));
}

export function getTraitChoiceStatuses() {
  return [...CHOICE_STATUSES];
}

function normalizeChoiceEntries(input) {
  if (input === undefined || input === null) return [];

  if (Array.isArray(input)) {
    return input.map(item => {
      if (!isPlainObject(item)) {
        throw new Error("Trait choice array items must be objects");
      }
      return cloneValue(item);
    });
  }

  if (isPlainObject(input)) {
    return Object.entries(input).map(([key, value]) => {
      if (isPlainObject(value) && hasChoiceRecordShape(value)) {
        return {
          ...cloneValue(value),
          key: value.key ?? key,
        };
      }
      return {
        key,
        value: cloneValue(value),
        required: false,
      };
    });
  }

  throw new Error("Trait choices must be array, object or null");
}

function hasChoiceRecordShape(value) {
  return (
    Object.prototype.hasOwnProperty.call(value, "key") ||
    Object.prototype.hasOwnProperty.call(value, "value") ||
    Object.prototype.hasOwnProperty.call(value, "required")
  );
}

function normalizeChoiceKey(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Trait choice key must be non-empty string");
  }
  return value.trim();
}

function normalizeChoiceValue(value) {
  if (value === undefined || value === null) return null;
  if (["string", "number", "boolean"].includes(typeof value)) {
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

function isChoiceValueEmpty(value) {
  return value === null || value === "";
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
