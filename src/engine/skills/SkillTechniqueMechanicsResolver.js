const ATTRIBUTE_KEYS = Object.freeze(["ST", "DX", "IQ", "HT", "Will", "Per"]);
const SKILL_DIFFICULTY_OFFSETS = Object.freeze({ E: 0, A: -1, H: -2, VH: -3 });

export function resolveSkillTechniqueMechanics({
  attributes = {},
  secondaryCharacteristics = {},
  skills = [],
  techniques = [],
} = {}) {
  const skillResults = skills.map(skill => resolveSkillMechanics(skill, {
    attributes,
    secondaryCharacteristics,
  }));
  const skillById = new Map(skillResults.map(result => [result.id, result]));
  const skillByName = new Map(skills.map((skill, index) => [skillLookupKey(skill), skillResults[index]]));
  const techniqueResults = techniques.map(technique => resolveTechniqueMechanics(technique, {
    skillById,
    skillByName,
  }));

  return Object.freeze({
    authority: "engine.skills-techniques",
    skills: Object.freeze(skillResults),
    techniques: Object.freeze(techniqueResults),
  });
}

export function serializeSkillTechniqueMechanicsReport(report) {
  return JSON.parse(JSON.stringify(report));
}

function resolveSkillMechanics(skill, { attributes, secondaryCharacteristics }) {
  const attribute = normalizeText(skill.attribute);
  const difficulty = normalizeText(skill.difficulty);
  const baseLevel = resolveBaseLevel(attribute, attributes, secondaryCharacteristics);
  const difficultyOffset = SKILL_DIFFICULTY_OFFSETS[difficulty];
  const pointOffset = resolveSkillPointOffset(skill.points);
  const importedLevel = normalizeNullableNumber(skill.importedLevel);
  const importedRelativeLevel = normalizeNullableNumber(skill.importedRelativeLevel);
  const diagnostics = [];

  if (attribute === "" || !ATTRIBUTE_KEYS.includes(attribute)) diagnostics.push("missing-skill-attribute");
  if (difficulty === "" || difficultyOffset === undefined) diagnostics.push("missing-skill-difficulty");
  if (baseLevel === null) diagnostics.push("missing-skill-base-level");
  if (pointOffset === null) diagnostics.push("missing-skill-point-investment");

  if (diagnostics.length > 0) {
    return createBlockedResult(skill.id, "skill", diagnostics, {
      importedLevel,
      importedRelativeLevel,
    });
  }

  const relativeLevel = difficultyOffset + pointOffset;
  return Object.freeze({
    id: skill.id,
    kind: "skill",
    status: "resolved",
    level: baseLevel + relativeLevel,
    relativeLevel,
    base: attribute,
    source: "calculated",
    importedLevel,
    importedRelativeLevel,
    diagnostics: Object.freeze(createImportedDiagnostics({
      level: baseLevel + relativeLevel,
      relativeLevel,
      importedLevel,
      importedRelativeLevel,
      kind: "skill",
    })),
  });
}

function resolveTechniqueMechanics(technique, { skillById, skillByName }) {
  const baseSkill = resolveTechniqueBaseSkill(technique, { skillById, skillByName });
  const defaultPenalty = normalizeNullableNumber(technique.defaultPenalty);
  const maximumRelativeLevel = normalizeNullableNumber(technique.maximumRelativeLevel);
  const pointOffset = resolveTechniquePointOffset(technique.points, technique.difficulty);
  const importedLevel = normalizeNullableNumber(technique.importedLevel);
  const importedRelativeLevel = normalizeNullableNumber(technique.importedRelativeLevel);
  const diagnostics = [];

  if (baseSkill === null) diagnostics.push("missing-technique-base-skill");
  if (defaultPenalty === null) diagnostics.push("missing-technique-default-penalty");
  if (pointOffset === null) diagnostics.push("missing-technique-point-investment");

  if (diagnostics.length > 0 || baseSkill?.status !== "resolved") {
    if (baseSkill?.status === "blocked") diagnostics.push("blocked-technique-base-skill");
    return createBlockedResult(technique.id, "technique", diagnostics, {
      importedLevel,
      importedRelativeLevel,
    });
  }

  const uncappedRelativeLevel = defaultPenalty + pointOffset;
  const relativeLevel = maximumRelativeLevel === null
    ? uncappedRelativeLevel
    : Math.min(uncappedRelativeLevel, maximumRelativeLevel);
  const level = baseSkill.level + relativeLevel;

  return Object.freeze({
    id: technique.id,
    kind: "technique",
    status: "resolved",
    level,
    relativeLevel,
    base: baseSkill.id,
    source: "calculated",
    importedLevel,
    importedRelativeLevel,
    diagnostics: Object.freeze(createImportedDiagnostics({
      level,
      relativeLevel,
      importedLevel,
      importedRelativeLevel,
      kind: "technique",
    })),
  });
}

function resolveBaseLevel(attribute, attributes, secondaryCharacteristics) {
  if (["ST", "DX", "IQ", "HT"].includes(attribute)) {
    return normalizeNullableNumber(attributes?.[attribute]?.level ?? attributes?.[attribute]?.value ?? attributes?.[attribute]);
  }
  if (["Will", "Per"].includes(attribute)) {
    const characteristic = secondaryCharacteristics?.[attribute];
    if (characteristic === undefined) return null;
    const override = normalizeNullableNumber(characteristic.override);
    if (override !== null) return override;
    return normalizeNullableNumber(characteristic.base ?? characteristic.value ?? characteristic);
  }
  return null;
}

function resolveSkillPointOffset(points) {
  const normalizedPoints = normalizeNullableNumber(points);
  if (normalizedPoints === null || normalizedPoints <= 0) return null;
  if (normalizedPoints <= 1) return 0;
  if (normalizedPoints <= 2) return 1;
  if (normalizedPoints <= 4) return 2;
  return 2 + Math.floor((normalizedPoints - 4) / 4);
}

function resolveTechniquePointOffset(points, difficulty) {
  const normalizedPoints = normalizeNullableNumber(points);
  if (normalizedPoints === null || normalizedPoints < 0) return null;

  switch (normalizeText(difficulty)) {
    case "A":
      return Math.floor(normalizedPoints);
    case "H":
      if (normalizedPoints === 1) return null;
      if (normalizedPoints === 0) return 0;
      return Math.floor(normalizedPoints) - 1;
    default:
      return null;
  }
}

function resolveTechniqueBaseSkill(technique, { skillById, skillByName }) {
  if (normalizeText(technique.skillId) !== "") {
    return skillById.get(technique.skillId) ?? null;
  }
  return skillByName.get(skillLookupKey({
    name: technique.skillName,
    specialization: technique.skillSpecialization,
  })) ?? null;
}

function skillLookupKey(skill) {
  return `${normalizeText(skill.name).toLocaleLowerCase("pt-BR")}::${normalizeText(skill.specialization).toLocaleLowerCase("pt-BR")}`;
}

function createBlockedResult(id, kind, diagnostics, imported = {}) {
  return Object.freeze({
    id,
    kind,
    status: "blocked",
    level: null,
    relativeLevel: null,
    base: null,
    source: "diagnostic",
    importedLevel: imported.importedLevel ?? null,
    importedRelativeLevel: imported.importedRelativeLevel ?? null,
    diagnostics: Object.freeze([...new Set(diagnostics)]),
  });
}

function createImportedDiagnostics({
  level,
  relativeLevel,
  importedLevel,
  importedRelativeLevel,
  kind,
}) {
  const diagnostics = [];
  if (importedLevel !== null && importedLevel !== level) diagnostics.push(`imported-${kind}-level-differs`);
  if (importedRelativeLevel !== null && importedRelativeLevel !== relativeLevel) {
    diagnostics.push(`imported-${kind}-relative-level-differs`);
  }
  return diagnostics;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
