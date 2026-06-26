import { validateSkillDefaultCandidate } from "./SkillDefaultCandidate.js";
import { createSkillMechanicsResult } from "./SkillMechanicsResult.js";
import { isSkillMechanicsPlainObject } from "./SkillMechanicsPortableValue.js";

export function resolveSkillDefaultCandidate(input = {}) {
  if (!isSkillMechanicsPlainObject(input)) {
    throw new Error("Skill default resolution input must be an object");
  }

  const {
    candidate,
    sourceLevel,
    targetAttributeLevel,
  } = input;

  validateSkillDefaultCandidate(candidate);

  const blockingDiagnostic = findBlockingDiagnostic(
    candidate,
    sourceLevel,
    targetAttributeLevel,
  );
  if (blockingDiagnostic !== null) {
    return blockedResult(candidate, blockingDiagnostic);
  }

  const level = normalizeZero(sourceLevel + candidate.modifier);
  if (!Number.isFinite(level)) {
    return blockedResult(candidate, {
      code: "SKILL_DEFAULT_LEVEL_NON_FINITE",
      severity: "blocked",
      candidateId: candidate.id,
    });
  }

  const relativeLevel = normalizeZero(level - targetAttributeLevel);
  if (!Number.isFinite(relativeLevel)) {
    return blockedResult(candidate, {
      code: "SKILL_DEFAULT_RELATIVE_LEVEL_NON_FINITE",
      severity: "blocked",
      candidateId: candidate.id,
    });
  }

  return createSkillMechanicsResult({
    entityId: candidate.targetSkillId,
    entityType: "skill",
    status: "resolved",
    level,
    relativeLevel,
    basis: {
      kind: "default",
      sourceId: candidate.sourceType === "skill"
        ? candidate.sourceId
        : null,
      attribute: candidate.sourceType === "attribute"
        ? candidate.attribute
        : null,
    },
    appliedModifierIds: [],
    diagnostics: [
      {
        code: "SKILL_DEFAULT_CANDIDATE_APPLIED",
        severity: "info",
        candidateId: candidate.id,
        sourceType: candidate.sourceType,
        sourceLevel,
        modifier: candidate.modifier,
        targetAttributeLevel,
      },
    ],
  });
}

function findBlockingDiagnostic(
  candidate,
  sourceLevel,
  targetAttributeLevel,
) {
  if (typeof sourceLevel !== "number" || !Number.isFinite(sourceLevel)) {
    return {
      code: "SKILL_DEFAULT_SOURCE_LEVEL_INVALID",
      severity: "blocked",
      candidateId: candidate.id,
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
      candidateId: candidate.id,
      targetAttributeLevel: normalizePortableInvalidValue(
        targetAttributeLevel,
      ),
    };
  }

  return null;
}

function blockedResult(candidate, diagnostic) {
  return createSkillMechanicsResult({
    entityId: candidate.targetSkillId,
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
