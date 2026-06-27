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
    isNative: input.isNative ?? false,
    importedCost: input.importedCost ?? null,
    reference: input.reference ?? null,
    modifiers: normalizeArray(input.modifiers, "Language modifiers must be array"),
    prereqs: input.prereqs ?? null,
    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Language tags must be array"),
    importMeta: input.importMeta ?? null,
    raw: input.raw ?? null,
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

  if (typeof language.isNative !== "boolean") {
    throw new Error("Language isNative must be boolean");
  }

  if (
    language.importedCost !== null &&
    (typeof language.importedCost !== "number" || Number.isNaN(language.importedCost))
  ) {
    throw new Error("Language importedCost must be number or null");
  }

  if (language.reference !== null && typeof language.reference !== "string") {
    throw new Error("Language reference must be string or null");
  }

  if (!Array.isArray(language.modifiers)) {
    throw new Error("Language modifiers must be array");
  }

  if (language.prereqs !== null && !isPlainObject(language.prereqs)) {
    throw new Error("Language prereqs must be object or null");
  }

  if (typeof language.notes !== "string") {
    throw new Error("Language notes must be string");
  }

  if (!Array.isArray(language.tags)) {
    throw new Error("Language tags must be array");
  }

  if (language.importMeta !== null && !isPlainObject(language.importMeta)) {
    throw new Error("Language importMeta must be object or null");
  }

  return true;
}

export function serializeLanguage(language) {
  validateLanguage(language);

  return {
    id: language.id,
    externalIds: { ...language.externalIds },
    name: language.name,
    spokenLevel: language.spokenLevel,
    writtenLevel: language.writtenLevel,
    isNative: language.isNative,
    importedCost: language.importedCost,
    reference: language.reference,
    modifiers: [...language.modifiers],
    prereqs: language.prereqs,
    notes: language.notes,
    tags: [...language.tags],
    importMeta: language.importMeta,
    raw: language.raw,
  };
}

export function serializeLanguages(languages) {
  validateLanguages(languages);

  return languages.map(serializeLanguage);
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

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
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
