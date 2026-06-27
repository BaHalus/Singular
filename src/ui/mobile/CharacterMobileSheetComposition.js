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
  const baseModel = withMobilePresentationLabels(serializeCharacterMobileSheetRenderModel(
    createCharacterMobileSheetRenderModel(projectCharacterForMobileSheet(character)),
  ));
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

function withMobilePresentationLabels(model) {
  return {
    ...model,
    cards: model.cards.map(card => {
      if (card.id !== "secondary-characteristics") return card;
      return {
        ...card,
        items: card.items.map(item => ({
          ...item,
          label: secondaryCharacteristicLabel(item.id, item.label),
        })),
      };
    }),
  };
}

function secondaryCharacteristicLabel(id, fallback) {
  if (id === "HP") return "PV máximo";
  if (id === "FP") return "PF máximo";
  if (id === "Will") return "Vontade";
  if (id === "Per") return "Percepção";
  if (id === "BasicSpeed") return "Velocidade Básica";
  if (id === "BasicMove") return "Deslocamento Básico";
  return fallback;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(child => deepFreeze(child, seen));
  return Object.freeze(value);
}
