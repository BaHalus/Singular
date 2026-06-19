export function createImportSnapshot(input = {}) {
  return {
    identity: input.identity ?? {},
    attributes: input.attributes ?? {},
    secondaryCharacteristics: input.secondaryCharacteristics ?? {},

    traits: input.traits ?? [],
    skills: input.skills ?? [],
    techniques: input.techniques ?? [],
    languages: input.languages ?? [],
    familiarities: input.familiarities ?? [],
    equipment: input.equipment ?? [],

    raw: input.raw ?? {},
  };
}
