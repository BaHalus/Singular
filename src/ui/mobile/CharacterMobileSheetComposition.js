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

  const composedModel = {
    ...baseModel,
    cards: [
      ...baseModel.cards,
      ...spellsPowersModel.cards,
    ],
    sections: [
      ...baseModel.sections,
      ...spellsPowersModel.cards.map(card => ({
        id: card.id,
        title: card.title,
        status: card.status,
        collapsed: false,
      })),
    ],
  };

  return deepFreeze(JSON.parse(JSON.stringify(composedModel)));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(child => deepFreeze(child, seen));
  return Object.freeze(value);
}
