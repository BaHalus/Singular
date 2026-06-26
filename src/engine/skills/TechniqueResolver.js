import { validateTechnique } from "../../domain/character/Techniques.js";
import {
  createSkillMechanicsResult,
  serializeSkillMechanicsResult,
  validateSkillMechanicsResult,
} from "./SkillMechanicsResult.js";
import {
  requireSkillMechanicsPlainObject,
} from "./SkillMechanicsPortableValue.js";

const TECHNIQUE_DIFFICULTIES = Object.freeze(["A", "H"]);

export function resolveTechnique(input = {}) {
  requireSkillMechanicsPlainObject(input, "Technique resolution input");

  const { technique, trainedSkillResult } = input;
  validateTechnique(technique);

  const techniqueDiagnostic = findTechniqueBlockingDiagnostic(technique);
  if (techniqueDiagnostic !== null) {
    return createBlockedTechniqueResult(technique.id, techniqueDiagnostic);
  }

  const sourceDiagnostic = findSourceBlockingDiagnostic(
    technique,
    trainedSkillResult,
  );
  if (sourceDiagnostic !== null) {
    return createBlockedTechniqueResult(technique.id, sourceDiagnostic);
  }

  const improvement = calculateTechniqueImprovement(
    technique.difficulty,
    technique.points,
  );
  const uncappedRelativeLevel = normalizeZero(
    technique.defaultPenalty + improvement,
  );

  if (!Number.isFinite(uncappedRelativeLevel)) {
    return createBlockedTechniqueResult(technique.id, {
      code: "TECHNIQUE_RELATIVE_LEVEL_INVALID",
      severity: "blocked",
      calculatedRelativeLevel: normalizePortableInvalidValue(
        uncappedRelativeLevel,
      ),
    });
  }

  const relativeLevel = applyMaximumRelativeLevel(
    uncappedRelativeLevel,
    technique.maximumRelativeLevel,
  );
  const level = normalizeZero(trainedSkillResult.level + relativeLevel);

  if (!Number.isFinite(level)) {
    return createBlockedTechniqueResult(technique.id, {
      code: "TECHNIQUE_LEVEL_INVALID",
      severity: "blocked",
      skillLevel: trainedSkillResult.level,
      relativeLevel,
      calculatedLevel: normalizePortableInvalidValue(level),
    });
  }

  const diagnostics = createTechniqueDiagnostics({
    technique,
    level,
    relativeLevel,
    uncappedRelativeLevel,
  });

  return createSkillMechanicsResult({
    entityId: technique.id,
    entityType: "technique",
    status: "resolved",
    level,
    relativeLevel,
    basis: {
      kind: "technique",
      sourceId: technique.skillId,
      attribute: null,
    },
    appliedModifierIds: [],
    diagnostics,
  });
}

export function getTechniqueDifficulties() {
  return [...TECHNIQUE_DIFFICULTIES];
}

function findTechniqueBlockingDiagnostic(technique) {
  if (technique.skillId === null || technique.skillId.trim() === "") {
    return {
      code: "TECHNIQUE_SKILL_ID_MISSING",
      severity: "blocked",
    };
  }

  if (technique.difficulty === null || technique.difficulty.trim() === "") {
    return {
      code: "TECHNIQUE_DIFFICULTY_MISSING",
      severity: "blocked",
    };
  }

  if (!TECHNIQUE_DIFFICULTIES.includes(technique.difficulty)) {
    return {
      code: "TECHNIQUE_DIFFICULTY_UNSUPPORTED",
      severity: "blocked",
      difficulty: technique.difficulty,
      supportedDifficulties: [...TECHNIQUE_DIFFICULTIES],
    };
  }

  if (!Number.isSafeInteger(technique.points) || technique.points < 0) {
    return {
      code: "TECHNIQUE_POINTS_INVALID",
      severity: "blocked",
      points: normalizePortableInvalidValue(technique.points),
    };
  }

  if (technique.difficulty === "H" && technique.points === 1) {
    return {
      code: "TECHNIQUE_HARD_POINTS_INSUFFICIENT",
      severity: "blocked",
      points: 1,
      minimumPointsForImprovement: 2,
    };
  }

  if (!Number.isSafeInteger(technique.defaultPenalty)) {
    return {
      code: "TECHNIQUE_DEFAULT_PENALTY_INVALID",
      severity: "blocked",
      defaultPenalty: normalizePortableInvalidValue(
        technique.defaultPenalty,
      ),
    };
  }

  if (
    technique.maximumRelativeLevel !== null &&
    !Number.isSafeInteger(technique.maximumRelativeLevel)
  ) {
    return {
      code: "TECHNIQUE_MAXIMUM_RELATIVE_LEVEL_INVALID",
      severity: "blocked",
      maximumRelativeLevel: normalizePortableInvalidValue(
        technique.maximumRelativeLevel,
      ),
    };
  }

  if (
    technique.maximumRelativeLevel !== null &&
    technique.maximumRelativeLevel < technique.defaultPenalty
  ) {
    return {
      code: "TECHNIQUE_MAXIMUM_BELOW_DEFAULT",
      severity: "blocked",
      defaultPenalty: technique.defaultPenalty,
      maximumRelativeLevel: technique.maximumRelativeLevel,
    };
  }

  return null;
}

function findSourceBlockingDiagnostic(technique, trainedSkillResult) {
  if (trainedSkillResult === undefined || trainedSkillResult === null) {
    return {
      code: "TECHNIQUE_TRAINED_SKILL_SOURCE_MISSING",
      severity: "blocked",
      skillId: technique.skillId,
    };
  }

  validateSkillMechanicsResult(trainedSkillResult);

  if (trainedSkillResult.entityType !== "skill") {
    throw new Error("Technique source must be a Skill mechanics result");
  }

  if (trainedSkillResult.entityId !== technique.skillId) {
    throw new Error("Technique source must match technique skillId");
  }

  if (trainedSkillResult.status === "blocked") {
    return {
      code: "TECHNIQUE_SKILL_SOURCE_BLOCKED",
      severity: "blocked",
      skillId: technique.skillId,
      sourceDiagnostics: serializeSkillMechanicsResult(
        trainedSkillResult,
      ).diagnostics,
    };
  }

  if (trainedSkillResult.basis?.kind !== "trained") {
    return {
      code: "TECHNIQUE_SKILL_SOURCE_NOT_TRAINED",
      severity: "blocked",
      skillId: technique.skillId,
      sourceBasisKind: trainedSkillResult.basis?.kind ?? null,
    };
  }

  return null;
}

function calculateTechniqueImprovement(difficulty, points) {
  if (difficulty === "A") return points;
  if (points === 0) return 0;
  return points - 1;
}

function applyMaximumRelativeLevel(relativeLevel, maximumRelativeLevel) {
  if (maximumRelativeLevel === null) return relativeLevel;
  return Math.min(relativeLevel, maximumRelativeLevel);
}

function createTechniqueDiagnostics({
  technique,
  level,
  relativeLevel,
  uncappedRelativeLevel,
}) {
  const diagnostics = [];

  if (
    technique.maximumRelativeLevel !== null &&
    uncappedRelativeLevel > technique.maximumRelativeLevel
  ) {
    diagnostics.push({
      code: "TECHNIQUE_MAXIMUM_APPLIED",
      severity: "info",
      uncappedRelativeLevel,
      maximumRelativeLevel: technique.maximumRelativeLevel,
    });
  }

  appendImportedDiagnostic({
    diagnostics,
    importedValue: technique.importedLevel,
    calculatedValue: level,
    invalidCode: "TECHNIQUE_IMPORTED_LEVEL_INVALID",
    divergentCode: "TECHNIQUE_IMPORTED_LEVEL_DIFFERS",
    importedField: "importedLevel",
    calculatedField: "calculatedLevel",
  });

  appendImportedDiagnostic({
    diagnostics,
    importedValue: technique.importedRelativeLevel,
    calculatedValue: relativeLevel,
    invalidCode: "TECHNIQUE_IMPORTED_RELATIVE_LEVEL_INVALID",
    divergentCode: "TECHNIQUE_IMPORTED_RELATIVE_LEVEL_DIFFERS",
    importedField: "importedRelativeLevel",
    calculatedField: "calculatedRelativeLevel",
  });

  return diagnostics;
}

function appendImportedDiagnostic({
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

function createBlockedTechniqueResult(entityId, diagnostic) {
  return createSkillMechanicsResult({
    entityId,
    entityType: "technique",
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
