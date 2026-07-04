import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createCharacterMobileSheetRenderModelForCharacter,
} from "./CharacterMobileSheetComposition.js";
import {
  renderCharacterMobileSheetHtml,
} from "./CharacterMobileSheetHtml.js";

test("surfaces engine-calculated effective attribute results on mobile", () => {
  const character = createCharacter({
    identity: {
      id: "character-mobile-mechanical-results",
      name: "Aldric",
      concept: "Guarda de muralha",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: { base: 11, override: 13 },
      DX: { base: 10, override: null },
      IQ: { base: 9, override: null },
      HT: { base: 12, override: null },
    },
  });

  const model = createCharacterMobileSheetRenderModelForCharacter(character);
  const mechanicalResults = model.cards.find(card => card.id === "mechanical-results");

  assert.equal(mechanicalResults.title, "Resultados mecânicos");
  assert.deepEqual(
    mechanicalResults.items.slice(0, 4).map(item => [item.value, item.notes]),
    [
      ["ST 13", "Calculado pelo motor de atributos; fonte override"],
      ["DX 10", "Calculado pelo motor de atributos; fonte base"],
      ["IQ 9", "Calculado pelo motor de atributos; fonte base"],
      ["HT 12", "Calculado pelo motor de atributos; fonte base"],
    ],
  );

  const html = renderCharacterMobileSheetHtml(model, { mode: "table" });

  assert.match(html, /data-card="mechanical-results" data-status="available"/);
  assert.match(html, /<h2>Resultados mecânicos<\/h2>/);
  assert.match(html, /Atributo efetivo<\/dt><dd>ST 13 <small>Calculado pelo motor de atributos; fonte override<\/small><\/dd>/);
  assert.match(html, /data-section="mechanical-results" data-status="available"/);
});

test("surfaces engine-calculated equipment totals as mechanical results on mobile", () => {
  const character = createCharacter({
    identity: {
      id: "character-mobile-equipment-total-results",
      name: "Iotha",
      concept: "Exploradora",
      playerId: "player-two",
      campaignId: "campaign-alpha",
    },
    equipment: [
      {
        id: "backpack",
        kind: "container",
        containerKind: "physical",
        name: "Mochila",
        quantity: 1,
        weightKg: 1.25,
        cost: 60,
        state: "carried",
        children: [
          {
            id: "ration",
            name: "Ração",
            quantity: 2,
            weightKg: 0.5,
            cost: 10,
            state: "stored",
          },
        ],
      },
    ],
  });

  const model = createCharacterMobileSheetRenderModelForCharacter(character);
  const mechanicalResults = model.cards.find(card => card.id === "mechanical-results");

  assert.deepEqual(
    mechanicalResults.items.slice(4).map(item => [item.label, item.value, item.notes]),
    [
      ["Quantidade em equipamento", "3", "Calculado pelo motor de equipamento"],
      ["Peso total em equipamento", "2.25 kg", "Calculado pelo motor de equipamento"],
      ["Custo total em equipamento", "$ 80", "Calculado pelo motor de equipamento"],
    ],
  );

  const html = renderCharacterMobileSheetHtml(model, { mode: "table" });

  assert.match(html, /Quantidade em equipamento<\/dt><dd>3 <small>Calculado pelo motor de equipamento<\/small><\/dd>/);
  assert.match(html, /Peso total em equipamento<\/dt><dd>2.25 kg <small>Calculado pelo motor de equipamento<\/small><\/dd>/);
  assert.match(html, /Custo total em equipamento<\/dt><dd>\$ 80 <small>Calculado pelo motor de equipamento<\/small><\/dd>/);
});
