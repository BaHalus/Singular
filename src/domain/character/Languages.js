export function createLanguages(input = []) { return input.map(createLanguage); }

export function createLanguage(input = {}) {
  return {
    id: input.id ?? `lang_${Math.random().toString(36).slice(2,10)}`,
    externalIds: input.externalIds ?? {},
    name: input.name ?? "",
    spokenLevel: input.spokenLevel ?? null,
    writtenLevel: input.writtenLevel ?? null,
    importedCost: input.importedCost ?? null,
    notes: input.notes ?? "",
    tags: input.tags ?? [],
  };
}
