export function addPerk(perks, perk) {
  return [
    ...perks,
    perk,
  ];
}

export function removePerk(perks, perkId) {
  return perks.filter(
    perk => perk.id !== perkId
  );
}

export function renamePerk(perks, perkId, name) {
  return perks.map(perk =>
    perk.id === perkId
      ? {
          ...perk,
          name: String(name),
        }
      : perk
  );
}

export function updatePerkNotes(perks, perkId, notes) {
  return perks.map(perk =>
    perk.id === perkId
      ? {
          ...perk,
          notes: String(notes),
        }
      : perk
  );
}

export function addPerkTag(perks, perkId, tag) {
  return perks.map(perk =>
    perk.id === perkId
      ? {
          ...perk,
          tags: perk.tags.includes(tag)
            ? perk.tags
            : [
                ...perk.tags,
                tag,
              ],
        }
      : perk
  );
}

export function removePerkTag(perks, perkId, tag) {
  return perks.map(perk =>
    perk.id === perkId
      ? {
          ...perk,
          tags: perk.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : perk
  );
}
