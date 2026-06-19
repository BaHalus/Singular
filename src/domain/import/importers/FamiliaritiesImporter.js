export function importFamiliarities(source = []) {
  const nodes = readFamiliarityNodes(source);
  const result = {
    familiarities: [],
    unknownNodes: [],
  };

  for (const node of nodes) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      throw new Error("GCS familiarity node must be object");
    }

    const familiarity = mapFamiliarity(node);

    if (!familiarity.name) {
      result.unknownNodes.push(mapUnknownFamiliarityNode(node));
      continue;
    }

    result.familiarities.push(familiarity);
  }

  return result;
}

function readFamiliarityNodes(source) {
  if (Array.isArray(source)) return source;

  if (!source || typeof source !== "object") {
    throw new Error("GCS familiarities source must be array or object");
  }

  if (Array.isArray(source.familiarities)) return source.familiarities;
  if (Array.isArray(source.culturalFamiliarities)) return source.culturalFamiliarities;
  if (Array.isArray(source.cultural_familiarities)) return source.cultural_familiarities;
  if (Array.isArray(source.familiarityNodes)) return source.familiarityNodes;
  if (Array.isArray(source.familiarity_nodes)) return source.familiarity_nodes;

  return [];
}

function mapFamiliarity(node) {
  const raw = node.raw ?? node;
  const modifiers = normalizeArray(
    node.modifiers ?? raw.modifiers,
    "GCS familiarity modifiers must be array",
  );
  const tags = normalizeArray(
    node.tags ?? raw.tags,
    "GCS familiarity tags must be array",
  );
  const isNative = normalizeBoolean(
    node.isNative ??
    node.is_native ??
    node.native ??
    raw.isNative ??
    raw.is_native ??
    raw.native,
  ) ?? inferNativeFromModifiers(modifiers);

  return {
    id: node.id ?? raw.id ?? raw.uuid ?? generateFamiliarityId(),
    externalIds: createExternalIds(node, raw),
    name: extractFamiliarityName(
      node.cultureName ??
      node.culture_name ??
      raw.cultureName ??
      raw.culture_name ??
      node.name ??
      raw.name ??
      raw.description ??
      "",
    ),
    isNative,
    importedCost: normalizeNullableNumber(
      node.importedCost ??
      node.imported_cost ??
      raw.importedCost ??
      raw.imported_cost ??
      raw.calc?.points ??
      node.points ??
      raw.points ??
      raw.base_points ??
      raw.cost,
    ),
    reference: normalizeNullableString(node.reference ?? raw.reference),
    modifiers,
    prereqs: node.prereqs ?? raw.prereqs ?? null,
    notes: normalizeNotes(
      node.notes ?? raw.notes ?? raw.local_notes,
    ),
    tags: [
      ...tags,
      "import:gcs",
      "domain:cultural-familiarity",
      ...(isNative ? ["native"] : []),
    ],
    importMeta: {
      source: "gcs",
      containerIds: normalizeContainerIds(node.importMeta?.containerIds),
      sourceKind: node.specialKind ?? null,
    },
    raw,
  };
}

function inferNativeFromModifiers(modifiers) {
  return modifiers.some(modifier => {
    if (!modifier || typeof modifier !== "object" || modifier.disabled === true) {
      return false;
    }

    const name = normalizeForComparison(modifier.name);

    return [
      "nativa",
      "nativo",
      "native",
      "materna",
      "materno",
    ].includes(name);
  });
}

function extractFamiliarityName(value) {
  const text = String(value ?? "").trim();

  if (!text) return "";

  const parenthetical = text.match(/^(?:familiaridade cultural|cultural familiarity)\s*\((.+)\)$/i);
  if (parenthetical) return parenthetical[1].trim();

  const colonIndex = text.indexOf(":");
  const normalized = normalizeForComparison(text);

  if (
    colonIndex >= 0 &&
    (
      normalized.startsWith("familiaridade cultural:") ||
      normalized.startsWith("cultural familiarity:")
    )
  ) {
    return text.slice(colonIndex + 1).trim();
  }

  return text;
}

function mapUnknownFamiliarityNode(node) {
  const raw = node.raw ?? node;

  return {
    id: node.id ?? raw.id ?? raw.uuid ?? generateUnknownFamiliarityId(),
    externalIds: createExternalIds(node, raw),
    importMeta: {
      source: "gcs",
      containerIds: normalizeContainerIds(node.importMeta?.containerIds),
    },
    raw,
  };
}

function createExternalIds(node, raw) {
  if (node.externalIds !== undefined) {
    if (
      !node.externalIds ||
      typeof node.externalIds !== "object" ||
      Array.isArray(node.externalIds)
    ) {
      throw new Error("GCS familiarity externalIds must be object");
    }

    return { ...node.externalIds };
  }

  const externalIds = {};

  if (raw.id) externalIds.gcs = raw.id;
  if (raw.uuid) externalIds.gcsUuid = raw.uuid;

  return externalIds;
}

function normalizeBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;

  const text = normalizeForComparison(value);
  if (["true", "yes", "sim", "1"].includes(text)) return true;
  if (["false", "no", "não", "nao", "0"].includes(text)) return false;

  return null;
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

function normalizeNullableString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
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
    throw new Error("Familiarity import containerIds must be array");
  }

  return [...value];
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");

  return String(value);
}

function normalizeForComparison(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function generateFamiliarityId() {
  return `import_familiarity_${Math.random().toString(36).slice(2, 10)}`;
}

function generateUnknownFamiliarityId() {
  return `import_familiarity_unknown_${Math.random().toString(36).slice(2, 10)}`;
}
