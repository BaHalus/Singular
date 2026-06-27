import { validateCharacter } from "../../domain/character/Character.js";
import {
  serializeSpells,
  validateSpells,
} from "../../domain/character/Spells.js";

const SCHEMA_VERSION = 1;
const PROJECTION_KEYS = Object.freeze([
  "schemaVersion",
  "characterId",
  "spells",
]);

export function createSpellReadProjection(character) {
  validateCharacter(character);

  const projection = clonePortableValue({
    schemaVersion: SCHEMA_VERSION,
    characterId: character.identity.id,
    spells: serializeSpells(character.spells),
  }, "Spell read projection");

  validateSpellReadProjection(projection);
  return deepFreeze(projection);
}

export function validateSpellReadProjection(projection) {
  requirePlainObject(projection, "Spell read projection");
  validateExactKeys(projection, PROJECTION_KEYS, "Spell read projection");

  if (projection.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Spell read projection schemaVersion is invalid");
  }
  requireNonEmptyString(
    projection.characterId,
    "Spell read projection characterId",
  );
  validateSpells(projection.spells);
  assertPortableValue(projection, "Spell read projection");
  return true;
}

export function serializeSpellReadProjection(projection) {
  validateSpellReadProjection(projection);
  return clonePortableValue(projection, "Spell read projection");
}

export function getSpellReadProjectionSchemaVersion() {
  return SCHEMA_VERSION;
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
