import {
  projectCharacterForMobileSheet,
} from "./CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModel,
  serializeCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";
import {
  createCharacterMobileSpellsPowersReadModel,
  serializeCharacterMobileSpellsPowersReadModel,
} from "./CharacterMobileSpellsPowersReadModel.js";

export function createCharacterMobileSheetRenderModelForCharacter(character) {
  const baseModel = serializeCharacterMobileSheetRenderModel(
    createCharacterMobileSheetRenderModel(projectCharacterForMobileSheet(character)),
  );
  const spellsPowersModel = serializeCharacterMobileSpellsPowersReadModel(
    createCharacterMobileSpellsPowersReadModel(character),
  );

  const supplementalSections = spellsPowersModel.cards.map(card => ({
    id: card.id,
    title: card.title,
    status: card.status,
    collapsed: false,
  }));

  return Object.freeze({
    ...baseModel,
    cards: deepFreeze([
      ...baseModel.cards,
      ...spellsPowersModel.cards,
    ]),
    sections: deepFreeze([
      ...baseModel.sections,
      ...supplementalSections,
    ]),
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
