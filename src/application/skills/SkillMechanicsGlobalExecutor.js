import {
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
  serializeSkillMechanicsResult,
  validateSkillMechanicsResult,
} from "../../engine/skills/SkillMechanicsResult.js";
import {
  resolveTechnique,
} from "../../engine/skills/TechniqueResolver.js";
import {
  executeSkillBatchResolution,
} from "./SkillBatchResolutionExecutor.js";
import {
  validateSkillResolutionReport,
} from "./SkillResolutionOrchestrator.js";

const SKILL_MECHANICS_GLOBAL_REPORT_SCHEMA_VERSION = 1;
const REPORT_KEYS = Object.freeze([
  "schemaVersion",
  "characterId",
  "attributeLevels",
  "skillReports",
  "techniqueResults",
  "diagnostics",
]);
const DIAGNOSTIC_SEVERITIES = Object.freeze(["info", "warning", "blocked"]);

export function executeSkillMechanicsResolutionPlan(plan) {
  const skillBatchReport = executeSkillBatchResolution(plan);
  const trainedResults = new Map(
    skillBatchReport.skillReports.map(skillReport => [
      skillReport.skillId,
      skillReport.trainedResult,
    ]),
  );
  const techniqueResults = plan.techniques.map(technique =>
    resolveTechnique({
      technique,
      trainedSkillResult: trainedResults.get(technique.skillId),
    }),
  );

  const report = cloneEnginePortableValue({
    schemaVersion: SKILL_MECHANICS_GLOBAL_REPORT_SCHEMA_VERSION,
    characterId: skillBatchReport.characterId,
    attributeLevels: skillBatchReport.attributeLevels,
    skillReports: skillBatchReport.skillReports,
    techniqueResults: techniqueResults.map(serializeSkillMechanicsResult),
    diagnostics: [],
  }, "Skill mechanics global report");

  validateSkillMechanicsGlobalReport(report);
  return deepFreezeEngineValue(report);
}

export function validateSkillMechanicsGlobalReport(report) {
  requireEnginePlainObject(report, "Skill mechanics global report");
  validateExactKeys(report, REPORT_KEYS, "Skill mechanics global report");

  if (report.schemaVersion !== SKILL_MECHANICS_GLOBAL_REPORT_SCHEMA_VERSION) {
    throw new Error("Skill mechanics global report schemaVersion is invalid");
  }
  normalizeRequiredString(
    report.characterId,
    "Skill mechanics global report characterId",
  );
  validateAttributeLevelsReport(report.attributeLevels);
  validateSkillReports(report.skillReports);
  validateTechniqueResults(report.techniqueResults);
  validateDiagnostics(report.diagnostics);
  assertEnginePortableValue(report, "Skill mechanics global report");
  return true;
}

export function serializeSkillMechanicsGlobalReport(report) {
  validateSkillMechanicsGlobalReport(report);
  return cloneEnginePortableValue(report, "Skill mechanics global report");
}

export function getSkillMechanicsGlobalReportSchemaVersion() {
  return SKILL_MECHANICS_GLOBAL_REPORT_SCHEMA_VERSION;
}

function validateSkillReports(skillReports) {
  validateEngineDenseArray(
    skillReports,
    "Skill mechanics global report skillReports",
  );
  const skillIds = new Set();

  skillReports.forEach(skillReport => {
    validateSkillResolutionReport(skillReport);
    if (skillIds.has(skillReport.skillId)) {
      throw new Error(
        "Skill mechanics global report skillReports must not repeat skillId",
      );
    }
    skillIds.add(skillReport.skillId);
  });
}

function validateTechniqueResults(techniqueResults) {
  validateEngineDenseArray(
    techniqueResults,
    "Skill mechanics global report techniqueResults",
  );
  const techniqueIds = new Set();

  techniqueResults.forEach((result, index) => {
    validateSkillMechanicsResult(result);
    if (result.entityType !== "technique") {
      throw new Error(
        `Skill mechanics global report techniqueResults[${index}] must be a Technique result`,
      );
    }
    if (techniqueIds.has(result.entityId)) {
      throw new Error(
        "Skill mechanics global report techniqueResults must not repeat entityId",
      );
    }
    techniqueIds.add(result.entityId);

    if (result.status === "resolved" && result.basis?.kind !== "technique") {
      throw new Error(
        `Skill mechanics global report techniqueResults[${index}] has invalid basis kind`,
      );
    }
  });
}

function validateDiagnostics(diagnostics) {
  validateEngineDenseArray(
    diagnostics,
    "Skill mechanics global report diagnostics",
  );
  diagnostics.forEach((diagnostic, index) => {
    const label = `Skill mechanics global report diagnostics[${index}]`;
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
