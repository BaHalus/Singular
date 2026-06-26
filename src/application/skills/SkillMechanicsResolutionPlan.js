import {
  serializeSkills,
  validateSkills,
} from "../../domain/character/Skills.js";
import {
  serializeTechniques,
  validateTechniques,
} from "../../domain/character/Techniques.js";
import {
  getAttributeLevelKeys,
  serializeAttributeLevelsReport,
  validateAttributeLevelsReport,
} from "../../engine/attributes/AttributeLevelResolver.js";
import {
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  requireEnginePlainObject,
  validateEngineDenseArray,
} from "../../engine/EnginePortableValue.js";
import {
  serializeSkillDefaultCandidate,
  validateSkillDefaultCandidate,
} from "../../engine/skills/SkillDefaultCandidate.js";

const SKILL_MECHANICS_RESOLUTION_PLAN_SCHEMA_VERSION = 1;
const PLAN_KEYS = Object.freeze([
  "schemaVersion",
  "characterId",
  "attributeLevels",
  "skills",
  "techniques",
  "defaultCandidates",
]);

export function createSkillMechanicsResolutionPlan(input = {}) {
  requireEnginePlainObject(input, "Skill mechanics resolution plan input");

  const skills = normalizeSkills(input.skills);
  const techniques = normalizeTechniques(input.techniques);
  const defaultCandidates = normalizeDefaultCandidates(input.defaultCandidates);

  const portablePlan = cloneEnginePortableValue({
    schemaVersion: normalizeSchemaVersion(input.schemaVersion),
    characterId: normalizeRequiredString(
      input.characterId,
      "Skill mechanics resolution plan characterId",
    ),
    attributeLevels: serializeAttributeLevelsReport(input.attributeLevels),
    skills: serializeSkills(skills),
    techniques: serializeTechniques(techniques),
    defaultCandidates: defaultCandidates.map(serializeSkillDefaultCandidate),
  }, "Skill mechanics resolution plan");

  validateSkillMechanicsResolutionPlan(portablePlan);
  return deepFreezeEngineValue(portablePlan);
}

export function validateSkillMechanicsResolutionPlan(plan) {
  requireEnginePlainObject(plan, "Skill mechanics resolution plan");
  validateExactKeys(
    plan,
    PLAN_KEYS,
    "Skill mechanics resolution plan",
  );

  normalizeSchemaVersion(plan.schemaVersion);
  normalizeRequiredString(
    plan.characterId,
    "Skill mechanics resolution plan characterId",
  );
  validateAttributeLevelsReport(plan.attributeLevels);

  validateEngineDenseArray(plan.skills, "Skill mechanics resolution plan skills");
  validateSkills(plan.skills);
  validateEngineDenseArray(
    plan.techniques,
    "Skill mechanics resolution plan techniques",
  );
  validateTechniques(plan.techniques);
  validateEngineDenseArray(
    plan.defaultCandidates,
    "Skill mechanics resolution plan defaultCandidates",
  );
  plan.defaultCandidates.forEach(validateSkillDefaultCandidate);

  const skillIds = collectUniqueEntityIds(
    plan.skills,
    "Skill mechanics resolution plan skills",
  );
  collectUniqueEntityIds(
    plan.techniques,
    "Skill mechanics resolution plan techniques",
  );
  validateDefaultCandidateReferences(plan.defaultCandidates, skillIds);

  cloneEnginePortableValue(plan, "Skill mechanics resolution plan");
  return true;
}

export function serializeSkillMechanicsResolutionPlan(plan) {
  validateSkillMechanicsResolutionPlan(plan);
  return cloneEnginePortableValue(plan, "Skill mechanics resolution plan");
}

export function getSkillMechanicsResolutionPlanSchemaVersion() {
  return SKILL_MECHANICS_RESOLUTION_PLAN_SCHEMA_VERSION;
}

function normalizeSkills(value) {
  const skills = normalizeDenseArray(
    value,
    "Skill mechanics resolution plan input skills",
  );
  validateSkills(skills);
  return skills;
}

function normalizeTechniques(value) {
  const techniques = normalizeDenseArray(
    value,
    "Skill mechanics resolution plan input techniques",
  );
  validateTechniques(techniques);
  return techniques;
}

function normalizeDefaultCandidates(value) {
  const candidates = normalizeDenseArray(
    value,
    "Skill mechanics resolution plan input defaultCandidates",
  );
  candidates.forEach(validateSkillDefaultCandidate);
  return candidates;
}

function normalizeDenseArray(value, label) {
  const normalized = value ?? [];
  validateEngineDenseArray(normalized, label);
  return normalized;
}

function collectUniqueEntityIds(entities, label) {
  const ids = new Set();

  entities.forEach((entity, index) => {
    const id = normalizeRequiredString(entity.id, `${label}[${index}] id`);
    if (ids.has(id)) {
      throw new Error(`${label} must not repeat id: ${id}`);
    }
    ids.add(id);
  });

  return ids;
}

function validateDefaultCandidateReferences(candidates, skillIds) {
  const candidateIds = new Set();
  const attributeKeys = new Set(getAttributeLevelKeys());

  candidates.forEach((candidate, index) => {
    const label =
      `Skill mechanics resolution plan defaultCandidates[${index}]`;

    if (candidateIds.has(candidate.id)) {
      throw new Error(
        "Skill mechanics resolution plan defaultCandidates must not repeat id: " +
        candidate.id,
      );
    }
    candidateIds.add(candidate.id);

    if (!skillIds.has(candidate.targetSkillId)) {
      throw new Error(`${label} targetSkillId must reference an existing Skill`);
    }

    if (candidate.sourceType === "skill") {
      if (!skillIds.has(candidate.sourceId)) {
        throw new Error(`${label} sourceId must reference an existing Skill`);
      }
      return;
    }

    if (!attributeKeys.has(candidate.attribute)) {
      throw new Error(
        `${label} attribute must reference ST, DX, IQ or HT`,
      );
    }
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

function normalizeSchemaVersion(value) {
  const normalized =
    value ?? SKILL_MECHANICS_RESOLUTION_PLAN_SCHEMA_VERSION;
  if (normalized !== SKILL_MECHANICS_RESOLUTION_PLAN_SCHEMA_VERSION) {
    throw new Error(
      "Skill mechanics resolution plan schemaVersion is unsupported",
    );
  }
  return normalized;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}
