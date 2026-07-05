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
  const projection = projectCharacterForMobileSheet(character);
  const baseModel = withMobilePresentationLabels(
    serializeCharacterMobileSheetRenderModel(
      createCharacterMobileSheetRenderModel(projection),
    ),
  );
  const spellsPowersModel = serializeCharacterMobileSpellsPowersReadModel(
    createCharacterMobileSpellsPowersReadModel(character),
  );
  const equipmentCard = baseModel.cards.find(card => card.id === "equipment");
  const mechanicalResultsCard = createMechanicalResultsCard({
    attributes: baseModel.summary.attributes,
    derivedResults: projection.mechanicalResults,
    equipmentTotals: equipmentCard?.totals,
  });

  const composedModel = {
    ...baseModel,
    cards: [
      ...baseModel.cards,
      mechanicalResultsCard,
      ...spellsPowersModel.cards,
    ],
    sections: [
      ...baseModel.sections,
      {
        id: mechanicalResultsCard.id,
        title: mechanicalResultsCard.title,
        status: mechanicalResultsCard.status,
        collapsed: false,
      },
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
          value: secondaryCharacteristicValue(item),
        })),
      };
    }),
  };
}

function createMechanicalResultsCard({ attributes, derivedResults, equipmentTotals }) {
  return {
    id: "mechanical-results",
    title: "Resultados mecânicos",
    status: "available",
    items: [
      ...attributes.map(attribute => ({
        id: `mechanical:${attribute.id}`,
        label: "Atributo efetivo",
        value: `${attribute.label} ${formatPresentationValue(attribute.value)}`,
        notes: `Calculado pelo motor de atributos; fonte ${attribute.source}`,
        status: attribute.status,
      })),
      ...createDerivedDefenseMovementResultItems(derivedResults),
      ...createEquipmentTotalResultItems(equipmentTotals),
    ],
  };
}

function createDerivedDefenseMovementResultItems(results) {
  if (!results) return [];
  const notes = "Calculado pelo motor de defesa/movimento";
  return results.items.map(item => ({
    id: `mechanical:${item.id}`,
    label: item.label,
    value: formatPresentationValue(item.value),
    notes: `${notes}; fonte ${item.source}`,
    status: item.status,
  }));
}

function createEquipmentTotalResultItems(totals) {
  if (!totals) return [];
  const notes = "Calculado pelo motor de equipamento";
  return [
    {
      id: "mechanical:equipment-total-quantity",
      label: "Quantidade em equipamento",
      value: formatPresentationValue(totals.quantity),
      notes,
      status: "available",
    },
    {
      id: "mechanical:equipment-total-weight",
      label: "Peso total em equipamento",
      value: `${formatPresentationValue(totals.weightKg)} kg`,
      notes,
      status: "available",
    },
    {
      id: "mechanical:equipment-total-cost",
      label: "Custo total em equipamento",
      value: `$ ${formatPresentationValue(totals.cost)}`,
      notes,
      status: "available",
    },
  ];
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

function secondaryCharacteristicValue(item) {
  if (item.override === null || item.override === undefined) {
    return formatPresentationValue(item.base);
  }
  return `${formatPresentationValue(item.base)} (ajuste ${formatPresentationValue(item.override)})`;
}

function formatPresentationValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(child => deepFreeze(child, seen));
  return Object.freeze(value);
}
