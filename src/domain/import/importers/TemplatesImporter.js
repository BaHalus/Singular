import { importTraits } from "./TraitsImporter.js";
import { importSkills } from "./SkillsImporter.js";
import { importTechniques } from "./TechniquesImporter.js";
import { importSpells } from "./SpellsImporter.js";
import { importLanguages } from "./LanguagesImporter.js";
import { importFamiliarities } from "./FamiliaritiesImporter.js";
import { importEquipment } from "./EquipmentImporter.js";

export function importTemplates(source = []) {
  const rows = readTemplateRows(source);
  const result = {
    templates: [],
    unknownNodes: [],
  };

  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("GCS template node must be object");
    }

    if (!isTemplateNode(row)) {
      result.unknownNodes.push(mapUnknownTemplateNode(row));
      continue;
    }

    result.templates.push(mapTemplate(row));
  }

  return result;
}

function mapTemplate(source) {
  const importedTraits = importTraits({
    advantages: source.advantages ?? [],
  });
  const importedSkills = importSkills(source.skills ?? []);
  const techniqueNodes = mergeImportedNodes(
    importedSkills.techniqueNodes,
    source.techniques ?? [],
  );
  const importedTechniques = importTechniques(
    techniqueNodes,
    importedSkills.skills,
  );
  const importedSpells = importSpells(source.spells ?? []);
  const languageNodes = mergeImportedNodes(
    importedTraits.languageNodes,
    source.languages ?? [],
  );
  const familiarityNodes = mergeImportedNodes(
    importedTraits.familiarityNodes,
    source.familiarities ?? source.cultural_familiarities ?? [],
  );
  const importedLanguages = importLanguages(languageNodes);
  const importedFamiliarities = importFamiliarities(familiarityNodes);
  const importedEquipment = importEquipment(readEquipmentSource(source));
  const rootContainers = importedTraits.containers.filter(container => (
    container.importMeta?.containerIds?.length === 0
  ));
  const primaryContainer = selectPrimaryContainer(rootContainers);
  const templateType = inferTemplateType(source, primaryContainer);

  return {
    id: source.id ?? source.uuid ?? generateTemplateId(),
    externalIds: createExternalIds(source),

    sourceVersion: normalizeNullableNonNegativeInteger(
      source.version,
      "GCS template version must be non-negative integer or null",
    ),
    templateType,
    name: source.name ?? primaryContainer?.name ?? "Unnamed Template",
    ancestry: normalizeNullableString(
      source.ancestry ?? primaryContainer?.ancestry,
    ),
    reference: normalizeNullableString(
      source.reference ?? primaryContainer?.reference,
    ),
    importedPoints: normalizeNullableNumber(
      source.calc?.points ?? primaryContainer?.calc?.points ?? primaryContainer?.points,
    ),

    notes: normalizeNotes(source.notes ?? source.local_notes),
    tags: [
      ...mergeStringArrays(source.tags, source.categories),
      "import:gcs",
      "format:gct",
      `template-type:${templateType}`,
    ],

    traits: {
      advantages: importedTraits.advantages,
      perks: importedTraits.perks,
      disadvantages: importedTraits.disadvantages,
      quirks: importedTraits.quirks,
      containers: importedTraits.containers,
      unknownNodes: importedTraits.unknownNodes,
    },

    skills: importedSkills.skills,
    techniques: importedTechniques.techniques,
    skillContainers: importedSkills.containers,
    techniqueNodes,
    unresolvedTechniqueLinks: importedTechniques.unresolvedLinks,
    unknownSkillNodes: importedSkills.unknownNodes,

    spells: importedSpells.spells,
    spellContainers: importedSpells.containers,
    unknownSpellNodes: importedSpells.unknownNodes,

    languages: importedLanguages.languages,
    languageNodes,
    unknownLanguageNodes: importedLanguages.unknownNodes,

    familiarities: importedFamiliarities.familiarities,
    familiarityNodes,
    unknownFamiliarityNodes: importedFamiliarities.unknownNodes,

    equipment: importedEquipment.equipment,
    unknownEquipmentNodes: importedEquipment.unknownNodes,

    importMeta: {
      source: "gcs",
      format: "gct",
      originalExtension: ".gct",
      sourceType: source.type ?? null,
      rootContainerIds: rootContainers.map(container => container.id),
      primaryContainerId: primaryContainer?.id ?? null,
    },

    raw: source,
  };
}

function readTemplateRows(source) {
  if (Array.isArray(source)) return source;

  if (!source || typeof source !== "object") {
    throw new Error("GCS templates source must be array or object");
  }

  if (isStandaloneTemplateSource(source)) return [source];
  if (Array.isArray(source.templates)) return source.templates;
  if (Array.isArray(source.templateRows)) return source.templateRows;
  if (Array.isArray(source.template_rows)) return source.template_rows;
  if (Array.isArray(source.rows) && source.type === "template_list") {
    return source.rows;
  }

  return [];
}

function isTemplateNode(source) {
  const type = normalizeText(source.type);

  return (
    type === "template" ||
    source.templateType !== undefined ||
    source.template_type !== undefined ||
    Array.isArray(source.advantages) ||
    Array.isArray(source.skills) ||
    Array.isArray(source.spells) ||
    Array.isArray(source.equipment)
  );
}

function isStandaloneTemplateSource(source) {
  return normalizeText(source.type) === "template";
}

function selectPrimaryContainer(containers) {
  return containers.find(container => (
    ["race", "metaTrait", "template"].includes(container.containerType)
  )) ?? containers[0] ?? null;
}

function inferTemplateType(source, primaryContainer) {
  const explicit = normalizeTemplateType(
    source.templateType ?? source.template_type ?? source.kind,
  );

  if (explicit !== "unknown") return explicit;

  const fromContainer = normalizeTemplateType(primaryContainer?.containerType);
  if (fromContainer !== "unknown") return fromContainer;

  const name = normalizeText(source.name ?? primaryContainer?.name);

  if (name.includes("forma") || name.includes("form")) return "form";
  if (name.includes("raça") || name.includes("raca") || name.includes("race")) {
    return "race";
  }
  if (name.includes("meta")) return "metaTrait";
  if (name.includes("modelo") || name.includes("template")) return "template";

  return "unknown";
}

function normalizeTemplateType(value) {
  const text = normalizeText(value).replace(/[_\s-]+/g, "");

  if (text === "race" || text === "raça" || text === "raca") return "race";
  if (text === "metatrait" || text === "metacaracterística" || text === "metacaracteristica") {
    return "metaTrait";
  }
  if (text === "template" || text === "modelo") return "template";
  if (text === "form" || text === "forma" || text === "alternateform" || text === "formaalternativa") {
    return "form";
  }

  return "unknown";
}

function readEquipmentSource(source) {
  const result = {};

  if (Array.isArray(source.equipment)) {
    result.equipment = source.equipment;
  }

  const otherEquipment = source.otherEquipment ?? source.other_equipment;

  if (Array.isArray(otherEquipment)) {
    result.otherEquipment = otherEquipment;
  }

  return result;
}

function mergeImportedNodes(first, second) {
  const firstNodes = Array.isArray(first) ? first : [];
  const secondNodes = Array.isArray(second) ? second : [];
  const result = [];
  const seen = new Set();

  for (const node of [...firstNodes, ...secondNodes]) {
    const raw = node?.raw ?? node;
    const key = raw?.id ?? raw?.uuid ?? node?.id ?? null;

    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    result.push(node);
  }

  return result;
}

function mapUnknownTemplateNode(source) {
  return {
    id: source.id ?? source.uuid ?? generateUnknownTemplateId(),
    externalIds: createExternalIds(source),
    name: source.name ?? source.description ?? "",
    importMeta: {
      source: "gcs",
      format: "gct",
      originalExtension: ".gct",
      sourceType: source.type ?? null,
    },
    raw: source,
  };
}

function createExternalIds(source) {
  const externalIds = {};

  if (source.id) externalIds.gcs = source.id;
  if (source.uuid) externalIds.gcsUuid = source.uuid;

  return externalIds;
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

function normalizeNullableNonNegativeInteger(value, errorMessage) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(errorMessage);
  }

  return parsed;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");

  return String(value);
}

function mergeStringArrays(...values) {
  const result = [];
  const seen = new Set();

  for (const value of values) {
    if (value === undefined || value === null) continue;

    if (!Array.isArray(value)) {
      throw new Error("GCS template tags and categories must be arrays");
    }

    for (const item of value) {
      const text = String(item);
      const key = normalizeText(text);

      if (seen.has(key)) continue;
      seen.add(key);
      result.push(text);
    }
  }

  return result;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function generateTemplateId() {
  return `import_template_${Math.random().toString(36).slice(2, 10)}`;
}

function generateUnknownTemplateId() {
  return `import_template_unknown_${Math.random().toString(36).slice(2, 10)}`;
}
