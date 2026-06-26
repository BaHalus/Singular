const SKILL_MECHANICS_RESULT_SCHEMA_VERSION = 1;

const ENTITY_TYPES = ["skill", "technique"];
const RESULT_STATUSES = ["resolved", "blocked"];
const BASIS_KINDS = ["trained", "default", "technique"];
const DIAGNOSTIC_SEVERITIES = ["info", "warning", "blocked"];

export function createSkillMechanicsResult(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Skill mechanics result must be an object");
  }

  const result = {
    schemaVersion: normalizePositiveInteger(
      input.schemaVersion ?? SKILL_MECHANICS_RESULT_SCHEMA_VERSION,
      "Skill mechanics result schemaVersion",
    ),
    entityId: normalizeRequiredString(
      input.entityId,
      "Skill mechanics result entityId",
    ),
    entityType: normalizeEntityType(input.entityType),
    status: normalizeStatus(input.status),
    level: normalizeNullableFiniteNumber(
      input.level,
      "Skill mechanics result level",
    ),
    relativeLevel: normalizeNullableFiniteNumber(
      input.relativeLevel,
      "Skill mechanics result relativeLevel",
    ),
    basis: normalizeBasis(input.basis),
    appliedModifierIds: normalizeUniqueStringArray(
      input.appliedModifierIds,
      "Skill mechanics result appliedModifierIds",
    ),
    diagnostics: normalizeDiagnostics(input.diagnostics),
  };

  validateSkillMechanicsResult(result);
  return deepFreeze(result);
}

export function validateSkillMechanicsResult(result) {
  if (!isPlainObject(result)) {
    throw new Error("Skill mechanics result must be an object");
  }

  normalizePositiveInteger(
    result.schemaVersion,
    "Skill mechanics result schemaVersion",
  );
  normalizeRequiredString(result.entityId, "Skill mechanics result entityId");
  normalizeEntityType(result.entityType);
  const status = normalizeStatus(result.status);
  normalizeNullableFiniteNumber(result.level, "Skill mechanics result level");
  normalizeNullableFiniteNumber(
    result.relativeLevel,
    "Skill mechanics result relativeLevel",
  );
  validateBasis(result.basis);
  validateUniqueStringArray(
    result.appliedModifierIds,
    "Skill mechanics result appliedModifierIds",
  );
  validateDiagnostics(result.diagnostics);
  validateStatusConsistency(result, status);

  clonePortableValue(result, "Skill mechanics result");
  return true;
}

export function serializeSkillMechanicsResult(result) {
  validateSkillMechanicsResult(result);
  return clonePortableValue(result, "Skill mechanics result");
}

export function getSkillMechanicsResultSchemaVersion() {
  return SKILL_MECHANICS_RESULT_SCHEMA_VERSION;
}

function normalizeEntityType(value) {
  if (!ENTITY_TYPES.includes(value)) {
    throw new Error("Skill mechanics result entityType is invalid");
  }
  return value;
}

function normalizeStatus(value) {
  if (!RESULT_STATUSES.includes(value)) {
    throw new Error("Skill mechanics result status is invalid");
  }
  return value;
}

function normalizeBasis(value) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    throw new Error("Skill mechanics result basis must be an object or null");
  }

  const basis = {
    kind: normalizeBasisKind(value.kind),
    sourceId: normalizeNullableString(
      value.sourceId,
      "Skill mechanics result basis sourceId",
    ),
    attribute: normalizeNullableString(
      value.attribute,
      "Skill mechanics result basis attribute",
    ),
  };

  validateBasis(basis);
  return basis;
}

function validateBasis(value) {
  if (value === null) return;
  if (!isPlainObject(value)) {
    throw new Error("Skill mechanics result basis must be an object or null");
  }

  normalizeBasisKind(value.kind);
  normalizeNullableString(
    value.sourceId,
    "Skill mechanics result basis sourceId",
  );
  normalizeNullableString(
    value.attribute,
    "Skill mechanics result basis attribute",
  );
}

function normalizeBasisKind(value) {
  if (!BASIS_KINDS.includes(value)) {
    throw new Error("Skill mechanics result basis kind is invalid");
  }
  return value;
}

function normalizeDiagnostics(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Skill mechanics result diagnostics must be an array");
  }

  return value.map((diagnostic, index) =>
    normalizeDiagnostic(diagnostic, index),
  );
}

function normalizeDiagnostic(diagnostic, index) {
  if (!isPlainObject(diagnostic)) {
    throw new Error(
      `Skill mechanics result diagnostic[${index}] must be an object`,
    );
  }

  const normalized = clonePortableValue(
    diagnostic,
    `Skill mechanics result diagnostic[${index}]`,
  );

  normalizeRequiredString(
    normalized.code,
    `Skill mechanics result diagnostic[${index}] code`,
  );
  if (!DIAGNOSTIC_SEVERITIES.includes(normalized.severity)) {
    throw new Error(
      `Skill mechanics result diagnostic[${index}] severity is invalid`,
    );
  }

  return normalized;
}

function validateDiagnostics(diagnostics) {
  if (!Array.isArray(diagnostics)) {
    throw new Error("Skill mechanics result diagnostics must be an array");
  }

  diagnostics.forEach((diagnostic, index) => {
    if (!isPlainObject(diagnostic)) {
      throw new Error(
        `Skill mechanics result diagnostic[${index}] must be an object`,
      );
    }

    normalizeRequiredString(
      diagnostic.code,
      `Skill mechanics result diagnostic[${index}] code`,
    );
    if (!DIAGNOSTIC_SEVERITIES.includes(diagnostic.severity)) {
      throw new Error(
        `Skill mechanics result diagnostic[${index}] severity is invalid`,
      );
    }
    clonePortableValue(
      diagnostic,
      `Skill mechanics result diagnostic[${index}]`,
    );
  });
}

function validateStatusConsistency(result, status) {
  const blockedDiagnostics = result.diagnostics.filter(
    diagnostic => diagnostic.severity === "blocked",
  );

  if (status === "resolved") {
    if (result.level === null || result.relativeLevel === null) {
      throw new Error(
        "Resolved Skill mechanics result must contain level and relativeLevel",
      );
    }
    if (result.basis === null) {
      throw new Error("Resolved Skill mechanics result must contain basis");
    }
    if (blockedDiagnostics.length !== 0) {
      throw new Error(
        "Resolved Skill mechanics result must not contain blocked diagnostics",
      );
    }
    return;
  }

  if (
    result.level !== null ||
    result.relativeLevel !== null ||
    result.basis !== null
  ) {
    throw new Error(
      "Blocked Skill mechanics result must not contain resolved values",
    );
  }
  if (blockedDiagnostics.length === 0) {
    throw new Error(
      "Blocked Skill mechanics result must contain a blocked diagnostic",
    );
  }
}

function normalizePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeNullableString(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
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

function normalizeUniqueStringArray(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  const normalized = value.map((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );
  validateUniqueStringArray(normalized, label);
  return normalized;
}

function validateUniqueStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  value.forEach((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );

  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
}

function clonePortableValue(value, label) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error(`${label} must be JSON portable`);
  }

  if (serialized === undefined) {
    throw new Error(`${label} must be JSON portable`);
  }

  const cloned = JSON.parse(serialized);
  if (!deepEqualPortable(value, cloned)) {
    throw new Error(`${label} must be JSON portable`);
  }
  return cloned;
}

function deepEqualPortable(left, right) {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right) return false;
  if (left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => deepEqualPortable(item, right[index]));
  }
  if (typeof left !== "object") return false;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    key =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      deepEqualPortable(left[key], right[key]),
  );
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
