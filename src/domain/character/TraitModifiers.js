const PERCENTAGE_KINDS = new Set(["enhancement", "limitation"]);
const MODIFIER_AFFECTS = new Set(["total", "base", "levels"]);

export function createTraitModifiers(input = []) {
  if (input === undefined || input === null) return deepFreeze([]);
  if (!Array.isArray(input)) {
    throw new Error("Trait modifiers must be array");
  }

  const modifiers = input.map(createTraitModifier);
  validateTraitModifiers(modifiers);
  return deepFreeze(modifiers);
}

export function createTraitModifier(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Trait modifier must be object");
  }

  if (!isCanonicalPercentageModifierInput(input)) {
    return deepFreeze(clonePortableValue(input));
  }

  const modifier = {
    id: requireNonEmptyString(input.id, "Trait modifier id"),
    name: requireNonEmptyString(input.name, "Trait modifier name"),
    kind: normalizeKind(input.kind),
    valueType: normalizeValueType(input.valueType),
    value: normalizePercentage(input.value),
    source: normalizeSource(input.source),
    notes: normalizeNotes(input.notes),
  };
  if (hasOwn(input, "enabled") || hasOwn(input, "disabled")) {
    modifier.enabled = normalizeEnabled(input);
  }
  if (hasOwn(input, "affects")) {
    modifier.affects = normalizeAffects(input.affects);
  }

  validateTraitModifier(modifier);
  return deepFreeze(modifier);
}

export function validateTraitModifiers(modifiers) {
  if (!Array.isArray(modifiers)) {
    throw new Error("Trait modifiers must be array");
  }

  const ids = new Set();
  for (const modifier of modifiers) {
    validateTraitModifier(modifier);
    if (typeof modifier.id !== "string" || modifier.id.trim() === "") continue;
    if (ids.has(modifier.id)) {
      throw new Error(`Duplicate Trait modifier id: ${modifier.id}`);
    }
    ids.add(modifier.id);
  }

  return true;
}

export function validateTraitModifier(modifier) {
  if (!isPlainObject(modifier)) {
    throw new Error("Trait modifier must be object");
  }

  if (!isCanonicalPercentageModifierInput(modifier)) {
    clonePortableValue(modifier);
    return true;
  }

  requireNonEmptyString(modifier.id, "Trait modifier id");
  requireNonEmptyString(modifier.name, "Trait modifier name");
  normalizeKind(modifier.kind);
  normalizeValueType(modifier.valueType);
  normalizePercentage(modifier.value);
  normalizeSource(modifier.source);
  normalizeNotes(modifier.notes);
  if (hasOwn(modifier, "enabled") && typeof modifier.enabled !== "boolean") {
    throw new Error("Trait modifier enabled must be boolean");
  }
  if (hasOwn(modifier, "affects")) {
    normalizeAffects(modifier.affects);
  }
  return true;
}

export function serializeTraitModifiers(modifiers) {
  validateTraitModifiers(modifiers);
  return modifiers.map(serializeTraitModifier);
}

export function serializeTraitModifier(modifier) {
  validateTraitModifier(modifier);
  return clonePortableValue(modifier);
}

export function isCanonicalPercentageModifier(modifier) {
  return isPlainObject(modifier) &&
    PERCENTAGE_KINDS.has(modifier.kind) &&
    modifier.valueType === "percentage";
}

function isCanonicalPercentageModifierInput(input) {
  return hasOwn(input, "kind") || hasOwn(input, "valueType");
}

function normalizeKind(value) {
  if (!PERCENTAGE_KINDS.has(value)) {
    throw new Error("Trait modifier kind must be enhancement or limitation");
  }
  return value;
}

function normalizeValueType(value) {
  if (value !== "percentage") {
    throw new Error("Trait modifier valueType must be percentage");
  }
  return value;
}

function normalizePercentage(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Trait modifier percentage must be a positive finite number");
  }
  return value;
}

function normalizeSource(value) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    throw new Error("Trait modifier source must be object or null");
  }
  return clonePortableValue(value);
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new Error("Trait modifier notes must be string");
  }
  return value;
}

function normalizeEnabled(input) {
  if (hasOwn(input, "enabled") && typeof input.enabled !== "boolean") {
    throw new Error("Trait modifier enabled must be boolean");
  }
  if (hasOwn(input, "disabled") && typeof input.disabled !== "boolean") {
    throw new Error("Trait modifier disabled must be boolean");
  }
  return input.enabled !== false && input.disabled !== true;
}

function normalizeAffects(value) {
  if (!MODIFIER_AFFECTS.has(value)) {
    throw new Error("Trait modifier affects must be total, base or levels");
  }
  return value;
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function clonePortableValue(value, seen = new WeakMap()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Trait modifier values must be JSON portable");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error("Trait modifier values must be JSON portable");
  }
  if (seen.has(value)) {
    throw new Error("Trait modifier values must not contain cycles");
  }

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(clonePortableValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  if (!isPlainObject(value)) {
    throw new Error("Trait modifier values must be JSON portable");
  }

  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = clonePortableValue(item, seen);
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

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}