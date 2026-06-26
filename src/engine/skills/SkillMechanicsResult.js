import {
  cloneSkillMechanicsPortableValue,
  deepFreezeSkillMechanicsValue,
  requireSkillMechanicsPlainObject,
  validateSkillMechanicsDenseArray,
} from "./SkillMechanicsPortableValue.js";

const SKILL_MECHANICS_RESULT_SCHEMA_VERSION = 1;

const ENTITY_TYPES = ["skill", "technique"];
const RESULT_STATUSES = ["resolved", "blocked"];
const BASIS_KINDS = ["trained", "default", "technique"];
const DIAGNOSTIC_SEVERITIES = ["info", "warning", "blocked"];

export function createSkillMechanicsResult(input = {}) {
  requireSkillMechanicsPlainObject(input, "Skill mechanics result");

  const result = {
    schemaVersion: normalizePositiveInteger(
      input.schemaVersion ?? SKILL_MECHANICS_RESULT_SCHEMA_VERSION,
      "Skill mechanics result schemaVersion",
    ),
    entityId: normalizeRequiredString(
      input.entityId,
      "Skill mechanics result entityId",
    ),
    entityType: normalizeEnum(
      input.entityType,
      ENTITY_TYPES,
      "Skill mechanics result entityType",
    ),
    status: normalizeEnum(
      input.status,
      RESULT_STATUSES,
      "Skill mechanics result status",
    ),
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
  return deepFreezeSkillMechanicsValue(result);
}

export function validateSkillMechanicsResult(result) {
  requireSkillMechanicsPlainObject(result, "Skill mechanics result");

  normalizePositiveInteger(
    result.schemaVersion,
    "Skill mechanics result schemaVersion",
  );
  normalizeRequiredString(result.entityId, "Skill mechanics result entityId");
  normalizeEnum(
    result.entityType,
    ENTITY_TYPES,
    "Skill mechanics result entityType",
  );
  const status = normalizeEnum(
    result.status,
    RESULT_STATUSES,
    "Skill mechanics result status",
  );
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
  cloneSkillMechanicsPortableValue(result, "Skill mechanics result");

  return true;
}

export function serializeSkillMechanicsResult(result) {
  validateSkillMechanicsResult(result);
  return cloneSkillMechanicsPortableValue(result, "Skill mechanics result");
}

export function getSkillMechanicsResultSchemaVersion() {
  return SKILL_MECHANICS_RESULT_SCHEMA_VERSION;
}

function normalizeBasis(value) {
  if (value === undefined || value === null) return null;
  requireSkillMechanicsPlainObject(value, "Skill mechanics result basis");

  const basis = {
    kind: normalizeEnum(
      value.kind,
      BASIS_KINDS,
      "Skill mechanics result basis kind",
    ),
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
  requireSkillMechanicsPlainObject(value, "Skill mechanics result basis");
  normalizeEnum(
    value.kind,
    BASIS_KINDS,
    "Skill mechanics result basis kind",
  );
  normalizeNullableString(
    value.sourceId,
    "Skill mechanics result basis sourceId",
  );
  normalizeNullableString(
    value.attribute,
    "Skill mechanics result basis attribute",
  );
}

function normalizeDiagnostics(value) {
  if (value === undefined || value === null) return [];
  validateSkillMechanicsDenseArray(
    value,
    "Skill mechanics result diagnostics",
  );
  return value.map((diagnostic, index) =>
    normalizeDiagnostic(diagnostic, index),
  );
}

function normalizeDiagnostic(diagnostic, index) {
  const label = `Skill mechanics result diagnostic[${index}]`;
  requireSkillMechanicsPlainObject(diagnostic, label);
  const normalized = cloneSkillMechanicsPortableValue(diagnostic, label);

  normalizeRequiredString(normalized.code, `${label} code`);
  normalizeEnum(
    normalized.severity,
    DIAGNOSTIC_SEVERITIES,
    `${label} severity`,
  );

  return normalized;
}

function validateDiagnostics(diagnostics) {
  validateSkillMechanicsDenseArray(
    diagnostics,
    "Skill mechanics result diagnostics",
  );

  diagnostics.forEach((diagnostic, index) => {
    const label = `Skill mechanics result diagnostic[${index}]`;
    requireSkillMechanicsPlainObject(diagnostic, label);
    normalizeRequiredString(diagnostic.code, `${label} code`);
    normalizeEnum(
      diagnostic.severity,
      DIAGNOSTIC_SEVERITIES,
      `${label} severity`,
    );
    cloneSkillMechanicsPortableValue(diagnostic, label);
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

function normalizeEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
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
  validateSkillMechanicsDenseArray(value, label);

  const normalized = value.map((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );
  validateUniqueStringArray(normalized, label);
  return normalized;
}

function validateUniqueStringArray(value, label) {
  validateSkillMechanicsDenseArray(value, label);

  value.forEach((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );

  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
}
