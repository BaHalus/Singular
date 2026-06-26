import {
  assertEnginePortableValue,
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  requireEnginePlainObject,
  validateEngineDenseArray,
} from "../../engine/EnginePortableValue.js";
import {
  validateSkillMechanicsGlobalReport,
} from "../skills/SkillMechanicsGlobalExecutor.js";

const SKILL_MECHANICS_READ_PROJECTION_SCHEMA_VERSION = 1;
const ATTRIBUTE_KEYS = Object.freeze(["ST", "DX", "IQ", "HT"]);
const RESULT_STATUSES = Object.freeze(["resolved", "blocked"]);
const RESULT_BASIS_KINDS = Object.freeze(["trained", "default", "technique"]);
const DIAGNOSTIC_SEVERITIES = Object.freeze(["info", "warning", "blocked"]);
const PROJECTION_KEYS = Object.freeze([
  "schemaVersion",
  "characterId",
  "attributes",
  "skills",
  "techniques",
  "diagnostics",
]);
const ATTRIBUTE_KEYS_SHAPE = Object.freeze([
  "key",
  "status",
  "level",
  "source",
  "diagnostics",
]);
const SKILL_KEYS = Object.freeze(["id", "final", "trained", "defaults"]);
const DEFAULT_KEYS = Object.freeze(["candidateId", "result"]);
const TECHNIQUE_KEYS = Object.freeze(["id", "result"]);
const RESULT_KEYS = Object.freeze([
  "status",
  "level",
  "relativeLevel",
  "basis",
  "appliedModifierIds",
  "diagnostics",
]);
const BASIS_KEYS = Object.freeze(["kind", "sourceId", "attribute"]);

export function createSkillMechanicsReadProjection(globalReport) {
  validateSkillMechanicsGlobalReport(globalReport);

  const projection = cloneEnginePortableValue({
    schemaVersion: SKILL_MECHANICS_READ_PROJECTION_SCHEMA_VERSION,
    characterId: globalReport.characterId,
    attributes: projectAttributes(globalReport.attributeLevels),
    skills: globalReport.skillReports.map(projectSkillReport),
    techniques: globalReport.techniqueResults.map(result => ({
      id: result.entityId,
      result: projectResult(result),
    })),
    diagnostics: cloneEnginePortableValue(
      globalReport.diagnostics,
      "Skill mechanics read projection diagnostics",
    ),
  }, "Skill mechanics read projection");

  validateSkillMechanicsReadProjection(projection);
  return deepFreezeEngineValue(projection);
}

export function validateSkillMechanicsReadProjection(projection) {
  requireEnginePlainObject(projection, "Skill mechanics read projection");
  validateExactKeys(
    projection,
    PROJECTION_KEYS,
    "Skill mechanics read projection",
  );

  if (
    projection.schemaVersion !==
    SKILL_MECHANICS_READ_PROJECTION_SCHEMA_VERSION
  ) {
    throw new Error(
      "Skill mechanics read projection schemaVersion is invalid",
    );
  }
  normalizeRequiredString(
    projection.characterId,
    "Skill mechanics read projection characterId",
  );
  validateAttributesProjection(projection.attributes);
  validateSkillsProjection(projection.skills);
  validateTechniquesProjection(projection.techniques);
  validateDiagnostics(
    projection.diagnostics,
    "Skill mechanics read projection diagnostics",
  );
  assertEnginePortableValue(projection, "Skill mechanics read projection");
  return true;
}

export function serializeSkillMechanicsReadProjection(projection) {
  validateSkillMechanicsReadProjection(projection);
  return cloneEnginePortableValue(
    projection,
    "Skill mechanics read projection",
  );
}

export function getSkillMechanicsReadProjectionSchemaVersion() {
  return SKILL_MECHANICS_READ_PROJECTION_SCHEMA_VERSION;
}

function projectAttributes(attributeLevels) {
  return Object.fromEntries(
    ATTRIBUTE_KEYS.map(key => {
      const result = attributeLevels.results[key];
      return [
        key,
        {
          key,
          status: result.status,
          level: result.level,
          source: result.source,
          diagnostics: cloneEnginePortableValue(
            result.diagnostics,
            `Skill mechanics read projection attribute ${key} diagnostics`,
          ),
        },
      ];
    }),
  );
}

function projectSkillReport(skillReport) {
  return {
    id: skillReport.skillId,
    final: projectResult(skillReport.finalResult),
    trained: projectResult(skillReport.trainedResult),
    defaults: skillReport.defaultEvaluations.map(evaluation => ({
      candidateId: evaluation.candidateId,
      result: projectResult(evaluation.result),
    })),
  };
}

function projectResult(result) {
  return {
    status: result.status,
    level: result.level,
    relativeLevel: result.relativeLevel,
    basis: result.basis === null
      ? null
      : cloneEnginePortableValue(result.basis, "Projected mechanics result basis"),
    appliedModifierIds: cloneEnginePortableValue(
      result.appliedModifierIds,
      "Projected mechanics result appliedModifierIds",
    ),
    diagnostics: cloneEnginePortableValue(
      result.diagnostics,
      "Projected mechanics result diagnostics",
    ),
  };
}

function validateAttributesProjection(attributes) {
  requireEnginePlainObject(
    attributes,
    "Skill mechanics read projection attributes",
  );
  validateExactKeys(
    attributes,
    ATTRIBUTE_KEYS,
    "Skill mechanics read projection attributes",
  );

  ATTRIBUTE_KEYS.forEach(key => {
    const attribute = attributes[key];
    const label = `Skill mechanics read projection attribute ${key}`;
    requireEnginePlainObject(attribute, label);
    validateExactKeys(attribute, ATTRIBUTE_KEYS_SHAPE, label);
    if (attribute.key !== key) {
      throw new Error(`${label} key is inconsistent`);
    }
    normalizeStatus(attribute.status, `${label} status`);
    normalizeNullableFiniteNumber(attribute.level, `${label} level`);
    if (!['base', 'override'].includes(attribute.source)) {
      throw new Error(`${label} source is invalid`);
    }
    validateDiagnostics(attribute.diagnostics, `${label} diagnostics`);
    validateStatusValues({
      status: attribute.status,
      level: attribute.level,
      relativeLevel: null,
      basis: null,
      diagnostics: attribute.diagnostics,
      label,
      requiresRelativeLevel: false,
      requiresBasis: false,
    });
  });
}

function validateSkillsProjection(skills) {
  validateEngineDenseArray(skills, "Skill mechanics read projection skills");
  const skillIds = new Set();

  skills.forEach((skill, index) => {
    const label = `Skill mechanics read projection skills[${index}]`;
    requireEnginePlainObject(skill, label);
    validateExactKeys(skill, SKILL_KEYS, label);
    normalizeRequiredString(skill.id, `${label} id`);
    if (skillIds.has(skill.id)) {
      throw new Error(
        "Skill mechanics read projection skills must not repeat id",
      );
    }
    skillIds.add(skill.id);

    validateProjectedResult(skill.final, `${label} final`, ["trained", "default"]);
    validateProjectedResult(skill.trained, `${label} trained`, ["trained"]);
    validateEngineDenseArray(skill.defaults, `${label} defaults`);
    const candidateIds = new Set();
    skill.defaults.forEach((evaluation, defaultIndex) => {
      const defaultLabel = `${label} defaults[${defaultIndex}]`;
      requireEnginePlainObject(evaluation, defaultLabel);
      validateExactKeys(evaluation, DEFAULT_KEYS, defaultLabel);
      normalizeRequiredString(
        evaluation.candidateId,
        `${defaultLabel} candidateId`,
      );
      if (candidateIds.has(evaluation.candidateId)) {
        throw new Error(`${label} defaults must not repeat candidateId`);
      }
      candidateIds.add(evaluation.candidateId);
      validateProjectedResult(
        evaluation.result,
        `${defaultLabel} result`,
        ["default"],
      );
    });
  });
}

function validateTechniquesProjection(techniques) {
  validateEngineDenseArray(
    techniques,
    "Skill mechanics read projection techniques",
  );
  const techniqueIds = new Set();

  techniques.forEach((technique, index) => {
    const label = `Skill mechanics read projection techniques[${index}]`;
    requireEnginePlainObject(technique, label);
    validateExactKeys(technique, TECHNIQUE_KEYS, label);
    normalizeRequiredString(technique.id, `${label} id`);
    if (techniqueIds.has(technique.id)) {
      throw new Error(
        "Skill mechanics read projection techniques must not repeat id",
      );
    }
    techniqueIds.add(technique.id);
    validateProjectedResult(
      technique.result,
      `${label} result`,
      ["technique"],
    );
  });
}

function validateProjectedResult(result, label, allowedResolvedBasisKinds) {
  requireEnginePlainObject(result, label);
  validateExactKeys(result, RESULT_KEYS, label);
  const status = normalizeStatus(result.status, `${label} status`);
  normalizeNullableFiniteNumber(result.level, `${label} level`);
  normalizeNullableFiniteNumber(
    result.relativeLevel,
    `${label} relativeLevel`,
  );
  validateBasis(result.basis, `${label} basis`);
  validateUniqueStringArray(
    result.appliedModifierIds,
    `${label} appliedModifierIds`,
  );
  validateDiagnostics(result.diagnostics, `${label} diagnostics`);
  validateStatusValues({
    status,
    level: result.level,
    relativeLevel: result.relativeLevel,
    basis: result.basis,
    diagnostics: result.diagnostics,
    label,
    requiresRelativeLevel: true,
    requiresBasis: true,
  });

  if (
    status === "resolved" &&
    !allowedResolvedBasisKinds.includes(result.basis.kind)
  ) {
    throw new Error(`${label} basis kind is invalid`);
  }
}

function validateBasis(basis, label) {
  if (basis === null) return;
  requireEnginePlainObject(basis, label);
  validateExactKeys(basis, BASIS_KEYS, label);
  if (!RESULT_BASIS_KINDS.includes(basis.kind)) {
    throw new Error(`${label} kind is invalid`);
  }
  normalizeNullableString(basis.sourceId, `${label} sourceId`);
  normalizeNullableString(basis.attribute, `${label} attribute`);
}

function validateStatusValues({
  status,
  level,
  relativeLevel,
  basis,
  diagnostics,
  label,
  requiresRelativeLevel,
  requiresBasis,
}) {
  const blockedDiagnostics = diagnostics.filter(
    diagnostic => diagnostic.severity === "blocked",
  );

  if (status === "resolved") {
    if (level === null) {
      throw new Error(`${label} resolved value must contain level`);
    }
    if (requiresRelativeLevel && relativeLevel === null) {
      throw new Error(`${label} resolved value must contain relativeLevel`);
    }
    if (requiresBasis && basis === null) {
      throw new Error(`${label} resolved value must contain basis`);
    }
    if (blockedDiagnostics.length !== 0) {
      throw new Error(
        `${label} resolved value must not contain blocked diagnostics`,
      );
    }
    return;
  }

  if (level !== null) {
    throw new Error(`${label} blocked value must not contain level`);
  }
  if (requiresRelativeLevel && relativeLevel !== null) {
    throw new Error(`${label} blocked value must not contain relativeLevel`);
  }
  if (requiresBasis && basis !== null) {
    throw new Error(`${label} blocked value must not contain basis`);
  }
  if (blockedDiagnostics.length === 0) {
    throw new Error(`${label} blocked value must contain a blocked diagnostic`);
  }
}

function validateDiagnostics(diagnostics, label) {
  validateEngineDenseArray(diagnostics, label);
  diagnostics.forEach((diagnostic, index) => {
    const diagnosticLabel = `${label}[${index}]`;
    requireEnginePlainObject(diagnostic, diagnosticLabel);
    normalizeRequiredString(diagnostic.code, `${diagnosticLabel} code`);
    if (!DIAGNOSTIC_SEVERITIES.includes(diagnostic.severity)) {
      throw new Error(`${diagnosticLabel} severity is invalid`);
    }
    assertEnginePortableValue(diagnostic, diagnosticLabel);
  });
}

function validateUniqueStringArray(value, label) {
  validateEngineDenseArray(value, label);
  value.forEach((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
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

function normalizeStatus(value, label) {
  if (!RESULT_STATUSES.includes(value)) {
    throw new Error(`${label} is invalid`);
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
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
  }
  return value;
}

function normalizeNullableFiniteNumber(value, label) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${label} must be a finite number or null`);
  }
  return value;
}
