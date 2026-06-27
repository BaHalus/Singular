import {
  createSkill,
  createSkills,
  serializeSkills,
  validateSkills,
} from "./Skills.js";
import {
  createTechnique,
  createTechniques,
  serializeTechniques,
  validateTechniques,
} from "./Techniques.js";

const SKILL_PATCH_KEYS = Object.freeze([
  "externalIds",
  "name",
  "specialization",
  "techLevel",
  "attribute",
  "difficulty",
  "points",
  "importedLevel",
  "importedRelativeLevel",
  "defaults",
  "features",
  "weapons",
  "prereqs",
  "notes",
  "tags",
  "importMeta",
  "raw",
]);

const TECHNIQUE_PATCH_KEYS = Object.freeze([
  "externalIds",
  "name",
  "specialization",
  "skillId",
  "skillName",
  "skillSpecialization",
  "difficulty",
  "points",
  "importedLevel",
  "importedRelativeLevel",
  "defaultPenalty",
  "maximumRelativeLevel",
  "defaults",
  "features",
  "prereqs",
  "notes",
  "tags",
  "importMeta",
  "raw",
]);

export function addSkill(skills, skillInput) {
  validateSkills(skills);
  return createSkills([
    ...serializeSkills(skills),
    clonePortableValue(skillInput),
  ]);
}

export function updateSkill(skills, skillId, patch = {}) {
  validateSkills(skills);
  const normalizedId = requireEntityId(skillId, "Skill id must be a non-empty string");
  requirePlainObject(patch, "Skill patch must be an object");
  assertPatchKeys(patch, SKILL_PATCH_KEYS, "Skill patch has unsupported fields");

  const currentIndex = skills.findIndex(skill => skill.id === normalizedId);
  if (currentIndex < 0) throw new Error("Skill not found");

  const current = skills[currentIndex];
  const nextInput = {
    ...serializeSkill(current),
    ...clonePortableValue(patch),
    id: current.id,
    externalIds: patch.externalIds === undefined
      ? { ...current.externalIds }
      : { ...current.externalIds, ...clonePortableValue(patch.externalIds) },
  };
  const nextSkill = createSkill(nextInput);
  const next = serializeSkills(skills);
  next[currentIndex] = serializeSkill(nextSkill);
  return createSkills(next);
}

export function removeSkill(skills, skillId) {
  validateSkills(skills);
  const normalizedId = requireEntityId(skillId, "Skill id must be a non-empty string");
  const currentIndex = skills.findIndex(skill => skill.id === normalizedId);
  if (currentIndex < 0) throw new Error("Skill not found");
  return createSkills(
    serializeSkills(skills).filter(skill => skill.id !== normalizedId),
  );
}

export function reorderSkill(skills, skillId, targetIndex) {
  validateSkills(skills);
  const normalizedId = requireEntityId(skillId, "Skill id must be a non-empty string");
  validateTargetIndex(targetIndex, skills.length, "Skill target index is invalid");

  const currentIndex = skills.findIndex(skill => skill.id === normalizedId);
  if (currentIndex < 0) throw new Error("Skill not found");
  if (currentIndex === targetIndex) return skills;

  const next = serializeSkills(skills);
  const [skill] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, skill);
  return createSkills(next);
}

export function findSkillById(skills, skillId) {
  validateSkills(skills);
  const normalizedId = requireEntityId(skillId, "Skill id must be a non-empty string");
  return skills.find(skill => skill.id === normalizedId) ?? null;
}

export function renameSkill(skills, skillId, name) {
  return updateSkill(skills, skillId, { name });
}

export function updateSkillNotes(skills, skillId, notes) {
  return updateSkill(skills, skillId, { notes });
}

export function setSkillSpecialization(skills, skillId, specialization) {
  return updateSkill(skills, skillId, { specialization });
}

export function setSkillBase(skills, skillId, attribute, difficulty) {
  return updateSkill(skills, skillId, { attribute, difficulty });
}

export function setSkillPoints(skills, skillId, points) {
  return updateSkill(skills, skillId, { points });
}

export function setSkillImportedLevel(skills, skillId, importedLevel) {
  return updateSkill(skills, skillId, { importedLevel });
}

export function addSkillTag(skills, skillId, tag) {
  const skill = findSkillById(skills, skillId);
  if (skill.tags.includes(tag)) return skills;
  return updateSkill(skills, skillId, { tags: [...skill.tags, tag] });
}

export function removeSkillTag(skills, skillId, tag) {
  const skill = findSkillById(skills, skillId);
  return updateSkill(skills, skillId, {
    tags: skill.tags.filter(currentTag => currentTag !== tag),
  });
}

export function addTechnique(techniques, techniqueInput) {
  validateTechniques(techniques);
  return createTechniques([
    ...serializeTechniques(techniques),
    clonePortableValue(techniqueInput),
  ]);
}

export function updateTechnique(techniques, techniqueId, patch = {}) {
  validateTechniques(techniques);
  const normalizedId = requireEntityId(
    techniqueId,
    "Technique id must be a non-empty string",
  );
  requirePlainObject(patch, "Technique patch must be an object");
  assertPatchKeys(
    patch,
    TECHNIQUE_PATCH_KEYS,
    "Technique patch has unsupported fields",
  );

  const currentIndex = techniques.findIndex(technique => technique.id === normalizedId);
  if (currentIndex < 0) throw new Error("Technique not found");

  const current = techniques[currentIndex];
  const nextInput = {
    ...serializeTechnique(current),
    ...clonePortableValue(patch),
    id: current.id,
    externalIds: patch.externalIds === undefined
      ? { ...current.externalIds }
      : { ...current.externalIds, ...clonePortableValue(patch.externalIds) },
  };
  const nextTechnique = createTechnique(nextInput);
  const next = serializeTechniques(techniques);
  next[currentIndex] = serializeTechnique(nextTechnique);
  return createTechniques(next);
}

export function removeTechnique(techniques, techniqueId) {
  validateTechniques(techniques);
  const normalizedId = requireEntityId(
    techniqueId,
    "Technique id must be a non-empty string",
  );
  const currentIndex = techniques.findIndex(technique => technique.id === normalizedId);
  if (currentIndex < 0) throw new Error("Technique not found");
  return createTechniques(
    serializeTechniques(techniques)
      .filter(technique => technique.id !== normalizedId),
  );
}

export function reorderTechnique(techniques, techniqueId, targetIndex) {
  validateTechniques(techniques);
  const normalizedId = requireEntityId(
    techniqueId,
    "Technique id must be a non-empty string",
  );
  validateTargetIndex(targetIndex, techniques.length, "Technique target index is invalid");

  const currentIndex = techniques.findIndex(technique => technique.id === normalizedId);
  if (currentIndex < 0) throw new Error("Technique not found");
  if (currentIndex === targetIndex) return techniques;

  const next = serializeTechniques(techniques);
  const [technique] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, technique);
  return createTechniques(next);
}

export function findTechniqueById(techniques, techniqueId) {
  validateTechniques(techniques);
  const normalizedId = requireEntityId(
    techniqueId,
    "Technique id must be a non-empty string",
  );
  return techniques.find(technique => technique.id === normalizedId) ?? null;
}

function serializeSkill(skill) {
  return serializeSkills([skill])[0];
}

function serializeTechnique(technique) {
  return serializeTechniques([technique])[0];
}

function requireEntityId(value, errorMessage) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(errorMessage);
  }
  return value;
}

function validateTargetIndex(targetIndex, length, errorMessage) {
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= length) {
    throw new Error(errorMessage);
  }
}

function assertPatchKeys(patch, allowedKeys, errorMessage) {
  const allowed = new Set(allowedKeys);
  if (Object.keys(patch).some(key => !allowed.has(key))) {
    throw new Error(errorMessage);
  }
  if (patch.externalIds !== undefined) {
    requirePlainObject(patch.externalIds, "externalIds patch must be an object");
  }
}

function clonePortableValue(value, seen = new WeakMap()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Skill operation values must be JSON portable");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error("Skill operation values must be JSON portable");
  }
  if (seen.has(value)) throw new Error("Skill operation values must not contain cycles");

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(clonePortableValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  requirePlainObject(value, "Skill operation value");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = clonePortableValue(item, seen);
  });
  seen.delete(value);
  return clone;
}

function requirePlainObject(value, errorMessage) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(errorMessage);
  }
}
