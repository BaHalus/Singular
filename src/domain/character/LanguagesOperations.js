import {
  createLanguage,
  createLanguages,
  serializeLanguage,
  serializeLanguages,
  validateLanguages,
} from "./Languages.js";

const LANGUAGE_PATCH_KEYS = Object.freeze([
  "externalIds",
  "name",
  "spokenLevel",
  "writtenLevel",
  "isNative",
  "importedCost",
  "reference",
  "modifiers",
  "prereqs",
  "notes",
  "tags",
  "importMeta",
  "raw",
]);

export function addLanguage(languages, languageInput) {
  validateLanguages(languages);
  requirePlainObject(languageInput, "Language input must be an object");
  return createLanguages([
    ...serializeLanguages(languages),
    clonePortableValue(languageInput),
  ]);
}

export function updateLanguage(languages, languageId, patch = {}) {
  validateLanguages(languages);
  const normalizedId = requireLanguageId(languageId);
  requirePlainObject(patch, "Language patch must be an object");
  assertPatchKeys(patch, LANGUAGE_PATCH_KEYS, "Language patch has unsupported fields");

  const currentIndex = languages.findIndex(language => language.id === normalizedId);
  if (currentIndex < 0) throw new Error("Language not found");

  const current = languages[currentIndex];
  const nextInput = {
    ...serializeLanguage(current),
    ...clonePortableValue(patch),
    id: current.id,
  };
  const nextLanguage = createLanguage(nextInput);
  const next = serializeLanguages(languages);
  next[currentIndex] = serializeLanguage(nextLanguage);
  return createLanguages(next);
}

export function removeLanguage(languages, languageId) {
  validateLanguages(languages);
  const normalizedId = requireLanguageId(languageId);
  const currentIndex = languages.findIndex(language => language.id === normalizedId);
  if (currentIndex < 0) throw new Error("Language not found");
  return createLanguages(
    serializeLanguages(languages).filter(language => language.id !== normalizedId),
  );
}

export function reorderLanguage(languages, languageId, targetIndex) {
  validateLanguages(languages);
  const normalizedId = requireLanguageId(languageId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= languages.length) {
    throw new Error("Language target index is invalid");
  }

  const currentIndex = languages.findIndex(language => language.id === normalizedId);
  if (currentIndex < 0) throw new Error("Language not found");
  if (currentIndex === targetIndex) return languages;

  const next = serializeLanguages(languages);
  const [language] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, language);
  return createLanguages(next);
}

export function findLanguageById(languages, languageId) {
  validateLanguages(languages);
  const normalizedId = requireLanguageId(languageId);
  return languages.find(language => language.id === normalizedId) ?? null;
}

export function renameLanguage(languages, languageId, name) {
  return updateLanguage(languages, languageId, { name: String(name) });
}

export function setLanguageLevels(languages, languageId, spokenLevel, writtenLevel) {
  return updateLanguage(languages, languageId, { spokenLevel, writtenLevel });
}

export function setLanguageImportedCost(languages, languageId, importedCost) {
  return updateLanguage(languages, languageId, { importedCost });
}

export function updateLanguageNotes(languages, languageId, notes) {
  return updateLanguage(languages, languageId, { notes: String(notes) });
}

export function addLanguageTag(languages, languageId, tag) {
  const current = findLanguageById(languages, languageId);
  return current.tags.includes(tag)
    ? languages
    : updateLanguage(languages, languageId, { tags: [...current.tags, tag] });
}

export function removeLanguageTag(languages, languageId, tag) {
  const current = findLanguageById(languages, languageId);
  return updateLanguage(
    languages,
    languageId,
    { tags: current.tags.filter(existingTag => existingTag !== tag) },
  );
}

function requireLanguageId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Language id must be a non-empty string");
  }
  return value;
}

function assertPatchKeys(patch, allowedKeys, message) {
  const allowed = new Set(allowedKeys);
  if (Object.keys(patch).some(key => !allowed.has(key))) {
    throw new Error(message);
  }
}

function clonePortableValue(value, seen = new WeakMap()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Language operation values must be JSON portable");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error("Language operation values must be JSON portable");
  }
  if (seen.has(value)) throw new Error("Language operation values must not contain cycles");

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(clonePortableValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  requirePlainObject(value, "Language operation value");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = clonePortableValue(item, seen);
  });
  seen.delete(value);
  return clone;
}

function requirePlainObject(value, errorMessage) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(errorMessage);
  }
}
