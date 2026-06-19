export function importSkills(source = []) {
  const rows = readSkillRows(source);
  const result = createEmptySkillsImport();

  importSkillNodes(rows, result, {
    containerIds: [],
  });

  return result;
}

function createEmptySkillsImport() {
  return {
    skills: [],
    containers: [],
    techniqueNodes: [],
    unknownNodes: [],
  };
}

function importSkillNodes(nodes, result, context) {
  for (const node of nodes) {
    importSkillNode(node, result, context);
  }
}

function importSkillNode(source, result, context) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("GCS skill node must be object");
  }

  const children = readChildRows(source);
  const kind = inferSkillNodeKind(source, children);

  if (kind === "container") {
    const container = mapSkillContainer(source, context);
    result.containers.push(container);

    importSkillNodes(children, result, {
      containerIds: [...context.containerIds, container.id],
    });

    return;
  }

  if (kind === "technique") {
    result.techniqueNodes.push(mapTechniqueNode(source, context));
    return;
  }

  if (kind === "skill") {
    result.skills.push(mapSkill(source, context));
    return;
  }

  result.unknownNodes.push(mapUnknownNode(source, context));
}

function mapSkill(source, context) {
  const difficulty = parseDifficulty(source);

  return {
    id: source.id ?? source.uuid ?? generateSkillId(),
    externalIds: createExternalIds(source),

    name: source.name ?? source.description ?? "",
    specialization: source.specialization ?? source.specialty ?? "",
    techLevel: normalizeTechLevel(source.techLevel ?? source.tech_level),

    attribute: difficulty.attribute,
    difficulty: difficulty.difficulty,
    points: normalizeNonNegativeNumber(source.points, 0),

    importedLevel: normalizeNullableNumber(
      source.importedLevel ??
      source.level ??
      source.calc?.level ??
      source.calc?.skill_level
    ),
    importedRelativeLevel: normalizeNullableNumber(
      source.importedRelativeLevel ??
      source.relativeLevel ??
      source.relative_level ??
      source.calc?.relative_level
    ),

    defaults: normalizeArray(source.defaults, "GCS skill defaults must be array"),
    features: normalizeArray(source.features, "GCS skill features must be array"),
    weapons: normalizeArray(source.weapons, "GCS skill weapons must be array"),
    prereqs: source.prereqs ?? null,

    notes: normalizeNotes(source.notes),
    tags: [
      ...normalizeArray(source.tags, "GCS skill tags must be array"),
      "import:gcs",
      "node:skill",
    ],

    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
    },

    raw: source,
  };
}

function mapSkillContainer(source, context) {
  return {
    id: source.id ?? source.uuid ?? generateSkillContainerId(),
    externalIds: createExternalIds(source),
    name: source.name ?? source.description ?? "",
    tags: normalizeArray(source.tags, "GCS skill container tags must be array"),
    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
    },
    raw: source,
  };
}

function mapTechniqueNode(source, context) {
  return {
    id: source.id ?? source.uuid ?? generateTechniqueNodeId(),
    externalIds: createExternalIds(source),
    name: source.name ?? source.description ?? "",
    specialization: source.specialization ?? source.specialty ?? "",
    points: normalizeNonNegativeNumber(source.points, 0),
    importedLevel: normalizeNullableNumber(
      source.level ?? source.calc?.level ?? source.calc?.skill_level
    ),
    importedRelativeLevel: normalizeNullableNumber(
      source.relativeLevel ?? source.relative_level ?? source.calc?.relative_level
    ),
    difficulty: parseDifficulty(source).difficulty,
    defaults: normalizeArray(source.defaults, "GCS technique defaults must be array"),
    tags: normalizeArray(source.tags, "GCS technique tags must be array"),
    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
    },
    raw: source,
  };
}

function mapUnknownNode(source, context) {
  return {
    id: source.id ?? source.uuid ?? generateUnknownNodeId(),
    externalIds: createExternalIds(source),
    name: source.name ?? source.description ?? "",
    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
    },
    raw: source,
  };
}

function readSkillRows(source) {
  if (Array.isArray(source)) {
    return source;
  }

  if (!source || typeof source !== "object") {
    throw new Error("GCS skills source must be array or object");
  }

  if (Array.isArray(source.skills)) return source.skills;
  if (Array.isArray(source.rows)) return source.rows;
  if (Array.isArray(source.skillRows)) return source.skillRows;
  if (Array.isArray(source.skill_rows)) return source.skill_rows;

  return [];
}

function readChildRows(source) {
  if (Array.isArray(source.children)) return source.children;
  if (Array.isArray(source.skills)) return source.skills;
  if (Array.isArray(source.rows)) return source.rows;

  return [];
}

function inferSkillNodeKind(source, children) {
  const type = String(source.type ?? source.kind ?? "").toLowerCase();

  if (
    type.includes("skill_container") ||
    type.includes("container") ||
    children.length > 0
  ) {
    return "container";
  }

  if (type.includes("technique")) {
    return "technique";
  }

  if (
    type.includes("skill") ||
    source.difficulty !== undefined ||
    source.attribute !== undefined ||
    source.points !== undefined ||
    source.calc?.level !== undefined
  ) {
    return "skill";
  }

  return "unknown";
}

function parseDifficulty(source) {
  let attribute = source.attribute ?? null;
  let difficulty = source.difficulty ?? null;

  if (difficulty && typeof difficulty === "object" && !Array.isArray(difficulty)) {
    attribute = difficulty.attribute ?? difficulty.attr ?? attribute;
    difficulty = difficulty.difficulty ?? difficulty.level ?? difficulty.value ?? null;
  }

  if (typeof difficulty === "string" && difficulty.includes("/")) {
    const [parsedAttribute, parsedDifficulty] = difficulty.split("/", 2);
    attribute = attribute ?? parsedAttribute;
    difficulty = parsedDifficulty;
  }

  return {
    attribute: normalizeNullableString(attribute, true),
    difficulty: normalizeNullableString(difficulty, true),
  };
}

function normalizeTechLevel(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeNullableString(value, uppercase = false) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value).trim();

  if (text === "") {
    return null;
  }

  return uppercase ? text.toUpperCase() : text;
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

  if (normalized === null) {
    return fallback;
  }

  if (normalized < 0) {
    throw new Error("GCS skill points must be non-negative number");
  }

  return normalized;
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

function normalizeNotes(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item)).join("\n");
  }

  return String(value);
}

function createExternalIds(source) {
  const externalIds = {};

  if (source.id) externalIds.gcs = source.id;
  if (source.uuid) externalIds.gcsUuid = source.uuid;

  return externalIds;
}

function generateSkillId() {
  return `import_skill_${Math.random().toString(36).slice(2, 10)}`;
}

function generateSkillContainerId() {
  return `import_skill_container_${Math.random().toString(36).slice(2, 10)}`;
}

function generateTechniqueNodeId() {
  return `import_technique_${Math.random().toString(36).slice(2, 10)}`;
}

function generateUnknownNodeId() {
  return `import_skill_unknown_${Math.random().toString(36).slice(2, 10)}`;
}
