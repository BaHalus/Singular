export function createSkills(input = []) {
  const skills = input.map(createSkill);

  validateSkills(skills);

  return skills;
}

export function createSkill(input = {}) {
  return {
    id: input.id ?? generateSkillId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    specialization: input.specialization ?? "",
    attribute: input.attribute ?? null,
    difficulty: input.difficulty ?? null,
    points: input.points ?? 0,
    importedLevel: input.importedLevel ?? null,
    notes: input.notes ?? "",
    tags: normalizeTags(input.tags),
  };
}

export function validateSkills(skills) {
  if (!Array.isArray(skills)) {
    throw new Error("Skills must be an array");
  }

  for (const skill of skills) {
    validateSkill(skill);
  }

  return true;
}

export function validateSkill(skill) {
  if (!skill || typeof skill !== "object") {
    throw new Error("Skill must be an object");
  }

  if (!skill.id) {
    throw new Error("Skill must have id");
  }

  if (!isPlainObject(skill.externalIds)) {
    throw new Error("Skill externalIds must be object");
  }

  if (typeof skill.name !== "string") {
    throw new Error("Skill name must be string");
  }

  if (typeof skill.specialization !== "string") {
    throw new Error("Skill specialization must be string");
  }

  if (skill.attribute !== null && typeof skill.attribute !== "string") {
    throw new Error("Skill attribute must be string or null");
  }

  if (skill.difficulty !== null && typeof skill.difficulty !== "string") {
    throw new Error("Skill difficulty must be string or null");
  }

  if (typeof skill.points !== "number" || skill.points < 0) {
    throw new Error("Skill points must be non-negative number");
  }

  if (skill.importedLevel !== null && typeof skill.importedLevel !== "number") {
    throw new Error("Skill importedLevel must be number or null");
  }

  if (typeof skill.notes !== "string") {
    throw new Error("Skill notes must be string");
  }

  if (!Array.isArray(skill.tags)) {
    throw new Error("Skill tags must be array");
  }

  return true;
}

export function serializeSkills(skills) {
  validateSkills(skills);

  return skills.map(skill => ({
    id: skill.id,
    externalIds: { ...skill.externalIds },
    name: skill.name,
    specialization: skill.specialization,
    attribute: skill.attribute,
    difficulty: skill.difficulty,
    points: skill.points,
    importedLevel: skill.importedLevel,
    notes: skill.notes,
    tags: [...skill.tags],
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Skill externalIds must be object");
  }

  return { ...externalIds };
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new Error("Skill tags must be array");
  }

  return [...tags];
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function generateSkillId() {
  return `skill_${Math.random().toString(36).slice(2, 10)}`;
}
