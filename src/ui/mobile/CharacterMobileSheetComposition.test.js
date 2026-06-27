import assert from "node:assert/strict";
import test from "node:test";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createCharacterMobileSheetRenderModelForCharacter,
} from "./CharacterMobileSheetComposition.js";
import {
  renderCharacterMobileSheetHtml,
} from "./CharacterMobileSheetHtml.js";

test("composes Spells and Powers into the mobile sheet without recalculating values", () => {
  const model = createCharacterMobileSheetRenderModelForCharacter(createCharacter({
    identity: {
      id: "char-mobile-composed-spells-powers",
      name: "Maga Mobile",
      concept: "Leitura Alpha",
      playerId: null,
      campaignId: null,
    },
    spells: [
      {
        id: "spell-light",
        name: "Luz",
        spellClass: "Área",
        castingCost: "1",
        maintenanceCost: "1",
        castingTime: "1s",
        duration: "1 min",
        colleges: ["Luz e Trevas"],
        importedLevel: 13,
        points: 2,
        notes: "Valor importado.",
      },
    ],
    powers: [
      {
        id: "power-divine",
        name: "Favor Divino",
        source: "Divino",
        powerModifier: { name: "Divino", valuePercent: -10, notes: "Pacto" },
        memberTraitIds: ["trait-blessing"],
        notes: "Declarado para leitura.",
      },
    ],
  }));

  const spells = model.cards.find(card => card.id === "spells");
  const powers = model.cards.find(card => card.id === "powers");

  assert.equal(spells.status, "declared-only");
  assert.equal(spells.authority, "application.spell-read-projection");
  assert.equal(spells.items[0].value, "Luz");
  assert.equal(spells.items[0].importedLevel, 13);
  assert.equal(powers.status, "declared-only");
  assert.equal(powers.authority, "application.power-read-projection");
  assert.equal(powers.items[0].value, "Favor Divino");
  assert.equal(model.sections.find(section => section.id === "spells").status, "declared-only");
  assert.equal(model.sections.find(section => section.id === "powers").status, "declared-only");

  const html = renderCharacterMobileSheetHtml(model, { mode: "table" });
  assert.match(html, /data-card="spells" data-status="declared-only"/);
  assert.match(html, /Magia<\/dt><dd>Luz/);
  assert.match(html, /NH importado 13/);
  assert.match(html, /data-card="powers" data-status="declared-only"/);
  assert.match(html, /Poder<\/dt><dd>Favor Divino/);
});

test("keeps empty Spells and Powers visible as explicit empty mobile sections", () => {
  const model = createCharacterMobileSheetRenderModelForCharacter(createCharacter());

  assert.equal(model.cards.find(card => card.id === "spells").status, "empty");
  assert.equal(model.cards.find(card => card.id === "powers").status, "empty");
  assert.equal(model.sections.find(section => section.id === "spells").status, "empty");
  assert.equal(model.sections.find(section => section.id === "powers").status, "empty");
});
