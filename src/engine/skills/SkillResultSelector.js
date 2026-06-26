import { createSkillMechanicsResult, validateSkillMechanicsResult } from "./SkillMechanicsResult.js";
import { requireSkillMechanicsPlainObject, validateSkillMechanicsDenseArray } from "./SkillMechanicsPortableValue.js";

export function selectSkillMechanicsResult(input = {}) {
  requireSkillMechanicsPlainObject(input, "Skill mechanics selection input");

  const trainedResult = normalizeOptionalResult(input.trainedResult);
  const defaultResults = normalizeDefaultResults(input.defaultResults);
  const candidates = createCandidates(trainedResult, defaultResults);

  const resolvedCandidates = candidates.filter(candidate =>
    candidate.result.status === "resolved"
  );

  if (resolvedCandidates.length > 0) {
    return cloneWinner(findWinningCandidate(resolvedCandidates).result);
  }

  const entityId = findFirstEntityId(candidates);
  if (entityId === null) {
    throw new Error("Skill mechanics selection requires at least one result");
  }

  return createSkillMechanicsResult({
    entityId,
    entityType: "skill",
    status: "blocked",
    diagnostics: createBlockedDiagnostics(candidates),
  });
}

function normalizeOptionalResult(value) {
  if (value === undefined || value === null) return null;
  validateSkillMechanicsResult(value);
  validateSkillResultKind(value, "trained", "trainedResult");
  return value;
}

function normalizeDefaultResults(value) {
  if (value === undefined || value === null) return [];
  validateSkillMechanicsDenseArray(value, "Skill mechanics defaultResults");
  value.forEach((result, index) => {
    validateSkillMechanicsResult(result);
    validateSkillResultKind(result, "default", `defaultResults[${index}]`);
  });
  return value;
}

function validateSkillResultKind(result, expectedKind, label) {
  if (result.entityType !== "skill") {
    throw new Error(`${label} must target a Skill`);
  }

  if (result.status === "blocked") return;

  if (result.basis?.kind !== expectedKind) {
    throw new Error(`${label} must have basis.kind ${expectedKind}`);
  }
}

function createCandidates(trainedResult, defaultResults) {
  const candidates = [];
  if (trainedResult !== null) {
    candidates.push({ result: trainedResult, priority: 0, order: 0 });
  }

  defaultResults.forEach((result, index) => {
    candidates.push({ result, priority: 1, order: index });
  });

  validateSameEntity(candidates);
  return candidates;
}

function validateSameEntity(candidates) {
  const entityIds = new Set(candidates.map(candidate => candidate.result.entityId));
  if (entityIds.size > 1) {
    throw new Error("Skill mechanics selection results must target the same Skill");
  }
}

function findWinningCandidate(candidates) {
  return candidates.reduce((winner, challenger) => {
    if (challenger.result.level > winner.result.level) return challenger;
    if (challenger.result.level < winner.result.level) return winner;
    if (challenger.priority < winner.priority) return challenger;
    if (challenger.priority > winner.priority) return winner;
    return challenger.order < winner.order ? challenger : winner;
  });
}

function cloneWinner(result) {
  return createSkillMechanicsResult({
    entityId: result.entityId,
    entityType: result.entityType,
    status: result.status,
    level: result.level,
    relativeLevel: result.relativeLevel,
    basis: result.basis,
    appliedModifierIds: result.appliedModifierIds,
    diagnostics: result.diagnostics,
  });
}

function findFirstEntityId(candidates) {
  return candidates.length === 0 ? null : candidates[0].result.entityId;
}

function createBlockedDiagnostics(candidates) {
  const diagnostics = candidates.flatMap(candidate => candidate.result.diagnostics);
  if (diagnostics.length > 0) return diagnostics;

  return [{
    code: "SKILL_MECHANICS_NO_RESOLVED_RESULT",
    severity: "blocked",
  }];
}
