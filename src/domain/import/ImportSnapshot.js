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
    unresolvedTechniqueLinks: input.unresolvedTechniqueLinks ?? [],
    unknownSkillNodes: input.unknownSkillNodes ?? [],

    languages: input.languages ?? [],
    familiarities: input.familiarities ?? [],

    equipment: input.equipment ?? [],
    unknownEquipmentNodes: input.unknownEquipmentNodes ?? [],

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
