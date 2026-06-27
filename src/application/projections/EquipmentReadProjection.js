import { validateCharacter } from "../../domain/character/Character.js";
import {
  serializeEquipment,
  validateEquipment,
} from "../../domain/character/Equipment.js";
import {
  calculateEquipmentTotals,
} from "../../domain/character/EquipmentTotals.js";

const SCHEMA_VERSION = 1;
const PROJECTION_KEYS = Object.freeze([
  "schemaVersion",
  "characterId",
  "equipment",
  "totals",
]);
const TOTAL_KEYS = Object.freeze([
  "quantity",
  "weightKg",
  "cost",
]);

export function createEquipmentReadProjection(character) {
  validateCharacter(character);

  const projection = clonePortableValue({
    schemaVersion: SCHEMA_VERSION,
    characterId: character.identity.id,
    equipment: serializeEquipment(character.equipment),
    totals: calculateEquipmentTotals(character.equipment),
  }, "Equipment read projection");

  validateEquipmentReadProjection(projection);
  return deepFreeze(projection);
}

export function validateEquipmentReadProjection(projection) {
  requirePlainObject(projection, "Equipment read projection");
  validateExactKeys(projection, PROJECTION_KEYS, "Equipment read projection");

  if (projection.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Equipment read projection schemaVersion is invalid");
  }
  requireNonEmptyString(
    projection.characterId,
    "Equipment read projection characterId",
  );
  validateEquipment(projection.equipment);
  validateEquipmentTotals(projection.totals);
  assertPortableValue(projection, "Equipment read projection");
  return true;
}

export function serializeEquipmentReadProjection(projection) {
  validateEquipmentReadProjection(projection);
  return clonePortableValue(projection, "Equipment read projection");
}

export function getEquipmentReadProjectionSchemaVersion() {
  return SCHEMA_VERSION;
}

function validateEquipmentTotals(totals) {
  requirePlainObject(totals, "Equipment read projection totals");
  validateExactKeys(totals, TOTAL_KEYS, "Equipment read projection totals");
  for (const field of TOTAL_KEYS) {
    if (!Number.isFinite(totals[field])) {
      throw new Error(`Equipment read projection total ${field} must be finite number`);
    }
    if (Object.is(totals[field], -0)) {
      throw new Error(`Equipment read projection total ${field} must not be negative zero`);
    }
  }
}

function validateExactKeys(value, expectedKeys, label) {
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error(`${label} contains unsupported properties`);
  }
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPortableValue(value, label, ancestors = new WeakSet()) {
  if (value === null) return true;

  const type = typeof value;
  if (type === "string" || type === "boolean") return true;
  if (type === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be JSON portable`);
    }
    return true;
  }
  if (type !== "object") {
    throw new Error(`${label} must be JSON portable`);
  }
  if (ancestors.has(value)) {
    throw new Error(`${label} must not contain cycles`);
  }
  ancestors.add(value);

  if (Array.isArray(value)) {
    validateDenseArray(value, label);
    value.forEach((item, index) =>
      assertPortableValue(item, `${label}[${index}]`, ancestors));
  } else {
    requirePlainObject(value, label);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new Error(`${label} must be JSON portable`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable) {
        throw new Error(`${label} must be JSON portable`);
      }
      assertPortableValue(value[key], `${label}.${key}`, ancestors);
    }
  }

  ancestors.delete(value);
  return true;
}

function validateDenseArray(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      throw new Error(`${label} must not contain sparse entries`);
    }
  }
  const expectedKeys = new Set([
    "length",
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !expectedKeys.has(key)) {
      throw new Error(`${label} must not contain non-index properties`);
    }
  }
}

function clonePortableValue(value, label, ancestors = new WeakMap()) {
  assertPortableValue(value, label);
  return clone(value, label, ancestors);
}

function clone(value, label, ancestors) {
  if (value === null || typeof value !== "object") return value;
  if (ancestors.has(value)) {
    throw new Error(`${label} must not contain cycles`);
  }

  const copy = Array.isArray(value) ? [] : {};
  ancestors.set(value, copy);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      copy.push(clone(item, `${label}[${index}]`, ancestors));
    });
  } else {
    Object.entries(value).forEach(([key, item]) => {
      copy[key] = clone(item, `${label}.${key}`, ancestors);
    });
  }
  ancestors.delete(value);
  return copy;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Reflect.ownKeys(value).forEach(key => deepFreeze(value[key], seen));
  return Object.freeze(value);
}
