export function addSpell(spells, spell) {
  return [
    ...spells,
    spell,
  ];
}

export function removeSpell(spells, spellId) {
  return spells.filter(
    spell => spell.id !== spellId
  );
}

export function renameSpell(spells, spellId, name) {
  return spells.map(spell =>
    spell.id === spellId
      ? {
          ...spell,
          name: String(name),
        }
      : spell
  );
}

export function updateSpellNotes(spells, spellId, notes) {
  return spells.map(spell =>
    spell.id === spellId
      ? {
          ...spell,
          notes: String(notes),
        }
      : spell
  );
}

export function setSpellBase(spells, spellId, attribute, difficulty) {
  return spells.map(spell =>
    spell.id === spellId
      ? {
          ...spell,
          attribute,
          difficulty,
        }
      : spell
  );
}

export function setSpellPoints(spells, spellId, points) {
  if (typeof points !== "number" || Number.isNaN(points) || points < 0) {
    throw new Error("Spell points must be non-negative number");
  }

  return spells.map(spell =>
    spell.id === spellId
      ? {
          ...spell,
          points,
        }
      : spell
  );
}

export function setSpellImportedLevel(spells, spellId, importedLevel) {
  if (
    importedLevel !== null &&
    (typeof importedLevel !== "number" || Number.isNaN(importedLevel))
  ) {
    throw new Error("Spell importedLevel must be number or null");
  }

  return spells.map(spell =>
    spell.id === spellId
      ? {
          ...spell,
          importedLevel,
        }
      : spell
  );
}

export function addSpellTag(spells, spellId, tag) {
  return spells.map(spell =>
    spell.id === spellId
      ? {
          ...spell,
          tags: spell.tags.includes(tag)
            ? spell.tags
            : [
                ...spell.tags,
                tag,
              ],
        }
      : spell
  );
}

export function removeSpellTag(spells, spellId, tag) {
  return spells.map(spell =>
    spell.id === spellId
      ? {
          ...spell,
          tags: spell.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : spell
  );
}
