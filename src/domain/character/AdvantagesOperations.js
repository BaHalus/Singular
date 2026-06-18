/**
 * Advantages Operations
 * ---------------------
 * Operações puras sobre Advantages.
 *
 * Nenhuma função altera o array recebido.
 */

export function addAdvantage(advantages, advantage) {
  return [
    ...advantages,
    advantage,
  ];
}

export function removeAdvantage(advantages, advantageId) {
  return advantages.filter(
    advantage => advantage.id !== advantageId
  );
}

export function renameAdvantage(advantages, advantageId, name) {
  return advantages.map(advantage =>
    advantage.id === advantageId
      ? {
          ...advantage,
          name: String(name),
        }
      : advantage
  );
}

export function updateAdvantageNotes(advantages, advantageId, notes) {
  return advantages.map(advantage =>
    advantage.id === advantageId
      ? {
          ...advantage,
          notes: String(notes),
        }
      : advantage
  );
}

export function addAdvantageTag(advantages, advantageId, tag) {
  return advantages.map(advantage =>
    advantage.id === advantageId
      ? {
          ...advantage,
          tags: advantage.tags.includes(tag)
            ? advantage.tags
            : [
                ...advantage.tags,
                tag,
              ],
        }
      : advantage
  );
}

export function removeAdvantageTag(advantages, advantageId, tag) {
  return advantages.map(advantage =>
    advantage.id === advantageId
      ? {
          ...advantage,
          tags: advantage.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : advantage
  );
}
