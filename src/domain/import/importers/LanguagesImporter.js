const LANGUAGE_LEVELS = ["none", "broken", "accented", "native"];

export function importLanguages(source = []) {
  const nodes = readLanguageNodes(source);
  const result = {
    languages: [],
    unknownNodes: [],
  };

  for (const node of nodes) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      throw new Error("GCS language node must be object");
    }

    const language = mapLanguage(node);

    if (!language.name) {
      result.unknownNodes.push(mapUnknownLanguageNode(node));
      continue;
    }

    result.languages.push(language);
  }

  return result;
}

function readLanguageNodes(source) {
  if (Array.isArray(source)) return source;

  if (!source || typeof source !== "object") {
    throw new Error("GCS languages source must be array or object");
  }

  if (Array.isArray(source.languages)) return source.languages;
  if (Array.isArray(source.languageNodes)) return source.languageNodes;
  if (Array.isArray(source.language_nodes)) return source.language_nodes;

  return [];
}

function mapLanguage(node) {
  const raw = node.raw ?? node;
  const modifiers = normalizeArray(
    node.modifiers ?? raw.modifiers,
    "GCS language modifiers must be array",
  );
  const tags = normalizeArray(
    node.tags ?? raw.tags,
    "GCS language tags must be array",
  );
  const mode = inferLanguageMode(node, raw, tags);
  const inferred = inferLevelsFromModifiers(modifiers, mode);
  let spokenLevel = normalizeLanguageLevel(
    node.spokenLevel ??
    node.spoken_level ??
    raw.spokenLevel ??
    raw.spoken_level ??
    raw.spoken ??
    raw.oral,
  ) ?? inferred.spokenLevel ?? "none";
  let writtenLevel = normalizeLanguageLevel(
    node.writtenLevel ??
    node.written_level ??
    raw.writtenLevel ??
    raw.written_level ??
    raw.written ??
    raw.literacy,
  ) ?? inferred.writtenLevel ?? "none";
  const isNative = normalizeBoolean(
    node.isNative ??
    node.is_native ??
    node.native ??
    raw.isNative ??
    raw.is_native ??
    raw.native,
  ) ?? inferred.isNative;

  if (isNative) {
    spokenLevel = "native";
    writtenLevel = mode === "signed" ? "none" : "native";
  }

  return {
    id: node.id ?? raw.id ?? raw.uuid ?? generateLanguageId(),
    externalIds: createExternalIds(node, raw),
    name: extractLanguageName(
      node.languageName ??
      node.language_name ??
      raw.languageName ??
      raw.language_name ??
      node.name ??
      raw.name ??
      raw.description ??
      "",
    ),
    spokenLevel,
    writtenLevel,
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
      "domain:language",
      `mode:${mode}`,
      ...(isNative ? ["native"] : []),
    ],
    importMeta: {
      source: "gcs",
      mode,
      containerIds: normalizeContainerIds(node.importMeta?.containerIds),
      sourceKind: node.specialKind ?? null,
    },
    raw,
  };
}

function inferLanguageMode(node, raw, tags) {
  const text = [
    node.name,
    raw.name,
    raw.description,
    ...tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");

  return (
    text.includes("linguagem de sinais") ||
    text.includes("sign language") ||
    text.includes("língua de sinais")
  )
    ? "signed"
    : "spokenWritten";
}

function inferLevelsFromModifiers(modifiers, mode) {
  let spokenLevel = null;
  let writtenLevel = null;
  let isNative = false;

  for (const modifier of modifiers) {
    if (!modifier || typeof modifier !== "object" || modifier.disabled === true) {
      continue;
    }

    const name = normalizeForComparison(modifier.name);
    const level = normalizeLanguageLevel(
      modifier.level ??
      modifier.proficiency ??
      modifier.local_notes ??
      modifier.notes,
    );

    if (name === "materna" || name === "materno" || name === "native") {
      isNative = true;
      continue;
    }

    if (
      name === "falada" ||
      name === "spoken" ||
      name === "oral" ||
      name === "sinais" ||
      name === "signed"
    ) {
      spokenLevel = chooseHigherLevel(spokenLevel, level);
    }

    if (
      name === "escrita" ||
      name === "written" ||
      name === "literacy"
    ) {
      writtenLevel = chooseHigherLevel(writtenLevel, level);
    }
  }

  if (mode === "signed" && writtenLevel === null) {
    writtenLevel = "none";
  }

  return {
    spokenLevel,
    writtenLevel,
    isNative,
  };
}

function chooseHigherLevel(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;

  return LANGUAGE_LEVELS.indexOf(candidate) > LANGUAGE_LEVELS.indexOf(current)
    ? candidate
    : current;
}

function normalizeLanguageLevel(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    return LANGUAGE_LEVELS[value] ?? null;
  }

  const text = normalizeForComparison(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (["none", "nenhum", "nenhuma", "0"].includes(text)) return "none";
  if (["broken", "rudimentar", "1"].includes(text)) return "broken";
  if (["accented", "com sotaque", "2"].includes(text)) return "accented";
  if ([
    "native",
    "materna",
    "materno",
    "nativa",
    "nativo",
    "3",
  ].includes(text)) return "native";

  return null;
}

function extractLanguageName(value) {
  const text = String(value ?? "").trim();

  if (!text) return "";

  const prefixes = [
    "idioma:",
    "language:",
    "linguagem de sinais:",
    "língua de sinais:",
    "sign language:",
  ];
  const normalized = normalizeForComparison(text);

  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      return text.slice(text.indexOf(":") + 1).trim();
    }
  }

  return text;
}

function mapUnknownLanguageNode(node) {
  const raw = node.raw ?? node;

  return {
    id: node.id ?? raw.id ?? raw.uuid ?? generateUnknownLanguageId(),
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
      throw new Error("GCS language externalIds must be object");
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
    throw new Error("Language import containerIds must be array");
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

function generateLanguageId() {
  return `import_language_${Math.random().toString(36).slice(2, 10)}`;
}

function generateUnknownLanguageId() {
  return `import_language_unknown_${Math.random().toString(36).slice(2, 10)}`;
}
