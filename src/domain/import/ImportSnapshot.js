export function createImportSnapshot(input = {}) {
  return {
    identity: input.identity ?? {},
    pointBudget: input.pointBudget ?? {},
    attributes: input.attributes ?? {},
    secondaryCharacteristics: input.secondaryCharacteristics ?? {},

    traits: input.traits ?? createEmptyImportedTraits(),

    skills: input.skills ?? [],
    techniques: input.techniques ?? [],
    skillContainers: input.skillContainers ?? [],
    techniqueNodes: input.techniqueNodes ?? [],
    unresolvedTechniqueLinks: input.unresolvedTechniqueLinks ?? [],
    unknownSkillNodes: input.unknownSkillNodes ?? [],

    spells: input.spells ?? [],
    spellContainers: input.spellContainers ?? [],
    unknownSpellNodes: input.unknownSpellNodes ?? [],

    powers: input.powers ?? [],
    unresolvedPowerLinks: input.unresolvedPowerLinks ?? [],

    languages: input.languages ?? [],
    languageNodes: input.languageNodes ?? [],
    unknownLanguageNodes: input.unknownLanguageNodes ?? [],

    familiarities: input.familiarities ?? [],
    familiarityNodes: input.familiarityNodes ?? [],
    unknownFamiliarityNodes: input.unknownFamiliarityNodes ?? [],

    equipment: input.equipment ?? [],
    unknownEquipmentNodes: input.unknownEquipmentNodes ?? [],

    templates: input.templates ?? [],
    unknownTemplateNodes: input.unknownTemplateNodes ?? [],
    templateImportReport: input.templateImportReport ?? null,

    raw: input.raw ?? {},
  };
}

function createEmptyImportedTraits() {
  return {
    advantages: [],
    perks: [],
    disadvantages: [],
    quirks: [],
    alternativeGroups: [],
    languageNodes: [],
    familiarityNodes: [],
    containers: [],
    unknownNodes: [],
  };
}
