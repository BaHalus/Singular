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

export function createSnapshotFromGcs(source = {}) {
  const importedSkills = importSkills(readSkillsSource(source));
  const techniqueNodes = mergeTechniqueNodes(
    importedSkills.techniqueNodes,
    readTechniquesSource(source),
  );
  const importedTechniques = importTechniques(
    techniqueNodes,
    importedSkills.skills,
  );

  return createImportSnapshot({
    identity: importIdentity(source),
    attributes: importAttributes(source),
    secondaryCharacteristics: importSecondaryCharacteristics(source),
    traits: importTraits(source),

    skills: importedSkills.skills,
    techniques: importedTechniques.techniques,
    skillContainers: importedSkills.containers,
    techniqueNodes,
    unresolvedTechniqueLinks: importedTechniques.unresolvedLinks,
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
    techniques: snapshot.techniques,
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

function mergeTechniqueNodes(fromSkills, directTechniques) {
  const result = [];
  const seen = new Set();

  for (const node of [...fromSkills, ...directTechniques]) {
    const raw = node?.raw ?? node;
    const key = raw?.id ?? raw?.uuid ?? node?.id ?? null;

    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    result.push(node);
  }

  return result;
}
