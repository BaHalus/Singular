import {
  createPower,
  serializePower,
} from "../../character/Powers.js";

export function importPowers(importedTraits = {}) {
  const traits = readImportedTraits(importedTraits);
  const containers = normalizeArray(
    importedTraits.containers,
    "Imported Trait containers must be an array",
  );
  const powerContainers = containers.filter(
    container => container?.containerType === "power",
  );
  const powerContainerIds = new Set(powerContainers.map(container => container.id));
  const membersByPowerId = new Map(
    powerContainers.map(container => [container.id, []]),
  );
  const knownTraitIds = new Set(traits.map(trait => trait.id));

  for (const trait of traits) {
    const containerIds = Array.isArray(trait.importMeta?.containerIds)
      ? trait.importMeta.containerIds
      : [];
    const nearestPowerId = [...containerIds]
      .reverse()
      .find(containerId => powerContainerIds.has(containerId)) ?? null;

    if (nearestPowerId !== null) {
      membersByPowerId.get(nearestPowerId).push(trait.id);
    }
  }

  const unresolvedLinks = [];
  const powers = powerContainers.map(container => {
    const raw = isPlainObject(container.raw) ? container.raw : {};
    const explicitTalentTraitId = readExplicitTalentTraitId(raw);
    const talentTraitId = explicitTalentTraitId !== null &&
      knownTraitIds.has(explicitTalentTraitId)
      ? explicitTalentTraitId
      : null;

    if (explicitTalentTraitId !== null && talentTraitId === null) {
      unresolvedLinks.push({
        powerId: container.id,
        kind: "talent-trait",
        externalTraitId: explicitTalentTraitId,
      });
    }

    const memberTraitIds = membersByPowerId
      .get(container.id)
      .filter(traitId => traitId !== talentTraitId);

    return serializePower(createPower({
      id: container.id,
      externalIds: container.externalIds ?? {},
      name: normalizeString(container.name),
      source: readPowerSource(raw),
      powerModifier: readPowerModifier(raw),
      talentTraitId,
      memberTraitIds,
      notes: normalizeNotes(raw.notes ?? raw.local_notes),
      tags: buildPowerTags(container.tags),
      importMeta: {
        source: "gcs",
        containerIds: Array.isArray(container.importMeta?.containerIds)
          ? [...container.importMeta.containerIds]
          : [],
        sourceType: raw.type ?? raw.kind ?? null,
      },
      raw: container.raw ?? null,
    }));
  });

  return {
    powers,
    unresolvedLinks,
  };
}

function readImportedTraits(importedTraits) {
  if (!isPlainObject(importedTraits)) {
    throw new Error("Imported Traits must be an object");
  }

  return [
    ...normalizeArray(importedTraits.advantages, "Imported advantages must be an array"),
    ...normalizeArray(importedTraits.perks, "Imported perks must be an array"),
    ...normalizeArray(
      importedTraits.disadvantages,
      "Imported disadvantages must be an array",
    ),
    ...normalizeArray(importedTraits.quirks, "Imported quirks must be an array"),
  ];
}

function readExplicitTalentTraitId(raw) {
  const candidate = raw.talentTraitId ??
    raw.talent_trait_id ??
    raw.talentId ??
    raw.talent_id ??
    null;

  if (candidate === null || candidate === undefined || candidate === "") {
    return null;
  }

  return String(candidate);
}

function readPowerSource(raw) {
  const candidate = raw.powerSource ?? raw.power_source ?? raw.source ?? null;
  return typeof candidate === "string" ? candidate : "";
}

function readPowerModifier(raw) {
  const candidate = raw.powerModifier ?? raw.power_modifier ?? null;
  if (!isPlainObject(candidate)) return null;

  return {
    name: normalizeString(candidate.name),
    valuePercent: normalizeNullableFiniteNumber(
      candidate.valuePercent ?? candidate.value_percent ?? candidate.percent,
    ),
    notes: normalizeNotes(candidate.notes ?? candidate.local_notes),
  };
}

function buildPowerTags(value) {
  const tags = normalizeStringArray(value).filter(tag => {
    const normalized = tag.trim().toLowerCase();
    return normalized !== "node:container" && normalized !== "role:unknown";
  });
  const result = [];
  const seen = new Set();

  for (const tag of [...tags, "import:gcs", "node:power"]) {
    const key = tag.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }

  return result;
}

function normalizeNullableFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item));
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(String).join("\n");
  return String(value);
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(errorMessage);
  return value;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
