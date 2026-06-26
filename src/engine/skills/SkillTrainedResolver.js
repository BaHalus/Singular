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
  validateSkillForMechanicalResolution(skill);

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

function validateSkillForMechanicalResolution(skill) {
  if (
    isPlainObject(skill) &&
    typeof skill.points === "number" &&
    !Number.isFinite(skill.points)
  ) {
    validateSkill({
      ...skill,
      points: 0,
    });
    return;
  }

  validateSkill(skill);
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
      points: normalizePortableInvalidValue(skill.points),
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

  appendImportedValueDiagnostic({
    diagnostics,
    importedValue: skill.importedLevel,
    calculatedValue: level,
    invalidCode: "SKILL_IMPORTED_LEVEL_INVALID",
    divergentCode: "SKILL_IMPORTED_LEVEL_DIFFERS",
    importedField: "importedLevel",
    calculatedField: "calculatedLevel",
  });

  appendImportedValueDiagnostic({
    diagnostics,
    importedValue: skill.importedRelativeLevel,
    calculatedValue: relativeLevel,
    invalidCode: "SKILL_IMPORTED_RELATIVE_LEVEL_INVALID",
    divergentCode: "SKILL_IMPORTED_RELATIVE_LEVEL_DIFFERS",
    importedField: "importedRelativeLevel",
    calculatedField: "calculatedRelativeLevel",
  });

  return diagnostics;
}

function appendImportedValueDiagnostic({
  diagnostics,
  importedValue,
  calculatedValue,
  invalidCode,
  divergentCode,
  importedField,
  calculatedField,
}) {
  if (importedValue === null) return;

  if (typeof importedValue !== "number" || !Number.isFinite(importedValue)) {
    diagnostics.push({
      code: invalidCode,
      severity: "warning",
      [importedField]: normalizePortableInvalidValue(importedValue),
    });
    return;
  }

  if (!Object.is(normalizeZero(importedValue), calculatedValue)) {
    diagnostics.push({
      code: divergentCode,
      severity: "warning",
      [importedField]: importedValue,
      [calculatedField]: calculatedValue,
    });
  }
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

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
