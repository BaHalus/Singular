import { validateCharacter } from "../../domain/character/Character.js";
import {
  serializePowers,
  validatePowers,
} from "../../domain/character/Powers.js";

const SCHEMA_VERSION = 1;
const PROJECTION_KEYS = Object.freeze([
  "schemaVersion",
  "characterId",
  "powers",
  "references",
  "diagnostics",
]);
const REFERENCE_KEYS = Object.freeze([
  "powerId",
  "talentTraitId",
  "memberTraitIds",
]);
const DIAGNOSTIC_KEYS = Object.freeze([
  "severity",
  "code",
  "powerId",
  "message",
]);

export function createPowerReadProjection(character) {
  validateCharacter(character);

  const powers = serializePowers(character.powers);
  const projection = clonePortableValue({
    schemaVersion: SCHEMA_VERSION,
    characterId: character.identity.id,
    powers,
    references: createReferences(powers),
    diagnostics: createDiagnostics(powers),
  }, "Power read projection");

  validatePowerReadProjection(projection);
  return deepFreeze(projection);
}

export function validatePowerReadProjection(projection) {
  requirePlainObject(projection, "Power read projection");
  validateExactKeys(projection, PROJECTION_KEYS, "Power read projection");

  if (projection.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Power read projection schemaVersion is invalid");
  }
  requireNonEmptyString(
    projection.characterId,
    "Power read projection characterId",
  );
  validatePowers(projection.powers);
  validatePowerReferences(projection.references, projection.powers);
  validatePowerDiagnostics(projection.diagnostics, projection.powers);
  assertPortableValue(projection, "Power read projection");
  return true;
}

export function serializePowerReadProjection(projection) {
  validatePowerReadProjection(projection);
  return clonePortableValue(projection, "Power read projection");
}

export function getPowerReadProjectionSchemaVersion() {
  return SCHEMA_VERSION;
}

function createReferences(powers) {
  return powers.map(power => ({
    powerId: power.id,
    talentTraitId: power.talentTraitId,
    memberTraitIds: [...power.memberTraitIds],
  }));
}

function createDiagnostics(powers) {
  return powers.flatMap(power => {
    const diagnostics = [];
    if (power.source.trim() === "") {
      diagnostics.push(diagnostic(
        "info",
        "power.source.empty",
        power.id,
        "Power source is not declared.",
      ));
    }
    if (power.memberTraitIds.length === 0) {
      diagnostics.push(diagnostic(
        "info",
        "power.memberTraits.empty",
        power.id,
        "Power has no member Trait ids.",
      ));
    }
    return diagnostics;
  });
}

function diagnostic(severity, code, powerId, message) {
  return { severity, code, powerId, message };
}

function validatePowerReferences(references, powers) {
  if (!Array.isArray(references)) {
    throw new Error("Power read projection references must be an array");
  }
  const powerIds = powers.map(power => power.id);
  if (references.length !== powers.length) {
    throw new Error("Power read projection references must match powers");
  }

  references.forEach((reference, index) => {
    requirePlainObject(reference, `Power read projection references[${index}]`);
    validateExactKeys(
      reference,
      REFERENCE_KEYS,
      `Power read projection references[${index}]`,
    );
    if (reference.powerId !== powerIds[index]) {
      throw new Error("Power read projection references must preserve power order");
    }
    const power = powers[index];
    if (reference.talentTraitId !== power.talentTraitId) {
      throw new Error("Power read projection talent reference mismatch");
    }
    validateStringArray(
      reference.memberTraitIds,
      `Power read projection references[${index}].memberTraitIds`,
    );
    if (!portableEqual(reference.memberTraitIds, power.memberTraitIds)) {
      throw new Error("Power read projection member references mismatch");
    }
  });
}

function validatePowerDiagnostics(diagnostics, powers) {
  if (!Array.isArray(diagnostics)) {
    throw new Error("Power read projection diagnostics must be an array");
  }
  const powerIds = new Set(powers.map(power => power.id));
  diagnostics.forEach((diagnosticItem, index) => {
    requirePlainObject(diagnosticItem, `Power read projection diagnostics[${index}]`);
    validateExactKeys(
      diagnosticItem,
      DIAGNOSTIC_KEYS,
      `Power read projection diagnostics[${index}]`,
    );
    if (!["info", "warning", "error"].includes(diagnosticItem.severity)) {
      throw new Error("Power read projection diagnostic severity is invalid");
    }
    requireNonEmptyString(diagnosticItem.code, "Power read projection diagnostic code");
    requireNonEmptyString(diagnosticItem.powerId, "Power read projection diagnostic powerId");
    requireNonEmptyString(diagnosticItem.message, "Power read projection diagnostic message");
    if (!powerIds.has(diagnosticItem.powerId)) {
      throw new Error("Power read projection diagnostic references missing power");
    }
  });
}

function validateStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  value.forEach((item, index) => {
    requireNonEmptyString(item, `${label}[${index}]`);
  });
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

function portableEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== typeof right) return false;
  if (typeof left !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => portableEqual(item, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && portableEqual(left[key], right[key]));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Reflect.ownKeys(value).forEach(key => deepFreeze(value[key], seen));
  return Object.freeze(value);
}
