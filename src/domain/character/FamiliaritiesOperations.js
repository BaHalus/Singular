export function addFamiliarity(familiarities, familiarity) {
  return familiarities.concat(familiarity);
}

export function removeFamiliarity(familiarities, familiarityId) {
  return familiarities.filter(item => item.id !== familiarityId);
}

export function renameFamiliarity(familiarities, familiarityId, name) {
  return familiarities.map(item =>
    item.id === familiarityId
      ? { ...item, name: String(name) }
      : item
  );
}

export function setFamiliarityImportedCost(familiarities, familiarityId, importedCost) {
  if (importedCost !== null && typeof importedCost !== "number") {
    throw new Error("Familiarity importedCost must be number or null");
  }

  return familiarities.map(item =>
    item.id === familiarityId
      ? { ...item, importedCost }
      : item
  );
}

export function updateFamiliarityNotes(familiarities, familiarityId, notes) {
  return familiarities.map(item =>
    item.id === familiarityId
      ? { ...item, notes: String(notes) }
      : item
  );
}

export function addFamiliarityTag(familiarities, familiarityId, tag) {
  return familiarities.map(item => {
    if (item.id !== familiarityId) return item;
    if (item.tags.includes(tag)) return item;
    return { ...item, tags: item.tags.concat(tag) };
  });
}

export function removeFamiliarityTag(familiarities, familiarityId, tag) {
  return familiarities.map(item =>
    item.id === familiarityId
      ? { ...item, tags: item.tags.filter(existingTag => existingTag !== tag) }
      : item
  );
}
