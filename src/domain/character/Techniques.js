export function createTechniques(input = []) {
  const techniques = input.map(createTechnique);

  validateTechniques(techniques);

  return techniques;
}

export function createTechnique(input = {}) {
  return {
    id: input.id ?? generateTechniqueId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    specialization: input.specialization ?? "",
    skillId: input.skillId ?? null,
    skillName: input.skillName ?? "",
    difficulty: input.difficulty ?? null,
    points: input.points ?? 0,
    importedLevel: input.importedLevel ?? null,
    notes: input.notes ?? "",
    tags: normalizeTags(input.tags),
  };
}

export function validateTechniques(techniques) {
  if (!Array.isArray(techniques)) {
    throw new Error("Techniques must be an array");
  }

  for (const technique of techniques) {
    validateTechnique(technique);
  }

  return true;
}

export function validateTechnique(technique) {
  if (!technique || typeof technique !== "object") {
    throw new Error("Technique must be an object");
  }

  if (!technique.id) {
    throw new Error("Technique must have id");
  }

  if (!isPlainObject(technique.externalIds)) {
    throw new Error("Technique externalIds must be object");
  }

  if (typeof technique.name !== "string") {
    throw new Error("Technique name must be string");
  }

  if (typeof technique.specialization !== "string") {
    throw new Error("Technique specialization must be string");
  }

  if (technique.skillId !== null && typeof technique.skillId !== "string") {
    throw new Error("Technique skillId must be string or null");
  }

  if (typeof technique.skillName !== "string") {
    throw new Error("Technique skillName must be string");
  }

  if (technique.difficulty !== null && typeof technique.difficulty !== "string") {
    throw new Error("Technique difficulty must be string or null");
  }

  if (typeof technique.points !== "number" || technique.points < 0) {
    throw new Error("Technique points must be non-negative number");
  }

  if (technique.importedLevel !== null && typeof technique.importedLevel !== "number") {
    throw new Error("Technique importedLevel must be number or null");
  }

  if (typeof technique.notes !== "string") {
    throw new Error("Technique notes must be string");
  }

  if (!Array.isArray(technique.tags)) {
    throw new Error("Technique tags must be array");
  }

  return true;
}

export function serializeTechniques(techniques) {
  validateTechniques(techniques);

  return techniques.map(technique => ({
    id: technique.id,
    externalIds: { ...technique.externalIds },
    name: technique.name,
    specialization: technique.specialization,
    skillId: technique.skillId,
    skillName: technique.skillName,
    difficulty: technique.difficulty,
    points: technique.points,
    importedLevel: technique.importedLevel,
    notes: technique.notes,
    tags: [...technique.tags],
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Technique externalIds must be object");
  }

  return { ...externalIds };
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new Error("Technique tags must be array");
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

function generateTechniqueId() {
  return `tech_${Math.random().toString(36).slice(2, 10)}`;
}
