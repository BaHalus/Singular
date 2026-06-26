import {
  validateSkillDefaultCandidate,
} from "../../engine/skills/SkillDefaultCandidate.js";
import {
  resolveSkillDefaultCandidate,
} from "../../engine/skills/SkillDefaultResolver.js";
import {
  serializeSkillMechanicsResult,
  validateSkillMechanicsResult,
} from "../../engine/skills/SkillMechanicsResult.js";
import {
  cloneSkillMechanicsPortableValue,
  deepFreezeSkillMechanicsValue,
  requireSkillMechanicsPlainObject,
  validateSkillMechanicsDenseArray,
} from "../../engine/skills/SkillMechanicsPortableValue.js";
import {
  selectSkillMechanicsResult,
} from "../../engine/skills/SkillResultSelector.js";
import {
  resolveTrainedSkill,
} from "../../engine/skills/SkillTrainedResolver.js";

const SKILL_RESOLUTION_REPORT_SCHEMA_VERSION = 1;

export function orchestrateSkillResolution(input = {}) {
  requireSkillMechanicsPlainObject(input, "Skill resolution input");

  const trainedResult = resolveTrainedSkill({
    skill: input.skill,
    attributeLevel: input.attributeLevel,
  });
  const defaultInputs = normalizeDefaultInputs(
    input.defaultInputs,
    trainedResult.entityId,
  );
  const defaultEvaluations = defaultInputs.map(({ candidate, sourceLevel }) => ({
    candidateId: candidate.id,
    result: resolveSkillDefaultCandidate({
      candidate,
      sourceLevel,
      targetAttributeLevel: input.attributeLevel,
    }),
  }));
  const finalResult = selectSkillMechanicsResult({
    trainedResult,
    defaultResults: defaultEvaluations.map(evaluation => evaluation.result),
  });

  const report = {
    schemaVersion: SKILL_RESOLUTION_REPORT_SCHEMA_VERSION,
    skillId: trainedResult.entityId,
    finalResult: serializeSkillMechanicsResult(finalResult),
    trainedResult: serializeSkillMechanicsResult(trainedResult),
    defaultEvaluations: defaultEvaluations.map(evaluation => ({
      candidateId: evaluation.candidateId,
      result: serializeSkillMechanicsResult(evaluation.result),
    })),
  };

  validateSkillResolutionReport(report);
  return deepFreezeSkillMechanicsValue(report);
}

export function validateSkillResolutionReport(report) {
  requireSkillMechanicsPlainObject(report, "Skill resolution report");

  if (report.schemaVersion !== SKILL_RESOLUTION_REPORT_SCHEMA_VERSION) {
    throw new Error("Skill resolution report schemaVersion is invalid");
  }

  normalizeRequiredString(report.skillId, "Skill resolution report skillId");
  validateReportResult(
    report.finalResult,
    report.skillId,
    null,
    "Skill resolution report finalResult",
  );
  validateReportResult(
    report.trainedResult,
    report.skillId,
    "trained",
    "Skill resolution report trainedResult",
  );

  validateSkillMechanicsDenseArray(
    report.defaultEvaluations,
    "Skill resolution report defaultEvaluations",
  );
  const candidateIds = new Set();
  report.defaultEvaluations.forEach((evaluation, index) => {
    const label = `Skill resolution report defaultEvaluations[${index}]`;
    requireSkillMechanicsPlainObject(evaluation, label);
    const candidateId = normalizeRequiredString(
      evaluation.candidateId,
      `${label} candidateId`,
    );
    if (candidateIds.has(candidateId)) {
      throw new Error(
        "Skill resolution report defaultEvaluations must not repeat candidateId",
      );
    }
    candidateIds.add(candidateId);
    validateReportResult(
      evaluation.result,
      report.skillId,
      "default",
      `${label} result`,
    );
  });

  const recomputed = selectSkillMechanicsResult({
    trainedResult: report.trainedResult,
    defaultResults: report.defaultEvaluations.map(
      evaluation => evaluation.result,
    ),
  });
  if (!samePortableValue(recomputed, report.finalResult)) {
    throw new Error(
      "Skill resolution report finalResult is inconsistent with its evaluations",
    );
  }

  cloneSkillMechanicsPortableValue(report, "Skill resolution report");
  return true;
}

export function serializeSkillResolutionReport(report) {
  validateSkillResolutionReport(report);
  return cloneSkillMechanicsPortableValue(report, "Skill resolution report");
}

export function getSkillResolutionReportSchemaVersion() {
  return SKILL_RESOLUTION_REPORT_SCHEMA_VERSION;
}

function normalizeDefaultInputs(value, skillId) {
  if (value === undefined || value === null) return [];
  validateSkillMechanicsDenseArray(value, "Skill resolution defaultInputs");

  const candidateIds = new Set();
  return value.map((entry, index) => {
    const label = `Skill resolution defaultInputs[${index}]`;
    requireSkillMechanicsPlainObject(entry, label);
    validateSkillDefaultCandidate(entry.candidate);

    if (entry.candidate.targetSkillId !== skillId) {
      throw new Error(
        `${label} candidate must target the resolved Skill`,
      );
    }
    if (candidateIds.has(entry.candidate.id)) {
      throw new Error(
        "Skill resolution defaultInputs must not repeat candidate id",
      );
    }
    candidateIds.add(entry.candidate.id);

    return {
      candidate: entry.candidate,
      sourceLevel: entry.sourceLevel,
    };
  });
}

function validateReportResult(result, skillId, expectedBasisKind, label) {
  validateSkillMechanicsResult(result);
  if (result.entityType !== "skill" || result.entityId !== skillId) {
    throw new Error(`${label} must belong to the report Skill`);
  }
  if (
    result.status === "resolved" &&
    expectedBasisKind !== null &&
    result.basis?.kind !== expectedBasisKind
  ) {
    throw new Error(`${label} has an invalid basis kind`);
  }
}

function samePortableValue(left, right) {
  return JSON.stringify(canonicalPortableValue(
    serializeSkillMechanicsResult(left),
  )) === JSON.stringify(canonicalPortableValue(
    serializeSkillMechanicsResult(right),
  ));
}

function canonicalPortableValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalPortableValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value).sort().reduce((canonical, key) => {
      canonical[key] = canonicalPortableValue(value[key]);
      return canonical;
    }, {});
  }

  return value;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}
