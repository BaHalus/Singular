import { createCharacter } from "../character/Character.js";
import { createImportSnapshot } from "./ImportSnapshot.js";
import { importIdentity } from "./importers/IdentityImporter.js";
import {
  importAttributes,
  importSecondaryCharacteristics,
} from "./importers/AttributesImporter.js";
import { importTraits } from "./importers/TraitsImporter.js";
import { importSkills } from "./importers/SkillsImporter.js";
import { importTechniques } from "./importers/TechniquesImporter.js";
import { importLanguages } from "./importers/LanguagesImporter.js";
import { importFamiliarities } from "./importers/FamiliaritiesImporter.js";
import { importEquipment } from "./importers/EquipmentImporter.js";

export function createSnapshotFromGcs(source = {}) {
  const importedTraits = importTraits(source);
  const importedSkills = importSkills(readSkillsSource(source));
  const techniqueNodes = mergeImportedNodes(
    importedSkills.techniqueNodes,
    readTechniquesSource(source),
  );
  const importedTechniques = importTechniques(
    techniqueNodes,
    importedSkills.skills,
  );
  const languageNodes = mergeImportedNodes(
    importedTraits.languageNodes,
    readLanguagesSource(source),
  );
  const familiarityNodes = mergeImportedNodes(
    importedTraits.familiarityNodes,
    readFamiliaritiesSource(source),
  );
  const importedLanguages = importLanguages(languageNodes);
  const importedFamiliarities = importFamiliarities(familiarityNodes);
  const importedEquipment = importEquipment(readEquipmentSource(source));

  return createImportSnapshot({
    identity: importIdentity(source),
    attributes: importAttributes(source),
    secondaryCharacteristics: importSecondaryCharacteristics(source),
    traits: importedTraits,

    skills: importedSkills.skills,
    techniques: importedTechniques.techniques,
    skillContainers: importedSkills.containers,
    techniqueNodes,
    unresolvedTechniqueLinks: importedTechniques.unresolvedLinks,
    unknownSkillNodes: importedSkills.unknownNodes,

    languages: importedLanguages.languages,
    languageNodes,
    unknownLanguageNodes: importedLanguages.unknownNodes,

    familiarities: importedFamiliarities.familiarities,
    familiarityNodes,
    unknownFamiliarityNodes: importedFamiliarities.unknownNodes,

    equipment: importedEquipment.equipment,
    unknownEquipmentNodes: importedEquipment.unknownNodes,

    raw: source,
  });
}

export function importCharacter(source = {}) {
  const snapshot = createSnapshotFromGcs(source);

  return createCharacter({
    identity: snapshot.identity,
    attributes: snapshot.attributes,
    secondaryCharacteristics: snapshot.secondaryCharacteristics,

    advantages: snapshot.traits.advantages,
    perks: snapshot.traits.perks,
    disadvantages: snapshot.traits.disadvantages,
    quirks: snapshot.traits.quirks,

    skills: snapshot.skills,
    techniques: snapshot.techniques,
    languages: snapshot.languages,
    familiarities: snapshot.familiarities,
    equipment: snapshot.equipment,
  });
}

function readSkillsSource(source) {
  if (Array.isArray(source.skills)) return source.skills;
  if (Array.isArray(source.skillRows)) return source.skillRows;
  if (Array.isArray(source.skill_rows)) return source.skill_rows;

  return [];
}

function readTechniquesSource(source) {
  if (Array.isArray(source.techniques)) return source.techniques;
  if (Array.isArray(source.techniqueRows)) return source.techniqueRows;
  if (Array.isArray(source.technique_rows)) return source.technique_rows;

  return [];
}

function readLanguagesSource(source) {
  if (Array.isArray(source.languages)) return source.languages;
  if (Array.isArray(source.languageRows)) return source.languageRows;
  if (Array.isArray(source.language_rows)) return source.language_rows;
  if (Array.isArray(source.profile?.languages)) return source.profile.languages;

  return [];
}

function readFamiliaritiesSource(source) {
  if (Array.isArray(source.familiarities)) return source.familiarities;
  if (Array.isArray(source.culturalFamiliarities)) return source.culturalFamiliarities;
  if (Array.isArray(source.cultural_familiarities)) return source.cultural_familiarities;
  if (Array.isArray(source.profile?.familiarities)) return source.profile.familiarities;
  if (Array.isArray(source.profile?.cultural_familiarities)) {
    return source.profile.cultural_familiarities;
  }

  return [];
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
  const result = [];
  const seen = new Set();

  for (const node of [...first, ...second]) {
    const raw = node?.raw ?? node;
    const key = raw?.id ?? raw?.uuid ?? node?.id ?? null;

    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    result.push(node);
  }

  return result;
}
