export function addQuirk(quirks, quirk) {
  return [
    ...quirks,
    quirk,
  ];
}

export function removeQuirk(quirks, quirkId) {
  return quirks.filter(
    quirk => quirk.id !== quirkId
  );
}

export function renameQuirk(quirks, quirkId, name) {
  return quirks.map(quirk =>
    quirk.id === quirkId
      ? {
          ...quirk,
          name: String(name),
        }
      : quirk
  );
}

export function updateQuirkNotes(quirks, quirkId, notes) {
  return quirks.map(quirk =>
    quirk.id === quirkId
      ? {
          ...quirk,
          notes: String(notes),
        }
      : quirk
  );
}

export function addQuirkTag(quirks, quirkId, tag) {
  return quirks.map(quirk =>
    quirk.id === quirkId
      ? {
          ...quirk,
          tags: quirk.tags.includes(tag)
            ? quirk.tags
            : [
                ...quirk.tags,
                tag,
              ],
        }
      : quirk
  );
}

export function removeQuirkTag(quirks, quirkId, tag) {
  return quirks.map(quirk =>
    quirk.id === quirkId
      ? {
          ...quirk,
          tags: quirk.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : quirk
  );
}
