import { validateSkillDefaultCandidate } from "./SkillDefaultCandidate.js";
import { createSkillMechanicsResult } from "./SkillMechanicsResult.js";
import { requireSkillMechanicsPlainObject } from "./SkillMechanicsPortableValue.js";

export function resolveSkillDefaultCandidate(input = {}) {
  requireSkillMechanicsPlainObject(input, "Skill default resolution input");

  const { candidate, sourceLevel, targetAttributeLevel } = input;
  validateSkillDefaultCandidate(candidate);

  const normalizedSourceLevel = normalizeZero(sourceLevel);
  const normalizedTargetAttributeLevel = normalizeZero(targetAttributeLevel);

  const blockingDiagnostic = findBlockingDiagnostic({
    candidate,
    sourceLevel: normalizedSourceLevel,
    targetAttributeLevel: normalizedTargetAttributeLevel,
  });

  if (blockingDiagnostic !== null) {
    return createBlockedResult(candidate.targetSkillId, blockingDiagnostic);
  }

  const level = normalizeZero(normalizedSourceLevel + candidate.modifier);
  if (!Number.isFinite(level)) {
    return createBlockedResult(candidate.targetSkillId, {
      code: "SKILL_DEFAULT_LEVEL_INVALID",
      severity: "blocked",
      sourceLevel: normalizedSourceLevel,
      modifier: candidate.modifier,
      calculatedLevel: normalizePortableInvalidValue(level),
    });
  }

  const relativeLevel = normalizeZero(level - normalizedTargetAttributeLevel);
  if (!Number.isFinite(relativeLevel)) {
    return createBlockedResult(candidate.targetSkillId, {
      code: "SKILL_DEFAULT_RELATIVE_LEVEL_INVALID",
      severity: "blocked",
      level,
      targetAttributeLevel: normalizedTargetAttributeLevel,
      calculatedRelativeLevel: normalizePortableInvalidValue(relativeLevel),
    });
  }

  return createSkillMechanicsResult({
    entityId: candidate.targetSkillId,
    entityType: "skill",
    status: "resolved",
    level,
    relativeLevel,
    basis: createDefaultBasis(candidate),
    appliedModifierIds: [],
    diagnostics: [],
  });
}

function findBlockingDiagnostic({
  candidate,
  sourceLevel,
  targetAttributeLevel,
}) {
  if (typeof sourceLevel !== "number" || !Number.isFinite(sourceLevel)) {
    return {
      code: "SKILL_DEFAULT_SOURCE_LEVEL_INVALID",
      severity: "blocked",
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId,
      attribute: candidate.attribute,
      sourceLevel: normalizePortableInvalidValue(sourceLevel),
    };
  }

  if (
    typeof targetAttributeLevel !== "number" ||
    !Number.isFinite(targetAttributeLevel)
  ) {
    return {
      code: "SKILL_DEFAULT_TARGET_ATTRIBUTE_LEVEL_INVALID",
      severity: "blocked",
      targetSkillId: candidate.targetSkillId,
      targetAttributeLevel: normalizePortableInvalidValue(targetAttributeLevel),
    };
  }

  return null;
}

function createDefaultBasis(candidate) {
  if (candidate.sourceType === "attribute") {
    return {
      kind: "default",
      sourceId: null,
      attribute: candidate.attribute,
    };
  }

  return {
    kind: "default",
    sourceId: candidate.sourceId,
    attribute: null,
  };
}

function createBlockedResult(entityId, diagnostic) {
  return createSkillMechanicsResult({
    entityId,
    entityType: "skill",
    status: "blocked",
    diagnostics: [diagnostic],
  });
}

function normalizePortableInvalidValue(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return typeof value;
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}
