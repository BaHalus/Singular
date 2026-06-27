import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeSkills } from "../../domain/character/Skills.js";
import { serializeTechniques } from "../../domain/character/Techniques.js";
import {
  addSkill,
  addTechnique,
  findSkillById,
  findTechniqueById,
  removeSkill,
  removeTechnique,
  reorderSkill,
  reorderTechnique,
  updateSkill,
  updateTechnique,
} from "../../domain/character/SkillsOperations.js";

export const SKILL_COMMAND_TYPES = Object.freeze({
  ADD_SKILL: "skill.add",
  UPDATE_SKILL: "skill.update",
  REMOVE_SKILL: "skill.remove",
  REORDER_SKILL: "skill.reorder",
  ADD_TECHNIQUE: "technique.add",
  UPDATE_TECHNIQUE: "technique.update",
  REMOVE_TECHNIQUE: "technique.remove",
  REORDER_TECHNIQUE: "technique.reorder",
});

export function createSkillCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: SKILL_COMMAND_TYPES.ADD_SKILL,
      handler: handleAddSkillCommand,
    }),
    Object.freeze({
      type: SKILL_COMMAND_TYPES.UPDATE_SKILL,
      handler: handleUpdateSkillCommand,
    }),
    Object.freeze({
      type: SKILL_COMMAND_TYPES.REMOVE_SKILL,
      handler: handleRemoveSkillCommand,
    }),
    Object.freeze({
      type: SKILL_COMMAND_TYPES.REORDER_SKILL,
      handler: handleReorderSkillCommand,
    }),
    Object.freeze({
      type: SKILL_COMMAND_TYPES.ADD_TECHNIQUE,
      handler: handleAddTechniqueCommand,
    }),
    Object.freeze({
      type: SKILL_COMMAND_TYPES.UPDATE_TECHNIQUE,
      handler: handleUpdateTechniqueCommand,
    }),
    Object.freeze({
      type: SKILL_COMMAND_TYPES.REMOVE_TECHNIQUE,
      handler: handleRemoveTechniqueCommand,
    }),
    Object.freeze({
      type: SKILL_COMMAND_TYPES.REORDER_TECHNIQUE,
      handler: handleReorderTechniqueCommand,
    }),
  ]);
}

export function handleAddSkillCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.ADD_SKILL,
  );
  validateExactPayloadKeys(command.payload, ["skill"]);
  const nextSkills = addSkill(session.character.skills, command.payload.skill);
  const added = nextSkills.at(-1);

  return appliedResult(session.character, { skills: nextSkills }, {
    operation: "add-skill",
    skillId: added.id,
    index: nextSkills.length - 1,
  });
}

export function handleUpdateSkillCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.UPDATE_SKILL,
  );
  validateExactPayloadKeys(command.payload, ["skillId", "patch"]);
  const skillId = normalizeEntityId(command.payload.skillId, "Skill command skillId must be a non-empty string");
  const previous = findSkillById(session.character.skills, skillId);
  const nextSkills = updateSkill(
    session.character.skills,
    skillId,
    command.payload.patch,
  );
  const current = findSkillById(nextSkills, skillId);

  if (portableEqual(previous, current)) {
    return noOpResult("update-skill-no-op", { skillId }, "unchanged-skill");
  }

  return appliedResult(session.character, { skills: nextSkills }, {
    operation: "update-skill",
    skillId,
    index: nextSkills.findIndex(skill => skill.id === skillId),
  });
}

export function handleRemoveSkillCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.REMOVE_SKILL,
  );
  validateExactPayloadKeys(command.payload, ["skillId"]);
  const skillId = normalizeEntityId(command.payload.skillId, "Skill command skillId must be a non-empty string");
  const previous = findSkillById(session.character.skills, skillId);
  const previousIndex = session.character.skills.findIndex(skill => skill.id === skillId);
  const nextSkills = removeSkill(session.character.skills, skillId);

  return appliedResult(session.character, { skills: nextSkills }, {
    operation: "remove-skill",
    skillId,
    name: previous.name,
    previousIndex,
  });
}

export function handleReorderSkillCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.REORDER_SKILL,
  );
  validateExactPayloadKeys(command.payload, ["skillId", "targetIndex"]);
  const skillId = normalizeEntityId(command.payload.skillId, "Skill command skillId must be a non-empty string");
  const previousIndex = session.character.skills.findIndex(skill => skill.id === skillId);
  const nextSkills = reorderSkill(
    session.character.skills,
    skillId,
    command.payload.targetIndex,
  );

  if (nextSkills === session.character.skills) {
    return noOpResult("reorder-skill-no-op", { skillId }, "already-at-index");
  }

  return appliedResult(session.character, { skills: nextSkills }, {
    operation: "reorder-skill",
    skillId,
    previousIndex,
    targetIndex: command.payload.targetIndex,
  });
}

export function handleAddTechniqueCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.ADD_TECHNIQUE,
  );
  validateExactPayloadKeys(command.payload, ["technique"]);
  const nextTechniques = addTechnique(
    session.character.techniques,
    command.payload.technique,
  );
  const added = nextTechniques.at(-1);

  return appliedResult(session.character, { techniques: nextTechniques }, {
    operation: "add-technique",
    techniqueId: added.id,
    skillId: added.skillId,
    index: nextTechniques.length - 1,
  });
}

export function handleUpdateTechniqueCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.UPDATE_TECHNIQUE,
  );
  validateExactPayloadKeys(command.payload, ["techniqueId", "patch"]);
  const techniqueId = normalizeEntityId(
    command.payload.techniqueId,
    "Technique command techniqueId must be a non-empty string",
  );
  const previous = findTechniqueById(session.character.techniques, techniqueId);
  const nextTechniques = updateTechnique(
    session.character.techniques,
    techniqueId,
    command.payload.patch,
  );
  const current = findTechniqueById(nextTechniques, techniqueId);

  if (portableEqual(previous, current)) {
    return noOpResult("update-technique-no-op", { techniqueId }, "unchanged-technique");
  }

  return appliedResult(session.character, { techniques: nextTechniques }, {
    operation: "update-technique",
    techniqueId,
    skillId: current.skillId,
    index: nextTechniques.findIndex(technique => technique.id === techniqueId),
  });
}

export function handleRemoveTechniqueCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.REMOVE_TECHNIQUE,
  );
  validateExactPayloadKeys(command.payload, ["techniqueId"]);
  const techniqueId = normalizeEntityId(
    command.payload.techniqueId,
    "Technique command techniqueId must be a non-empty string",
  );
  const previous = findTechniqueById(session.character.techniques, techniqueId);
  const previousIndex = session.character.techniques.findIndex(
    technique => technique.id === techniqueId,
  );
  const nextTechniques = removeTechnique(session.character.techniques, techniqueId);

  return appliedResult(session.character, { techniques: nextTechniques }, {
    operation: "remove-technique",
    techniqueId,
    name: previous.name,
    previousIndex,
  });
}

export function handleReorderTechniqueCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    SKILL_COMMAND_TYPES.REORDER_TECHNIQUE,
  );
  validateExactPayloadKeys(command.payload, ["techniqueId", "targetIndex"]);
  const techniqueId = normalizeEntityId(
    command.payload.techniqueId,
    "Technique command techniqueId must be a non-empty string",
  );
  const previousIndex = session.character.techniques.findIndex(
    technique => technique.id === techniqueId,
  );
  const nextTechniques = reorderTechnique(
    session.character.techniques,
    techniqueId,
    command.payload.targetIndex,
  );

  if (nextTechniques === session.character.techniques) {
    return noOpResult("reorder-technique-no-op", { techniqueId }, "already-at-index");
  }

  return appliedResult(session.character, { techniques: nextTechniques }, {
    operation: "reorder-technique",
    techniqueId,
    previousIndex,
    targetIndex: command.payload.targetIndex,
  });
}

function appliedResult(character, updates, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      skills: updates.skills === undefined
        ? snapshot.skills
        : serializeSkills(updates.skills),
      techniques: updates.techniques === undefined
        ? snapshot.techniques
        : serializeTechniques(updates.techniques),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, identifiers, reason) {
  return {
    status: "no-op",
    receipt: { operation, ...identifiers, reason },
    diagnostics: [],
  };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Skill command context");
  requirePlainObject(context.session, "Skill command session");
  requirePlainObject(context.command, "Skill command");

  if (context.command.type !== expectedType) {
    throw new Error(`Skill command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Skill command payload");
  requirePlainObject(context.session.character, "Skill command Character");
  if (!Array.isArray(context.session.character.skills)) {
    throw new Error("Skill command Character skills must be an array");
  }
  if (!Array.isArray(context.session.character.techniques)) {
    throw new Error("Skill command Character techniques must be an array");
  }
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Skill command payload contains unsupported properties");
  }
}

function normalizeEntityId(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
  return value;
}

function portableEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null) return false;
  if (typeof left !== "object" || typeof right !== "object") return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return left.length === right.length &&
      left.every((item, index) => portableEqual(item, right[index]));
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && portableEqual(left[key], right[key]));
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
