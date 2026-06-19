export function createImportSnapshot(input = {}) {
  return {
    identity: input.identity ?? {},
    attributes: input.attributes ?? {},
    secondaryCharacteristics: input.secondaryCharacteristics ?? {},

    traits: input.traits ?? createEmptyImportedTraits(),

    skills: input.skills ?? [],
    techniques: input.techniques ?? [],
    skillContainers: input.skillContainers ?? [],
    techniqueNodes: input.techniqueNodes ?? [],
    unknownSkillNodes: input.unknownSkillNodes ?? [],

    languages: input.languages ?? [],
    familiarities: input.familiarities ?? [],
    equipment: input.equipment ?? [],

    raw: input.raw ?? {},
  };
}

function createEmptyImportedTraits() {
  return {
    advantages: [],
    perks: [],
    disadvantages: [],
    quirks: [],
    containers: [],
    unknownNodes: [],
  };
}
