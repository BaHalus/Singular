import { createCharacter } from "../character/Character.js";
import { createImportSnapshot } from "./ImportSnapshot.js";
import { importIdentity } from "./importers/IdentityImporter.js";
import {
  importAttributes,
  importSecondaryCharacteristics,
} from "./importers/AttributesImporter.js";
import { importTraits } from "./importers/TraitsImporter.js";
import { importSkills } from "./importers/SkillsImporter.js";

export function createSnapshotFromGcs(source = {}) {
  const importedSkills = importSkills(readSkillsSource(source));

  return createImportSnapshot({
    identity: importIdentity(source),
    attributes: importAttributes(source),
    secondaryCharacteristics: importSecondaryCharacteristics(source),
    traits: importTraits(source),

    skills: importedSkills.skills,
    skillContainers: importedSkills.containers,
    techniqueNodes: importedSkills.techniqueNodes,
    unknownSkillNodes: importedSkills.unknownNodes,

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
  });
}

function readSkillsSource(source) {
  if (Array.isArray(source.skills)) return source.skills;
  if (Array.isArray(source.skillRows)) return source.skillRows;
  if (Array.isArray(source.skill_rows)) return source.skill_rows;

  return [];
}
