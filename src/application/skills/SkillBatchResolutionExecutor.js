import {
  serializeAttributeLevelsReport,
  validateAttributeLevelsReport,
} from "../../engine/attributes/AttributeLevelResolver.js";
import {
  assertEnginePortableValue,
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  requireEnginePlainObject,
  validateEngineDenseArray,
} from "../../engine/EnginePortableValue.js";
import {
  resolveSkillDefaultCandidate,
} from "../../engine/skills/SkillDefaultResolver.js";
import {
  resolveSkillDefaultFromTrainedSource,
} from "../../engine/skills/SkillDefaultTrainedSourceResolver.js";
import {
  serializeSkillMechanicsResult,
} from "../../engine/skills/SkillMechanicsResult.js";
import {
  selectSkillMechanicsResult,
} from "../../engine/skills/SkillResultSelector.js";
import {
  resolveTrainedSkill,
} from "../../engine/skills/SkillTrainedResolver.js";
import {
  getSkillResolutionReportSchemaVersion,
  validateSkillResolutionReport,
} from "./SkillResolutionOrchestrator.js";
import {
  validateSkillMechanicsResolutionPlan,
} from "./SkillMechanicsResolutionPlan.js";

const SKILL_BATCH_RESOLUTION_REPORT_SCHEMA_VERSION = 1;
const REPORT_KEYS = Object.freeze([
  "schemaVersion",
  "characterId",
  "attributeLevels",
  "skillReports",
  "diagnostics",
]);
const DIAGNOSTIC_SEVERITIES = Object.freeze(["info", "warning", "blocked"]);

export function executeSkillBatchResolution(plan) {
  validateSkillMechanicsResolutionPlan(plan);

  const trainedResults = new Map(
    plan.skills.map(skill => [
      skill.id,
      resolveTrainedSkill({
        skill,
        attributeLevel: getResolvedAttributeLevel(
          plan.attributeLevels,
          skill.attribute,
        ),
      }),
    ]),
  );
  const candidatesByTarget = groupCandidatesByTarget(
    plan.skills,
    plan.defaultCandidates,
  );

  const skillReports = plan.skills.map(skill => {
    const targetAttributeLevel = getResolvedAttributeLevel(
      plan.attributeLevels,
      skill.attribute,
    );
    const trainedResult = trainedResults.get(skill.id);
    const defaultEvaluations = candidatesByTarget.get(skill.id).map(candidate => ({
      candidateId: candidate.id,
      result: evaluateDefaultCandidate({
        candidate,
        targetAttributeLevel,
        attributeLevels: plan.attributeLevels,
        trainedResults,
      }),
    }));
    const finalResult = selectSkillMechanicsResult({
      trainedResult,
      defaultResults: defaultEvaluations.map(evaluation => evaluation.result),
    });
    const report = {
      schemaVersion: getSkillResolutionReportSchemaVersion(),
      skillId: skill.id,
      finalResult: serializeSkillMechanicsResult(finalResult),
      trainedResult: serializeSkillMechanicsResult(trainedResult),
      defaultEvaluations: defaultEvaluations.map(evaluation => ({
        candidateId: evaluation.candidateId,
        result: serializeSkillMechanicsResult(evaluation.result),
      })),
    };

    validateSkillResolutionReport(report);
    return report;
  });

  const report = cloneEnginePortableValue({
    schemaVersion: SKILL_BATCH_RESOLUTION_REPORT_SCHEMA_VERSION,
    characterId: plan.characterId,
    attributeLevels: serializeAttributeLevelsReport(plan.attributeLevels),
    skillReports,
    diagnostics: [],
  }, "Skill batch resolution report");

  validateSkillBatchResolutionReport(report);
  return deepFreezeEngineValue(report);
}

export function validateSkillBatchResolutionReport(report) {
  requireEnginePlainObject(report, "Skill batch resolution report");
  validateExactKeys(report, REPORT_KEYS, "Skill batch resolution report");

  if (report.schemaVersion !== SKILL_BATCH_RESOLUTION_REPORT_SCHEMA_VERSION) {
    throw new Error("Skill batch resolution report schemaVersion is invalid");
  }
  normalizeRequiredString(
    report.characterId,
    "Skill batch resolution report characterId",
  );
  validateAttributeLevelsReport(report.attributeLevels);
  validateEngineDenseArray(
    report.skillReports,
    "Skill batch resolution report skillReports",
  );

  const skillIds = new Set();
  report.skillReports.forEach((skillReport, index) => {
    validateSkillResolutionReport(skillReport);
    if (skillIds.has(skillReport.skillId)) {
      throw new Error(
        "Skill batch resolution report skillReports must not repeat skillId",
      );
    }
    skillIds.add(skillReport.skillId);

    if (typeof skillReport.skillId !== "string" || skillReport.skillId === "") {
      throw new Error(
        `Skill batch resolution report skillReports[${index}] has invalid skillId`,
      );
    }
  });

  validateDiagnostics(report.diagnostics);
  assertEnginePortableValue(report, "Skill batch resolution report");
  return true;
}

export function serializeSkillBatchResolutionReport(report) {
  validateSkillBatchResolutionReport(report);
  return cloneEnginePortableValue(report, "Skill batch resolution report");
}

export function getSkillBatchResolutionReportSchemaVersion() {
  return SKILL_BATCH_RESOLUTION_REPORT_SCHEMA_VERSION;
}

function groupCandidatesByTarget(skills, candidates) {
  const grouped = new Map(skills.map(skill => [skill.id, []]));
  candidates.forEach(candidate => {
    grouped.get(candidate.targetSkillId).push(candidate);
  });
  return grouped;
}

function evaluateDefaultCandidate({
  candidate,
  targetAttributeLevel,
  attributeLevels,
  trainedResults,
}) {
  if (candidate.sourceType === "attribute") {
    return resolveSkillDefaultCandidate({
      candidate,
      sourceLevel: getResolvedAttributeLevel(
        attributeLevels,
        candidate.attribute,
      ),
      targetAttributeLevel,
    });
  }

  return resolveSkillDefaultFromTrainedSource({
    candidate,
    trainedSourceResult: trainedResults.get(candidate.sourceId),
    targetAttributeLevel,
  });
}

function getResolvedAttributeLevel(attributeLevels, attributeKey) {
  const result = attributeLevels.results[attributeKey];
  return result?.status === "resolved" ? result.level : undefined;
}

function validateDiagnostics(diagnostics) {
  validateEngineDenseArray(
    diagnostics,
    "Skill batch resolution report diagnostics",
  );
  diagnostics.forEach((diagnostic, index) => {
    const label = `Skill batch resolution report diagnostics[${index}]`;
    requireEnginePlainObject(diagnostic, label);
    normalizeRequiredString(diagnostic.code, `${label} code`);
    if (!DIAGNOSTIC_SEVERITIES.includes(diagnostic.severity)) {
      throw new Error(`${label} severity is invalid`);
    }
    assertEnginePortableValue(diagnostic, label);
  });
}

function validateExactKeys(value, expectedKeys, label) {
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error(`${label} contains unsupported properties`);
  }
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}
