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
    techLevel: input.techLevel ?? null,

    attribute: input.attribute ?? null,
    difficulty: input.difficulty ?? null,
    points: input.points ?? 0,

    importedLevel: input.importedLevel ?? null,
    importedRelativeLevel: input.importedRelativeLevel ?? null,

    defaults: normalizeArray(input.defaults, "Skill defaults must be array"),
    features: normalizeArray(input.features, "Skill features must be array"),
    weapons: normalizeArray(input.weapons, "Skill weapons must be array"),
    prereqs: input.prereqs ?? null,

    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Skill tags must be array"),

    importMeta: input.importMeta ?? null,
    raw: input.raw ?? null,
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

  if (skill.techLevel !== null && typeof skill.techLevel !== "string") {
    throw new Error("Skill techLevel must be string or null");
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

  if (
    skill.importedLevel !== null &&
    (typeof skill.importedLevel !== "number" || Number.isNaN(skill.importedLevel))
  ) {
    throw new Error("Skill importedLevel must be number or null");
  }

  if (
    skill.importedRelativeLevel !== null &&
    (
      typeof skill.importedRelativeLevel !== "number" ||
      Number.isNaN(skill.importedRelativeLevel)
    )
  ) {
    throw new Error("Skill importedRelativeLevel must be number or null");
  }

  if (!Array.isArray(skill.defaults)) {
    throw new Error("Skill defaults must be array");
  }

  if (!Array.isArray(skill.features)) {
    throw new Error("Skill features must be array");
  }

  if (!Array.isArray(skill.weapons)) {
    throw new Error("Skill weapons must be array");
  }

  if (skill.prereqs !== null && !isPlainObject(skill.prereqs)) {
    throw new Error("Skill prereqs must be object or null");
  }

  if (typeof skill.notes !== "string") {
    throw new Error("Skill notes must be string");
  }

  if (!Array.isArray(skill.tags)) {
    throw new Error("Skill tags must be array");
  }

  if (skill.importMeta !== null && !isPlainObject(skill.importMeta)) {
    throw new Error("Skill importMeta must be object or null");
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
    techLevel: skill.techLevel,

    attribute: skill.attribute,
    difficulty: skill.difficulty,
    points: skill.points,

    importedLevel: skill.importedLevel,
    importedRelativeLevel: skill.importedRelativeLevel,

    defaults: [...skill.defaults],
    features: [...skill.features],
    weapons: [...skill.weapons],
    prereqs: skill.prereqs,

    notes: skill.notes,
    tags: [...skill.tags],

    importMeta: skill.importMeta,
    raw: skill.raw,
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

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
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
