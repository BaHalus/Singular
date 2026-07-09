const ATTRIBUTE_KEYS = Object.freeze(["ST", "DX", "IQ", "HT", "Will", "Per"]);
const SKILL_DIFFICULTY_OFFSETS = Object.freeze({ E: 0, A: -1, H: -2, VH: -3 });
const TECHNIQUE_DIFFICULTY_FIRST_POINT_BONUS = Object.freeze({ A: 0, H: 1 });

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
  const skillByName = new Map(skillResults.map(result => [skillLookupKey(result), result]));
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
  const imported = resolveImportedLevel(skill, "skill");
  if (imported !== null) return imported;

  const attribute = normalizeText(skill.attribute);
  const difficulty = normalizeText(skill.difficulty);
  const baseLevel = resolveBaseLevel(attribute, attributes, secondaryCharacteristics);
  const difficultyOffset = SKILL_DIFFICULTY_OFFSETS[difficulty];
  const pointOffset = resolveSkillPointOffset(skill.points);
  const diagnostics = [];

  if (attribute === "" || !ATTRIBUTE_KEYS.includes(attribute)) diagnostics.push("missing-skill-attribute");
  if (difficulty === "" || difficultyOffset === undefined) diagnostics.push("missing-skill-difficulty");
  if (baseLevel === null) diagnostics.push("missing-skill-base-level");
  if (pointOffset === null) diagnostics.push("missing-skill-point-investment");

  if (diagnostics.length > 0) {
    return createBlockedResult(skill.id, "skill", diagnostics);
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
    diagnostics: Object.freeze([]),
  });
}

function resolveTechniqueMechanics(technique, { skillById, skillByName }) {
  const imported = resolveImportedLevel(technique, "technique");
  if (imported !== null) return imported;

  const baseSkill = resolveTechniqueBaseSkill(technique, { skillById, skillByName });
  const defaultPenalty = normalizeNullableNumber(technique.defaultPenalty);
  const maximumRelativeLevel = normalizeNullableNumber(technique.maximumRelativeLevel);
  const pointOffset = resolveTechniquePointOffset(technique.points, technique.difficulty);
  const diagnostics = [];

  if (baseSkill === null) diagnostics.push("missing-technique-base-skill");
  if (defaultPenalty === null) diagnostics.push("missing-technique-default-penalty");
  if (pointOffset === null) diagnostics.push("missing-technique-point-investment");

  if (diagnostics.length > 0 || baseSkill?.status !== "resolved") {
    if (baseSkill?.status === "blocked") diagnostics.push("blocked-technique-base-skill");
    return createBlockedResult(technique.id, "technique", diagnostics);
  }

  const uncappedRelativeLevel = defaultPenalty + pointOffset;
  const relativeLevel = maximumRelativeLevel === null
    ? uncappedRelativeLevel
    : Math.min(uncappedRelativeLevel, maximumRelativeLevel);

  return Object.freeze({
    id: technique.id,
    kind: "technique",
    status: "resolved",
    level: baseSkill.level + relativeLevel,
    relativeLevel,
    base: baseSkill.id,
    source: "calculated",
    diagnostics: Object.freeze([]),
  });
}

function resolveImportedLevel(item, kind) {
  const importedLevel = normalizeNullableNumber(item.importedLevel);
  if (importedLevel === null) return null;
  return Object.freeze({
    id: item.id,
    kind,
    status: "resolved",
    level: importedLevel,
    relativeLevel: normalizeNullableNumber(item.importedRelativeLevel),
    base: "imported",
    source: "imported",
    diagnostics: Object.freeze([]),
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
  return 2 + Math.floor(Math.log2(normalizedPoints / 4));
}

function resolveTechniquePointOffset(points, difficulty) {
  const normalizedPoints = normalizeNullableNumber(points);
  if (normalizedPoints === null || normalizedPoints <= 0) return null;
  const firstPointBonus = TECHNIQUE_DIFFICULTY_FIRST_POINT_BONUS[normalizeText(difficulty)];
  if (firstPointBonus === undefined) return null;
  if (normalizedPoints <= 1) return firstPointBonus;
  return firstPointBonus + Math.floor(normalizedPoints / 2);
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

function createBlockedResult(id, kind, diagnostics) {
  return Object.freeze({
    id,
    kind,
    status: "blocked",
    level: null,
    relativeLevel: null,
    base: null,
    source: "diagnostic",
    diagnostics: Object.freeze([...new Set(diagnostics)]),
  });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
