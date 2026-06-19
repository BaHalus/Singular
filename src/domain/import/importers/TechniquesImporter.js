export function importTechniques(source = [], skills = []) {
  const nodes = readTechniqueNodes(source);
  const result = {
    techniques: [],
    unresolvedLinks: [],
  };

  for (const node of nodes) {
    const link = resolveParentSkill(node, skills);
    const technique = mapTechnique(node, link);

    result.techniques.push(technique);

    if (!link.skill) {
      result.unresolvedLinks.push({
        techniqueId: technique.id,
        requestedSkillId: link.requestedSkillId,
        requestedSkillName: link.requestedSkillName,
        requestedSkillSpecialization: link.requestedSkillSpecialization,
        reason: link.reason,
        raw: node.raw ?? node,
      });
    }
  }

  return result;
}

function readTechniqueNodes(source) {
  if (Array.isArray(source)) {
    return source;
  }

  if (!source || typeof source !== "object") {
    throw new Error("GCS techniques source must be array or object");
  }

  if (Array.isArray(source.techniques)) return source.techniques;
  if (Array.isArray(source.techniqueNodes)) return source.techniqueNodes;
  if (Array.isArray(source.technique_nodes)) return source.technique_nodes;

  return [];
}

function mapTechnique(node, link) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new Error("GCS technique node must be object");
  }

  const raw = node.raw ?? node;
  const defaults = normalizeArray(
    node.defaults ?? raw.defaults,
    "GCS technique defaults must be array",
  );
  const defaultSkill = findDefaultSkill(defaults, raw.default);

  return {
    id: node.id ?? raw.id ?? raw.uuid ?? generateTechniqueId(),
    externalIds: createExternalIds(node, raw),

    name: node.name ?? raw.name ?? raw.description ?? "",
    specialization:
      node.specialization ??
      raw.specialization ??
      raw.specialty ??
      "",

    skillId: link.skill?.id ?? null,
    skillName: link.skill?.name ?? link.requestedSkillName ?? "",
    skillSpecialization:
      link.skill?.specialization ??
      link.requestedSkillSpecialization ??
      "",

    difficulty: normalizeDifficulty(
      node.difficulty ?? raw.difficulty,
    ),
    points: normalizeNonNegativeNumber(
      node.points ?? raw.points,
      0,
    ),

    importedLevel: normalizeNullableNumber(
      node.importedLevel ??
      raw.importedLevel ??
      raw.level ??
      raw.calc?.level ??
      raw.calc?.skill_level,
    ),
    importedRelativeLevel: normalizeNullableNumber(
      node.importedRelativeLevel ??
      raw.importedRelativeLevel ??
      raw.relativeLevel ??
      raw.relative_level ??
      raw.calc?.relative_level,
    ),
    defaultPenalty: normalizeNullableNumber(
      node.defaultPenalty ??
      raw.defaultPenalty ??
      raw.default_penalty ??
      defaultSkill?.modifier,
    ),
    maximumRelativeLevel: normalizeNullableNumber(
      node.maximumRelativeLevel ??
      raw.maximumRelativeLevel ??
      raw.maximum_relative_level ??
      raw.limit,
    ),

    defaults,
    features: normalizeArray(
      node.features ?? raw.features,
      "GCS technique features must be array",
    ),
    prereqs: node.prereqs ?? raw.prereqs ?? null,

    notes: normalizeNotes(node.notes ?? raw.notes),
    tags: [
      ...normalizeArray(
        node.tags ?? raw.tags,
        "GCS technique tags must be array",
      ),
      "import:gcs",
      "node:technique",
    ],

    importMeta: {
      source: "gcs",
      containerIds: normalizeContainerIds(node.importMeta?.containerIds),
      linkStatus: link.status,
      requestedSkillId: link.requestedSkillId,
      requestedSkillName: link.requestedSkillName,
      requestedSkillSpecialization: link.requestedSkillSpecialization,
    },

    raw,
  };
}

function resolveParentSkill(node, skills) {
  if (!Array.isArray(skills)) {
    throw new Error("Skills used by TechniquesImporter must be array");
  }

  const raw = node.raw ?? node;
  const defaults = normalizeArray(
    node.defaults ?? raw.defaults,
    "GCS technique defaults must be array",
  );
  const defaultSkill = findDefaultSkill(defaults, raw.default);

  const requestedSkillId = normalizeNullableString(
    node.skillId ??
    node.skill_id ??
    node.parentSkillId ??
    node.parent_skill_id ??
    raw.skillId ??
    raw.skill_id ??
    raw.parentSkillId ??
    raw.parent_skill_id ??
    defaultSkill?.skillId ??
    defaultSkill?.skill_id ??
    defaultSkill?.id,
  );
  const requestedSkillName = normalizeNullableString(
    node.skillName ??
    node.skill_name ??
    raw.skillName ??
    raw.skill_name ??
    defaultSkill?.name,
  );
  const requestedSkillSpecialization = normalizeNullableString(
    node.skillSpecialization ??
    node.skill_specialization ??
    raw.skillSpecialization ??
    raw.skill_specialization ??
    defaultSkill?.specialization ??
    defaultSkill?.specialty,
  );

  if (requestedSkillId) {
    const skill = skills.find(candidate => skillMatchesId(candidate, requestedSkillId));

    if (skill) {
      return {
        skill,
        status: "resolvedById",
        reason: null,
        requestedSkillId,
        requestedSkillName,
        requestedSkillSpecialization,
      };
    }
  }

  if (requestedSkillName) {
    const nameMatches = skills.filter(candidate => (
      normalizeForComparison(candidate.name) === normalizeForComparison(requestedSkillName)
    ));
    const specializationMatches = requestedSkillSpecialization
      ? nameMatches.filter(candidate => (
        normalizeForComparison(candidate.specialization) ===
        normalizeForComparison(requestedSkillSpecialization)
      ))
      : nameMatches;

    if (specializationMatches.length === 1) {
      return {
        skill: specializationMatches[0],
        status: "resolvedByName",
        reason: null,
        requestedSkillId,
        requestedSkillName,
        requestedSkillSpecialization,
      };
    }

    if (specializationMatches.length > 1) {
      return {
        skill: null,
        status: "ambiguous",
        reason: "multipleSkillsMatched",
        requestedSkillId,
        requestedSkillName,
        requestedSkillSpecialization,
      };
    }
  }

  return {
    skill: null,
    status: "unresolved",
    reason: requestedSkillId || requestedSkillName
      ? "skillNotFound"
      : "skillReferenceMissing",
    requestedSkillId,
    requestedSkillName,
    requestedSkillSpecialization,
  };
}

function skillMatchesId(skill, requestedSkillId) {
  if (skill.id === requestedSkillId) return true;

  return Object.values(skill.externalIds ?? {}).some(
    value => value === requestedSkillId,
  );
}

function findDefaultSkill(defaults, singularDefault) {
  const candidates = singularDefault
    ? [...defaults, singularDefault]
    : defaults;

  return candidates.find(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    const type = String(item.type ?? item.kind ?? "").toLowerCase();

    return (
      type.includes("skill") ||
      item.skillId !== undefined ||
      item.skill_id !== undefined ||
      item.name !== undefined
    );
  }) ?? null;
}

function normalizeDifficulty(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return normalizeDifficulty(
      value.difficulty ?? value.level ?? value.value,
    );
  }

  const text = String(value).trim();
  const difficulty = text.includes("/")
    ? text.split("/").at(-1)
    : text;

  return difficulty === "" ? null : difficulty.toUpperCase();
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeNonNegativeNumber(value, fallback) {
  const normalized = normalizeNullableNumber(value);

  if (normalized === null) return fallback;

  if (normalized < 0) {
    throw new Error("GCS technique points must be non-negative number");
  }

  return normalized;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizeForComparison(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function normalizeContainerIds(value) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error("Technique import containerIds must be array");
  }

  return [...value];
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");

  return String(value);
}

function createExternalIds(node, raw) {
  if (node.externalIds !== undefined) {
    if (
      !node.externalIds ||
      typeof node.externalIds !== "object" ||
      Array.isArray(node.externalIds)
    ) {
      throw new Error("GCS technique externalIds must be object");
    }

    return { ...node.externalIds };
  }

  const externalIds = {};

  if (raw.id) externalIds.gcs = raw.id;
  if (raw.uuid) externalIds.gcsUuid = raw.uuid;

  return externalIds;
}

function generateTechniqueId() {
  return `import_technique_${Math.random().toString(36).slice(2, 10)}`;
}
