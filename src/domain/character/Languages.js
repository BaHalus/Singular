const LANGUAGE_LEVELS = ["none", "broken", "accented", "native"];

export function createLanguages(input = []) {
  const languages = input.map(createLanguage);

  validateLanguages(languages);

  return languages;
}

export function createLanguage(input = {}) {
  return {
    id: input.id ?? generateLanguageId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    spokenLevel: input.spokenLevel ?? "none",
    writtenLevel: input.writtenLevel ?? "none",
    importedCost: input.importedCost ?? null,
    notes: input.notes ?? "",
    tags: normalizeTags(input.tags),
  };
}

export function validateLanguages(languages) {
  if (!Array.isArray(languages)) {
    throw new Error("Languages must be an array");
  }

  for (const language of languages) {
    validateLanguage(language);
  }

  return true;
}

export function validateLanguage(language) {
  if (!language || typeof language !== "object") {
    throw new Error("Language must be an object");
  }

  if (!language.id) {
    throw new Error("Language must have id");
  }

  if (!isPlainObject(language.externalIds)) {
    throw new Error("Language externalIds must be object");
  }

  if (typeof language.name !== "string") {
    throw new Error("Language name must be string");
  }

  if (!LANGUAGE_LEVELS.includes(language.spokenLevel)) {
    throw new Error("Language spokenLevel is invalid");
  }

  if (!LANGUAGE_LEVELS.includes(language.writtenLevel)) {
    throw new Error("Language writtenLevel is invalid");
  }

  if (language.importedCost !== null && typeof language.importedCost !== "number") {
    throw new Error("Language importedCost must be number or null");
  }

  if (typeof language.notes !== "string") {
    throw new Error("Language notes must be string");
  }

  if (!Array.isArray(language.tags)) {
    throw new Error("Language tags must be array");
  }

  return true;
}

export function serializeLanguages(languages) {
  validateLanguages(languages);

  return languages.map(language => ({
    id: language.id,
    externalIds: { ...language.externalIds },
    name: language.name,
    spokenLevel: language.spokenLevel,
    writtenLevel: language.writtenLevel,
    importedCost: language.importedCost,
    notes: language.notes,
    tags: [...language.tags],
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Language externalIds must be object");
  }

  return { ...externalIds };
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new Error("Language tags must be array");
  }

  return [...tags];
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function generateLanguageId() {
  return `lang_${Math.random().toString(36).slice(2, 10)}`;
}
