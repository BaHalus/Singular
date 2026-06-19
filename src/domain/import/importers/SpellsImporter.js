export function importSpells(source = []) {
  const rows = readSpellRows(source);
  const result = {
    spells: [],
    containers: [],
    unknownNodes: [],
  };

  importSpellNodes(rows, result, {
    containerIds: [],
  });

  return result;
}

function importSpellNodes(nodes, result, context) {
  for (const node of nodes) {
    importSpellNode(node, result, context);
  }
}

function importSpellNode(source, result, context) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("GCS spell node must be object");
  }

  const children = readChildRows(source);
  const kind = inferSpellNodeKind(source, children);

  if (kind === "container") {
    const container = mapSpellContainer(source, context);
    result.containers.push(container);

    importSpellNodes(children, result, {
      containerIds: [...context.containerIds, container.id],
    });

    return;
  }

  if (kind === "standard" || kind === "ritualMagic") {
    result.spells.push(mapSpell(source, context, kind));
    return;
  }

  result.unknownNodes.push(mapUnknownNode(source, context));
}

function mapSpell(source, context, spellType) {
  const difficulty = parseDifficulty(source.difficulty);
  const relative = parseRelativeLevel(source);

  return {
    id: source.id ?? source.uuid ?? generateSpellId(),
    externalIds: createExternalIds(source),

    spellType,
    name: source.name ?? source.description ?? "",
    techLevel: normalizeNullableString(
      source.techLevel ?? source.tech_level,
    ),

    attribute: difficulty.attribute,
    difficulty: difficulty.difficulty,
    points: normalizeNonNegativeNumber(
      source.points,
      0,
      "GCS spell points must be non-negative number",
    ),

    importedLevel: normalizeNullableNumber(
      source.importedLevel ??
      source.imported_level ??
      source.level ??
      source.calc?.level,
    ),
    importedRelativeLevel: relative.numeric,
    importedRelativeLevelText: relative.text,

    colleges: normalizeStringArray(
      source.colleges ?? source.college,
      "GCS spell college must be string or array",
    ),
    powerSource: normalizeString(source.powerSource ?? source.power_source),
    spellClass: normalizeString(source.spellClass ?? source.spell_class),
    resistance: normalizeString(source.resistance ?? source.resist),

    castingCost: normalizeString(source.castingCost ?? source.casting_cost),
    maintenanceCost: normalizeString(
      source.maintenanceCost ?? source.maintenance_cost,
    ),
    castingTime: normalizeString(source.castingTime ?? source.casting_time),
    duration: normalizeString(source.duration),

    item: normalizeString(source.item),
    baseSkill: normalizeString(source.baseSkill ?? source.base_skill),
    prereqCount: normalizeNullableNonNegativeInteger(
      source.prereqCount ?? source.prereq_count,
      "GCS spell prereqCount must be non-negative integer or null",
    ),

    reference: normalizeNullableString(source.reference),
    notes: normalizeNotes(
      source.notes ?? source.local_notes ?? source.calc?.resolved_notes,
    ),
    tags: [
      ...normalizeArray(source.tags, "GCS spell tags must be array"),
      "import:gcs",
      "node:spell",
      `spell-type:${spellType}`,
    ],
    categories: normalizeArray(
      source.categories,
      "GCS spell categories must be array",
    ),

    weapons: normalizeArray(
      source.weapons,
      "GCS spell weapons must be array",
    ),
    features: normalizeArray(
      source.features,
      "GCS spell features must be array",
    ),
    modifiers: normalizeArray(
      source.modifiers,
      "GCS spell modifiers must be array",
    ),
    prereqs: source.prereqs ?? null,
    study: normalizeArray(source.study, "GCS spell study must be array"),
    thirdParty: normalizeNullablePlainObject(
      source.thirdParty ?? source.third_party,
      "GCS spell thirdParty must be object or null",
    ),
    calc: normalizeNullablePlainObject(
      source.calc,
      "GCS spell calc must be object or null",
    ),

    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
      sourceType: source.type ?? null,
    },

    raw: source,
  };
}

function mapSpellContainer(source, context) {
  return {
    id: source.id ?? source.uuid ?? generateSpellContainerId(),
    externalIds: createExternalIds(source),
    name: source.name ?? source.description ?? "",
    reference: normalizeNullableString(source.reference),
    tags: normalizeArray(source.tags, "GCS spell container tags must be array"),
    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
      sourceType: source.type ?? null,
    },
    raw: source,
  };
}

function mapUnknownNode(source, context) {
  return {
    id: source.id ?? source.uuid ?? generateUnknownSpellId(),
    externalIds: createExternalIds(source),
    name: source.name ?? source.description ?? "",
    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
      sourceType: source.type ?? null,
    },
    raw: source,
  };
}

function readSpellRows(source) {
  if (Array.isArray(source)) return source;

  if (!source || typeof source !== "object") {
    throw new Error("GCS spells source must be array or object");
  }

  if (Array.isArray(source.spells)) return source.spells;
  if (Array.isArray(source.rows)) return source.rows;
  if (Array.isArray(source.spellRows)) return source.spellRows;
  if (Array.isArray(source.spell_rows)) return source.spell_rows;

  return [];
}

function readChildRows(source) {
  if (Array.isArray(source.children)) return source.children;
  if (Array.isArray(source.rows)) return source.rows;

  return [];
}

function inferSpellNodeKind(source, children) {
  const type = String(source.type ?? source.kind ?? "").toLowerCase();

  if (
    type.includes("spell_container") ||
    type.includes("container") ||
    children.length > 0
  ) {
    return "container";
  }

  if (type.includes("ritual_magic_spell") || type.includes("ritual spell")) {
    return "ritualMagic";
  }

  if (
    type === "spell" ||
    type.includes("spell") ||
    source.spell_class !== undefined ||
    source.casting_cost !== undefined ||
    source.college !== undefined
  ) {
    return "standard";
  }

  return "unknown";
}

function parseDifficulty(value) {
  let attribute = null;
  let difficulty = null;

  if (typeof value === "string") {
    if (value.includes("/")) {
      [attribute, difficulty] = value.split("/", 2);
    } else {
      difficulty = value;
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    attribute = value.attribute ?? value.attr ?? null;
    difficulty = value.difficulty ?? value.level ?? value.value ?? null;
  }

  return {
    attribute: normalizeUpperNullableString(attribute),
    difficulty: normalizeUpperNullableString(difficulty),
  };
}

function parseRelativeLevel(source) {
  const numericCandidate =
    source.importedRelativeLevel ??
    source.imported_relative_level ??
    source.relativeLevel ??
    source.relative_level ??
    source.calc?.relative_level;
  const textCandidate =
    source.importedRelativeLevelText ??
    source.imported_relative_level_text ??
    source.calc?.rsl;

  const numeric = normalizeNullableNumber(numericCandidate);
  const text = normalizeNullableString(textCandidate);

  if (numeric !== null) {
    return { numeric, text };
  }

  if (numericCandidate !== undefined && numericCandidate !== null) {
    return {
      numeric: null,
      text: text ?? String(numericCandidate),
    };
  }

  return { numeric: null, text };
}

function normalizeStringArray(value, errorMessage) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map(item => String(item));
  if (typeof value === "string") return [value];

  throw new Error(errorMessage);
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeNullableString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function normalizeUpperNullableString(value) {
  const text = normalizeNullableString(value);
  return text === null ? null : text.toUpperCase();
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeNonNegativeNumber(value, fallback, errorMessage) {
  const normalized = normalizeNullableNumber(value);

  if (normalized === null) return fallback;

  if (normalized < 0) {
    throw new Error(errorMessage);
  }

  return normalized;
}

function normalizeNullableNonNegativeInteger(value, errorMessage) {
  if (value === undefined || value === null || value === "") return null;

  const normalized = normalizeNullableNumber(value);

  if (normalized === null || !Number.isInteger(normalized) || normalized < 0) {
    throw new Error(errorMessage);
  }

  return normalized;
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");

  return String(value);
}

function normalizeNullablePlainObject(value, errorMessage) {
  if (value === undefined || value === null) return null;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return value;
}

function createExternalIds(source) {
  const externalIds = {};

  if (source.id) externalIds.gcs = source.id;
  if (source.uuid) externalIds.gcsUuid = source.uuid;

  return externalIds;
}

function generateSpellId() {
  return `import_spell_${Math.random().toString(36).slice(2, 10)}`;
}

function generateSpellContainerId() {
  return `import_spell_container_${Math.random().toString(36).slice(2, 10)}`;
}

function generateUnknownSpellId() {
  return `import_spell_unknown_${Math.random().toString(36).slice(2, 10)}`;
}
