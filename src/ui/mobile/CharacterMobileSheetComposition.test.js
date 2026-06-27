import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createCharacterMobileSheetRenderModelForCharacter,
} from "./CharacterMobileSheetComposition.js";

function findCard(model, id) {
  const card = model.cards.find(candidate => candidate.id === id);
  if (!card) throw new Error(`Missing card ${id}`);
  return card;
}

test("labels secondary characteristics for mobile presentation without changing canonical ids", () => {
  const model = createCharacterMobileSheetRenderModelForCharacter(createCharacter({
    secondaryCharacteristics: {
      HP: { base: 11, override: null },
      FP: { base: 10, override: null },
      Will: { base: 12, override: null },
      Per: { base: 13, override: null },
      BasicSpeed: { base: 5.75, override: null },
      BasicMove: { base: 5, override: null },
    },
  }));

  const secondary = findCard(model, "secondary-characteristics");
  assert.deepEqual(
    secondary.items.map(item => [item.id, item.label]),
    [
      ["HP", "PV máximo"],
      ["FP", "PF máximo"],
      ["Will", "Vontade"],
      ["Per", "Percepção"],
      ["BasicSpeed", "Velocidade Básica"],
      ["BasicMove", "Deslocamento Básico"],
    ],
  );
  assert.deepEqual(
    secondary.items.map(item => [item.id, item.base, item.override]),
    [
      ["HP", 11, null],
      ["FP", 10, null],
      ["Will", 12, null],
      ["Per", 13, null],
      ["BasicSpeed", 5.75, null],
      ["BasicMove", 5, null],
    ],
  );
});
