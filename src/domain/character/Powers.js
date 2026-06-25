export function createPowers(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Powers must be an array");
  }

  const powers = input.map(createPower);
  validatePowers(powers);
  return deepFreeze(powers);
}

export function createPower(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Power must be an object");
  }

  const power = {
    id: normalizeRequiredString(input.id ?? generatePowerId(), "Power id"),
    externalIds: normalizePlainObject(input.externalIds, "Power externalIds", {}),
    name: normalizeString(input.name ?? "", "Power name"),
    source: normalizeString(input.source ?? "", "Power source"),
    powerModifier: normalizePowerModifier(input.powerModifier),
    talentTraitId: normalizeNullableId(input.talentTraitId, "Power talentTraitId"),
    memberTraitIds: normalizeMemberTraitIds(input.memberTraitIds),
    notes: normalizeString(input.notes ?? "", "Power notes"),
    tags: normalizeStringArray(input.tags, "Power tags"),
    importMeta: normalizeNullablePlainObject(
      input.importMeta,
      "Power importMeta",
    ),
    raw: cloneValue(input.raw ?? null),
  };

  validatePower(power);
  return deepFreeze(power);
}

export function validatePowers(powers) {
  if (!Array.isArray(powers)) {
    throw new Error("Powers must be an array");
  }

  const ids = new Set();
  for (const power of powers) {
    validatePower(power);
    if (ids.has(power.id)) {
      throw new Error(`Duplicate Power id: ${power.id}`);
    }
    ids.add(power.id);
  }

  return true;
}

export function validatePower(power) {
  if (!isPlainObject(power)) {
    throw new Error("Power must be an object");
  }

  normalizeRequiredString(power.id, "Power id");
  validatePlainObject(power.externalIds, "Power externalIds");
  normalizeString(power.name, "Power name");
  normalizeString(power.source, "Power source");
  validatePowerModifier(power.powerModifier);
  normalizeNullableId(power.talentTraitId, "Power talentTraitId");
  validateMemberTraitIds(power.memberTraitIds);
  normalizeString(power.notes, "Power notes");
  validateStringArray(power.tags, "Power tags");
  validateNullablePlainObject(power.importMeta, "Power importMeta");
  cloneValue(power.raw);

  return true;
}

export function serializePowers(powers) {
  validatePowers(powers);
  return powers.map(serializePower);
}

export function serializePower(power) {
  validatePower(power);
  return cloneValue(power);
}

function normalizePowerModifier(value) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    throw new Error("Power powerModifier must be object or null");
  }

  const modifier = {
    name: normalizeString(value.name ?? "", "Power modifier name"),
    valuePercent: normalizeNullableFiniteNumber(
      value.valuePercent,
      "Power modifier valuePercent",
    ),
    notes: normalizeString(value.notes ?? "", "Power modifier notes"),
  };

  validatePowerModifier(modifier);
  return modifier;
}

function validatePowerModifier(value) {
  if (value === null) return true;
  if (!isPlainObject(value)) {
    throw new Error("Power powerModifier must be object or null");
  }

  normalizeString(value.name, "Power modifier name");
  normalizeNullableFiniteNumber(
    value.valuePercent,
    "Power modifier valuePercent",
  );
  normalizeString(value.notes, "Power modifier notes");
  return true;
}

function normalizeMemberTraitIds(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Power memberTraitIds must be an array");
  }

  const ids = value.map((id, index) =>
    normalizeRequiredString(id, `Power memberTraitIds[${index}]`),
  );
  assertUnique(ids, "Power memberTraitIds must not contain duplicates");
  return ids;
}

function validateMemberTraitIds(value) {
  if (!Array.isArray(value)) {
    throw new Error("Power memberTraitIds must be an array");
  }

  value.forEach((id, index) => {
    normalizeRequiredString(id, `Power memberTraitIds[${index}]`);
  });
  assertUnique(value, "Power memberTraitIds must not contain duplicates");
}

function normalizeStringArray(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map((item, index) =>
    normalizeString(item, `${label}[${index}]`),
  );
}

function validateStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  value.forEach((item, index) => {
    normalizeString(item, `${label}[${index}]`);
  });
}

function normalizeNullableId(value, label) {
  if (value === undefined || value === null) return null;
  return normalizeRequiredString(value, label);
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeString(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function normalizeNullableFiniteNumber(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number or null`);
  }
  return value;
}

function normalizePlainObject(value, label, fallback) {
  if (value === undefined || value === null) return cloneValue(fallback);
  validatePlainObject(value, label);
  return cloneValue(value);
}

function normalizeNullablePlainObject(value, label) {
  if (value === undefined || value === null) return null;
  validatePlainObject(value, label);
  return cloneValue(value);
}

function validateNullablePlainObject(value, label) {
  if (value === null) return true;
  validatePlainObject(value, label);
  return true;
}

function validatePlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  cloneValue(value);
}

function assertUnique(values, message) {
  if (new Set(values).size !== values.length) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) {
    throw new Error("Power values must not contain cycles");
  }

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(cloneValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  if (!isPlainObject(value)) {
    throw new Error("Power values must contain only plain objects and arrays");
  }

  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = cloneValue(item, seen);
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

function generatePowerId() {
  return `power_${Math.random().toString(36).slice(2, 10)}`;
}
