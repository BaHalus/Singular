export function createTechniques(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Techniques must be an array");
  }

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
    skillSpecialization: input.skillSpecialization ?? "",

    difficulty: input.difficulty ?? null,
    points: input.points ?? 0,

    importedLevel: input.importedLevel ?? null,
    importedRelativeLevel: input.importedRelativeLevel ?? null,
    defaultPenalty: input.defaultPenalty ?? null,
    maximumRelativeLevel: input.maximumRelativeLevel ?? null,

    defaults: normalizeArray(input.defaults, "Technique defaults must be array"),
    features: normalizeArray(input.features, "Technique features must be array"),
    prereqs: input.prereqs ?? null,

    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Technique tags must be array"),

    importMeta: input.importMeta ?? null,
    raw: input.raw ?? null,
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

  if (typeof technique.skillSpecialization !== "string") {
    throw new Error("Technique skillSpecialization must be string");
  }

  if (technique.difficulty !== null && typeof technique.difficulty !== "string") {
    throw new Error("Technique difficulty must be string or null");
  }

  if (typeof technique.points !== "number" || technique.points < 0) {
    throw new Error("Technique points must be non-negative number");
  }

  validateNullableNumber(
    technique.importedLevel,
    "Technique importedLevel must be number or null",
  );
  validateNullableNumber(
    technique.importedRelativeLevel,
    "Technique importedRelativeLevel must be number or null",
  );
  validateNullableNumber(
    technique.defaultPenalty,
    "Technique defaultPenalty must be number or null",
  );
  validateNullableNumber(
    technique.maximumRelativeLevel,
    "Technique maximumRelativeLevel must be number or null",
  );

  if (!Array.isArray(technique.defaults)) {
    throw new Error("Technique defaults must be array");
  }

  if (!Array.isArray(technique.features)) {
    throw new Error("Technique features must be array");
  }

  if (technique.prereqs !== null && !isPlainObject(technique.prereqs)) {
    throw new Error("Technique prereqs must be object or null");
  }

  if (typeof technique.notes !== "string") {
    throw new Error("Technique notes must be string");
  }

  if (!Array.isArray(technique.tags)) {
    throw new Error("Technique tags must be array");
  }

  if (technique.importMeta !== null && !isPlainObject(technique.importMeta)) {
    throw new Error("Technique importMeta must be object or null");
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
    skillSpecialization: technique.skillSpecialization,

    difficulty: technique.difficulty,
    points: technique.points,

    importedLevel: technique.importedLevel,
    importedRelativeLevel: technique.importedRelativeLevel,
    defaultPenalty: technique.defaultPenalty,
    maximumRelativeLevel: technique.maximumRelativeLevel,

    defaults: [...technique.defaults],
    features: [...technique.features],
    prereqs: technique.prereqs,

    notes: technique.notes,
    tags: [...technique.tags],

    importMeta: technique.importMeta,
    raw: technique.raw,
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

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function validateNullableNumber(value, errorMessage) {
  if (value !== null && (typeof value !== "number" || Number.isNaN(value))) {
    throw new Error(errorMessage);
  }
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
