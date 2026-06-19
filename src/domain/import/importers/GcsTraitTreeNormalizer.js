const KNOWN_CONTAINER_TYPES = [
  "group",
  "alternativeAbilities",
  "race",
  "template",
  "metaTrait",
  "power",
  "unknown",
];

const KNOWN_ROLES = [
  "advantage",
  "perk",
  "disadvantage",
  "quirk",
  "unknown",
];

export function normalizeGcsTraitTree(source = []) {
  const rows = readTraitRows(source);

  return rows.map(normalizeGcsTraitNode);
}

export function normalizeGcsTraitNode(source = {}) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("GCS trait node must be object");
  }

  const children = readChildTraitRows(source).map(normalizeGcsTraitNode);
  const tags = normalizeArray(source.tags);
  const points = normalizePoints(source.points ?? source.base_points ?? source.cost);
  const nodeKind = inferNodeKind(source, children, tags, points);
  const containerType = nodeKind === "container"
    ? inferContainerType(source, tags)
    : null;
  const role = nodeKind === "trait"
    ? inferRole(source, tags, points)
    : "unknown";

  return {
    id: source.id ?? source.uuid ?? generateImportNodeId(),
    externalIds: createExternalIds(source),

    nodeKind,
    containerType,

    name: source.name ?? source.description ?? "",
    points,
    levels: source.levels ?? null,

    role,

    modifiers: normalizeArray(source.modifiers),
    features: normalizeArray(source.features),
    weapons: normalizeArray(source.weapons),
    prereqs: source.prereqs ?? null,
    tags,

    children,
    raw: source,
  };
}

function readTraitRows(source) {
  if (Array.isArray(source)) {
    return source;
  }

  if (!source || typeof source !== "object") {
    throw new Error("GCS trait tree source must be array or object");
  }

  if (Array.isArray(source.rows)) return source.rows;
  if (Array.isArray(source.traits)) return source.traits;
  if (Array.isArray(source.advantages)) return source.advantages;

  return [];
}

function readChildTraitRows(source) {
  if (Array.isArray(source.children)) return source.children;
  if (Array.isArray(source.traits)) return source.traits;
  if (Array.isArray(source.rows)) return source.rows;

  return [];
}

function inferNodeKind(source, children, tags, points) {
  if (isExplicitContainer(source)) {
    return "container";
  }

  if (children.length > 0) {
    return "container";
  }

  if (inferRole(source, tags, points) !== "unknown") {
    return "trait";
  }

  if (
    normalizeArray(source.modifiers).length > 0 ||
    normalizeArray(source.features).length > 0 ||
    normalizeArray(source.weapons).length > 0 ||
    source.prereqs
  ) {
    return "trait";
  }

  return "unknown";
}

function isExplicitContainer(source) {
  const type = String(source.type ?? source.kind ?? "").toLowerCase();

  return (
    type.includes("container") ||
    type.includes("trait_container") ||
    source.containerType !== undefined ||
    source.container_type !== undefined
  );
}

function inferContainerType(source, tags) {
  const rawType = source.containerType ?? source.container_type ?? source.type ?? source.kind ?? "";
  const normalized = normalizeContainerType(rawType);

  if (normalized !== "unknown") {
    return normalized;
  }

  const text = [source.name, source.description, ...tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("habilidades alternativas") || text.includes("alternative abilities")) {
    return "alternativeAbilities";
  }

  if (text.includes("meta")) return "metaTrait";
  if (text.includes("raça") || text.includes("race")) return "race";
  if (text.includes("template") || text.includes("modelo")) return "template";
  if (text.includes("poder") || text.includes("power")) return "power";
  if (text.includes("grupo") || text.includes("group")) return "group";

  return "unknown";
}

function normalizeContainerType(value) {
  const text = String(value ?? "").trim().toLowerCase();

  if (text === "group" || text === "trait_container" || text === "container") {
    return "group";
  }

  if (text === "alternativeabilities" || text === "alternative_abilities") {
    return "alternativeAbilities";
  }

  if (text === "race" || text === "raça" || text === "raca") return "race";
  if (text === "template" || text === "modelo") return "template";
  if (text === "metatrait" || text === "meta_trait") return "metaTrait";
  if (text === "power" || text === "poder") return "power";

  return KNOWN_CONTAINER_TYPES.includes(value) ? value : "unknown";
}

function inferRole(source, tags, points) {
  const normalizedTags = tags.map(tag => tag.toLowerCase());
  const explicitRole = normalizeRole(source.role ?? source.traitRole ?? source.trait_role);

  if (explicitRole !== "unknown") return explicitRole;

  if (normalizedTags.includes("vantagem")) return "advantage";
  if (normalizedTags.includes("qualidade")) return "perk";
  if (normalizedTags.includes("desvantagem")) return "disadvantage";
  if (normalizedTags.includes("peculiaridade")) return "quirk";

  if (points === -1) return "quirk";
  if (points !== null && points < 0) return "disadvantage";
  if (points !== null && points > 0) return "advantage";

  return "unknown";
}

function normalizeRole(value) {
  const text = String(value ?? "").trim().toLowerCase();

  if (text === "advantage" || text === "vantagem") return "advantage";
  if (text === "perk" || text === "qualidade") return "perk";
  if (text === "disadvantage" || text === "desvantagem") return "disadvantage";
  if (text === "quirk" || text === "peculiaridade") return "quirk";

  return KNOWN_ROLES.includes(value) ? value : "unknown";
}

function normalizePoints(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());

    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeArray(value) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error("GCS trait node array field must be array");
  }

  return [...value];
}

function createExternalIds(source) {
  const externalIds = {};

  if (source.id) externalIds.gcs = source.id;
  if (source.uuid) externalIds.gcsUuid = source.uuid;

  return externalIds;
}

function generateImportNodeId() {
  return `import_trait_${Math.random().toString(36).slice(2, 10)}`;
}
