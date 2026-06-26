import { validateSkill } from "../../domain/character/Skills.js";
import { createSkillMechanicsResult } from "./SkillMechanicsResult.js";

const DIFFICULTY_OFFSETS = Object.freeze({
  E: 0,
  A: -1,
  H: -2,
  VH: -3,
});

export function resolveTrainedSkill(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Trained Skill resolution input must be an object");
  }

  const { skill, attributeLevel } = input;
  validateSkill(skill);

  const blockingDiagnostic = findBlockingDiagnostic(skill, attributeLevel);
  if (blockingDiagnostic !== null) {
    return createSkillMechanicsResult({
      entityId: skill.id,
      entityType: "skill",
      status: "blocked",
      diagnostics: [blockingDiagnostic],
    });
  }

  const relativeLevel = calculateRelativeLevel(
    skill.difficulty,
    skill.points,
  );
  const level = normalizeZero(attributeLevel + relativeLevel);
  const diagnostics = createImportDiagnostics(skill, level, relativeLevel);

  return createSkillMechanicsResult({
    entityId: skill.id,
    entityType: "skill",
    status: "resolved",
    level,
    relativeLevel,
    basis: {
      kind: "trained",
      sourceId: null,
      attribute: skill.attribute,
    },
    appliedModifierIds: [],
    diagnostics,
  });
}

export function getSkillDifficultyOffsets() {
  return { ...DIFFICULTY_OFFSETS };
}

function findBlockingDiagnostic(skill, attributeLevel) {
  if (skill.attribute === null || skill.attribute.trim() === "") {
    return {
      code: "SKILL_ATTRIBUTE_MISSING",
      severity: "blocked",
    };
  }

  if (skill.difficulty === null || skill.difficulty.trim() === "") {
    return {
      code: "SKILL_DIFFICULTY_MISSING",
      severity: "blocked",
    };
  }

  if (!Object.prototype.hasOwnProperty.call(
    DIFFICULTY_OFFSETS,
    skill.difficulty,
  )) {
    return {
      code: "SKILL_DIFFICULTY_UNSUPPORTED",
      severity: "blocked",
      difficulty: skill.difficulty,
      supportedDifficulties: Object.keys(DIFFICULTY_OFFSETS),
    };
  }

  if (
    typeof skill.points !== "number" ||
    !Number.isFinite(skill.points) ||
    !Number.isInteger(skill.points) ||
    skill.points < 0
  ) {
    return {
      code: "SKILL_POINTS_INVALID",
      severity: "blocked",
      points: skill.points,
    };
  }

  if (skill.points === 0) {
    return {
      code: "SKILL_UNTRAINED",
      severity: "blocked",
      points: 0,
    };
  }

  if (typeof attributeLevel !== "number" || !Number.isFinite(attributeLevel)) {
    return {
      code: "SKILL_ATTRIBUTE_LEVEL_INVALID",
      severity: "blocked",
      attribute: skill.attribute,
      attributeLevel: normalizePortableInvalidValue(attributeLevel),
    };
  }

  return null;
}

function calculateRelativeLevel(difficulty, points) {
  const difficultyOffset = DIFFICULTY_OFFSETS[difficulty];
  return difficultyOffset + calculatePointAdvancement(points);
}

function calculatePointAdvancement(points) {
  if (points === 1) return 0;
  if (points < 4) return 1;
  return 2 + Math.floor((points - 4) / 4);
}

function createImportDiagnostics(skill, level, relativeLevel) {
  const diagnostics = [];

  if (
    skill.importedLevel !== null &&
    !Object.is(normalizeZero(skill.importedLevel), level)
  ) {
    diagnostics.push({
      code: "SKILL_IMPORTED_LEVEL_DIFFERS",
      severity: "warning",
      importedLevel: skill.importedLevel,
      calculatedLevel: level,
    });
  }

  if (
    skill.importedRelativeLevel !== null &&
    !Object.is(
      normalizeZero(skill.importedRelativeLevel),
      relativeLevel,
    )
  ) {
    diagnostics.push({
      code: "SKILL_IMPORTED_RELATIVE_LEVEL_DIFFERS",
      severity: "warning",
      importedRelativeLevel: skill.importedRelativeLevel,
      calculatedRelativeLevel: relativeLevel,
    });
  }

  return diagnostics;
}

function normalizePortableInvalidValue(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  return value;
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
