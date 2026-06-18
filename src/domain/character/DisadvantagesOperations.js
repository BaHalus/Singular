export function addDisadvantage(disadvantages, disadvantage) {
  return [
    ...disadvantages,
    disadvantage,
  ];
}

export function removeDisadvantage(disadvantages, disadvantageId) {
  return disadvantages.filter(
    disadvantage => disadvantage.id !== disadvantageId
  );
}

export function renameDisadvantage(disadvantages, disadvantageId, name) {
  return disadvantages.map(disadvantage =>
    disadvantage.id === disadvantageId
      ? {
          ...disadvantage,
          name: String(name),
        }
      : disadvantage
  );
}

export function updateDisadvantageNotes(disadvantages, disadvantageId, notes) {
  return disadvantages.map(disadvantage =>
    disadvantage.id === disadvantageId
      ? {
          ...disadvantage,
          notes: String(notes),
        }
      : disadvantage
  );
}

export function addDisadvantageTag(disadvantages, disadvantageId, tag) {
  return disadvantages.map(disadvantage =>
    disadvantage.id === disadvantageId
      ? {
          ...disadvantage,
          tags: disadvantage.tags.includes(tag)
            ? disadvantage.tags
            : [
                ...disadvantage.tags,
                tag,
              ],
        }
      : disadvantage
  );
}

export function removeDisadvantageTag(disadvantages, disadvantageId, tag) {
  return disadvantages.map(disadvantage =>
    disadvantage.id === disadvantageId
      ? {
          ...disadvantage,
          tags: disadvantage.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : disadvantage
  );
}
