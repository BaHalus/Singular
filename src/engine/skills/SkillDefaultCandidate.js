import {
  cloneSkillMechanicsPortableValue,
  deepFreezeSkillMechanicsValue,
  requireSkillMechanicsPlainObject,
} from "./SkillMechanicsPortableValue.js";

const SKILL_DEFAULT_CANDIDATE_SCHEMA_VERSION = 1;
const SOURCE_TYPES = ["attribute", "skill"];

export function createSkillDefaultCandidate(input = {}) {
  requireSkillMechanicsPlainObject(input, "Skill default candidate");

  const candidate = {
    schemaVersion: normalizeSchemaVersion(input.schemaVersion),
    id: normalizeRequiredString(input.id, "Skill default candidate id"),
    targetSkillId: normalizeRequiredString(
      input.targetSkillId,
      "Skill default candidate targetSkillId",
    ),
    sourceType: normalizeSourceType(input.sourceType),
    sourceId: normalizeNullableString(
      input.sourceId,
      "Skill default candidate sourceId",
    ),
    attribute: normalizeNullableString(
      input.attribute,
      "Skill default candidate attribute",
    ),
    modifier: normalizeInteger(
      input.modifier,
      "Skill default candidate modifier",
    ),
    metadata: normalizeMetadata(input.metadata),
  };

  validateSkillDefaultCandidate(candidate);
  return deepFreezeSkillMechanicsValue(candidate);
}

export function validateSkillDefaultCandidate(candidate) {
  requireSkillMechanicsPlainObject(candidate, "Skill default candidate");

  normalizeSchemaVersion(candidate.schemaVersion);
  normalizeRequiredString(candidate.id, "Skill default candidate id");
  normalizeRequiredString(
    candidate.targetSkillId,
    "Skill default candidate targetSkillId",
  );
  const sourceType = normalizeSourceType(candidate.sourceType);
  normalizeNullableString(
    candidate.sourceId,
    "Skill default candidate sourceId",
  );
  normalizeNullableString(
    candidate.attribute,
    "Skill default candidate attribute",
  );
  normalizeInteger(candidate.modifier, "Skill default candidate modifier");
  validateMetadata(candidate.metadata);
  validateSource(candidate, sourceType);

  cloneSkillMechanicsPortableValue(candidate, "Skill default candidate");
  return true;
}

export function serializeSkillDefaultCandidate(candidate) {
  validateSkillDefaultCandidate(candidate);
  return cloneSkillMechanicsPortableValue(
    candidate,
    "Skill default candidate",
  );
}

export function getSkillDefaultCandidateSchemaVersion() {
  return SKILL_DEFAULT_CANDIDATE_SCHEMA_VERSION;
}

export function getSkillDefaultCandidateSourceTypes() {
  return [...SOURCE_TYPES];
}

function validateSource(candidate, sourceType) {
  if (sourceType === "attribute") {
    if (candidate.sourceId !== null) {
      throw new Error(
        "Attribute Skill default candidate must not contain sourceId",
      );
    }
    normalizeRequiredString(
      candidate.attribute,
      "Attribute Skill default candidate attribute",
    );
    return;
  }

  normalizeRequiredString(
    candidate.sourceId,
    "Skill-source default candidate sourceId",
  );
  if (candidate.attribute !== null) {
    throw new Error(
      "Skill-source default candidate must not contain attribute",
    );
  }
  if (candidate.sourceId === candidate.targetSkillId) {
    throw new Error(
      "Skill default candidate must not reference its target directly",
    );
  }
}

function normalizeSchemaVersion(value) {
  const normalized = value ?? SKILL_DEFAULT_CANDIDATE_SCHEMA_VERSION;
  if (normalized !== SKILL_DEFAULT_CANDIDATE_SCHEMA_VERSION) {
    throw new Error("Skill default candidate schemaVersion is unsupported");
  }
  return normalized;
}

function normalizeSourceType(value) {
  if (!SOURCE_TYPES.includes(value)) {
    throw new Error("Skill default candidate sourceType is invalid");
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

function normalizeInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a finite integer`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function normalizeMetadata(value) {
  if (value === undefined || value === null) return {};
  requireSkillMechanicsPlainObject(value, "Skill default candidate metadata");
  return cloneSkillMechanicsPortableValue(
    value,
    "Skill default candidate metadata",
  );
}

function validateMetadata(value) {
  requireSkillMechanicsPlainObject(value, "Skill default candidate metadata");
  cloneSkillMechanicsPortableValue(
    value,
    "Skill default candidate metadata",
  );
}
