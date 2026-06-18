export function addLanguage(languages, language) {
  return [
    ...languages,
    language,
  ];
}

export function removeLanguage(languages, languageId) {
  return languages.filter(
    language => language.id !== languageId
  );
}

export function renameLanguage(languages, languageId, name) {
  return languages.map(language =>
    language.id === languageId
      ? {
          ...language,
          name: String(name),
        }
      : language
  );
}

export function setLanguageLevels(languages, languageId, spokenLevel, writtenLevel) {
  return languages.map(language =>
    language.id === languageId
      ? {
          ...language,
          spokenLevel,
          writtenLevel,
        }
      : language
  );
}

export function setLanguageImportedCost(languages, languageId, importedCost) {
  if (importedCost !== null && typeof importedCost !== "number") {
    throw new Error("Language importedCost must be number or null");
  }

  return languages.map(language =>
    language.id === languageId
      ? {
          ...language,
          importedCost,
        }
      : language
  );
}

export function updateLanguageNotes(languages, languageId, notes) {
  return languages.map(language =>
    language.id === languageId
      ? {
          ...language,
          notes: String(notes),
        }
      : language
  );
}

export function addLanguageTag(languages, languageId, tag) {
  return languages.map(language =>
    language.id === languageId
      ? {
          ...language,
          tags: language.tags.includes(tag)
            ? language.tags
            : [
                ...language.tags,
                tag,
              ],
        }
      : language
  );
}

export function removeLanguageTag(languages, languageId, tag) {
  return languages.map(language =>
    language.id === languageId
      ? {
          ...language,
          tags: language.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : language
  );
}
