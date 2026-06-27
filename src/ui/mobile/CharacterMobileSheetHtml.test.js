import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { projectCharacterForMobileSheet } from "./CharacterMobileProjection.js";
import { createCharacterMobileSheetRenderModel } from "./CharacterMobileSheetRenderModel.js";
import {
  getCharacterMobileSheetHtmlSchemaVersion,
  renderCharacterMobileSheetHtml,
} from "./CharacterMobileSheetHtml.js";

function renderModel(overrides = {}) {
  return createCharacterMobileSheetRenderModel(
    projectCharacterForMobileSheet(createCharacter({
      identity: {
        id: "character-mobile-html",
        name: "Ayla <Exploradora>",
        concept: "Batedora & cartógrafa",
        playerId: "jogador-1",
        campaignId: "campanha-alpha",
      },
      attributes: {
        ST: { base: 11, override: null },
        DX: { base: 12, override: null },
        IQ: { base: 10, override: null },
        HT: { base: 11, override: null },
      },
      pools: {
        HP: { current: 9, maximum: 11 },
        FP: { current: 8, maximum: 11 },
      },
      ...overrides,
    })),
  );
}

test("exposes the attacks-read mobile sheet HTML schema version", () => {
  assert.equal(getCharacterMobileSheetHtmlSchemaVersion(), 7);
});

test("renders identity editing only in creation and attributes by mode", () => {
  const creation = renderCharacterMobileSheetHtml(renderModel(), { mode: "creation" });
  const table = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(creation, /data-schema-version="7"/);
  assert.match(creation, /data-role="character-summary-editor"/);
  assert.match(creation, /data-attribute-key="ST" data-attribute-adjust="-1"/);
  assert.doesNotMatch(table, /data-role="character-summary-editor"/);
  assert.doesNotMatch(table, /data-attribute-adjust=/);
  assert.match(table, /<dt>Nome<\/dt><dd>Ayla &lt;Exploradora&gt;<\/dd>/);
});

test("renders declared traits, skills and techniques as readable mobile cards", () => {
  const html = renderCharacterMobileSheetHtml(renderModel({
    traits: [
      {
        id: "trait_reflexos",
        role: "advantage",
        name: "Reflexos em Combate",
        points: 15,
        notes: "Reação rápida",
      },
    ],
    skills: [
      {
        id: "skill_espada",
        name: "Espada Curta",
        attribute: "DX",
        difficulty: "A",
        points: 4,
        importedLevel: 13,
        importedRelativeLevel: 1,
      },
    ],
    techniques: [
      {
        id: "tech_corte_pescoco",
        name: "Corte no Pescoço",
        skillName: "Espada Curta",
        difficulty: "D",
        points: 2,
        importedLevel: 11,
        defaultPenalty: -5,
      },
    ],
  }), { mode: "table" });

  assert.match(html, /data-card="traits" data-status="declared-only"/);
  assert.match(html, /Vantagem<\/dt><dd>Reflexos em Combate/);
  assert.match(html, /NH importado 13/);
  assert.match(html, /rel\. importado \+1/);
  assert.match(html, /base Espada Curta/);
});

test("renders equipment hierarchy, states and domain totals", () => {
  const html = renderCharacterMobileSheetHtml(renderModel({
    equipment: [
      {
        id: "eq_mochila",
        kind: "container",
        containerKind: "physical",
        name: "Mochila",
        quantity: 1,
        weightKg: 1.5,
        cost: 60,
        state: "carried",
        children: [
          {
            id: "eq_tocha",
            name: "Tocha",
            quantity: 3,
            weightKg: 0.5,
            cost: 2,
            state: "stored",
          },
        ],
      },
      {
        id: "eq_espada",
        name: "Espada Curta",
        quantity: 1,
        weightKg: 1.5,
        cost: 400,
        state: "equipped",
      },
    ],
  }), { mode: "table" });

  assert.match(html, /data-card="equipment" data-status="declared-only"/);
  assert.match(html, /aria-label="Totais de equipamentos"/);
  assert.match(html, /<dt>Quantidade<\/dt><dd>5<\/dd>/);
  assert.match(html, /<dt>Peso<\/dt><dd>4\.5 kg<\/dd>/);
  assert.match(html, /<dt>Custo<\/dt><dd>\$ 466<\/dd>/);
  assert.match(html, /data-equipment-id="eq_mochila" data-equipment-state="carried" data-depth="0"/);
  assert.match(html, /↳ Tocha/);
  assert.match(html, /Qtd 3 · 0\.5 kg\/un · \$ 2\/un · Guardado/);
  assert.match(html, /Espada Curta <small>Qtd 1 · 1\.5 kg\/un · \$ 400\/un · Equipado<\/small>/);
});

test("renders empty attacks and equipment while keeping PV/PF controls operational", () => {
  const html = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(html, /data-section="attacks" data-status="empty"/);
  assert.match(html, /Nenhum ataque declarado/);
  assert.match(html, /data-section="equipment" data-status="empty"/);
  assert.match(html, /Nenhum equipamento declarado/);
  assert.match(html, /data-pool-key="HP" data-pool-adjust="-1" aria-label="Diminuir PV"/);
  assert.match(html, /<dt>PF<\/dt><dd>8 \/ 11<\/dd>/);
});

test("marks the active table mode and rejects unsupported modes", () => {
  const html = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });
  assert.match(html, /data-action="mode-table" data-status="pending" aria-pressed="true"/);
  assert.throws(
    () => renderCharacterMobileSheetHtml(renderModel(), { mode: "print" }),
    /mode is invalid/,
  );
});
