import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { projectCharacterForMobileSheet } from "./CharacterMobileProjection.js";
import { createCharacterMobileSheetRenderModel } from "./CharacterMobileSheetRenderModel.js";
import {
  createCharacterMobileSheetRenderModelForCharacter,
} from "./CharacterMobileSheetComposition.js";
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

function composedModel(overrides = {}) {
  return createCharacterMobileSheetRenderModelForCharacter(createCharacter({
    identity: {
      id: "character-mobile-composed-html",
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
  }));
}

test("exposes the power-controls mobile sheet HTML schema version", () => {
  assert.equal(getCharacterMobileSheetHtmlSchemaVersion(), 12);
});

test("renders creation controls only in creation mode", () => {
  const character = renderModel({
    attacks: [
      {
        id: "attack_sword",
        name: "Espada Curta",
        category: "melee",
        source: { kind: "manual", id: null },
        damage: { value: "1d+2", type: "corte" },
      },
    ],
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
      },
    ],
  });
  const creation = renderCharacterMobileSheetHtml(character, { mode: "creation" });
  const table = renderCharacterMobileSheetHtml(character, { mode: "table" });

  assert.match(creation, /data-schema-version="12"/);
  assert.match(creation, /data-role="character-summary-editor"/);
  assert.match(creation, /data-attribute-key="ST" data-attribute-adjust="-1"/);
  assert.match(creation, /data-role="attack-editor"/);
  assert.match(creation, /data-action="attack-add"/);
  assert.match(creation, /data-action="attack-remove" data-attack-id="attack_sword"/);
  assert.match(creation, /data-role="equipment-editor"/);
  assert.match(creation, /data-action="equipment-add"/);
  assert.match(creation, /data-action="equipment-remove" data-equipment-id="eq_mochila"/);
  assert.match(creation, /data-action="equipment-state-set" data-equipment-id="eq_mochila"/);

  assert.doesNotMatch(table, /data-role="character-summary-editor"/);
  assert.doesNotMatch(table, /data-attribute-adjust=/);
  assert.doesNotMatch(table, /data-role="attack-editor"/);
  assert.doesNotMatch(table, /data-action="attack-remove"/);
  assert.doesNotMatch(table, /data-action="attack-reorder"/);
  assert.doesNotMatch(table, /data-role="equipment-editor"/);
  assert.doesNotMatch(table, /data-action="equipment-remove"/);
  assert.doesNotMatch(table, /data-action="equipment-reorder"/);
  assert.doesNotMatch(table, /data-action="equipment-state-set"/);
  assert.match(table, /<dt>Nome<\/dt><dd>Ayla &lt;Exploradora&gt;<\/dd>/);
});

test("renders spell controls only in creation mode", () => {
  const character = composedModel({
    spells: [
      {
        id: "spell_fireball",
        name: "Bola de Fogo",
        spellClass: "Projétil",
        castingCost: "1 a 3",
        maintenanceCost: "",
        castingTime: "1s",
        duration: "Instantânea",
        points: 4,
      },
      {
        id: "spell_light",
        name: "Luz",
        spellClass: "Regular",
        castingCost: "1",
        maintenanceCost: "1",
        castingTime: "1s",
        duration: "1 min",
        points: 1,
      },
    ],
  });
  const creation = renderCharacterMobileSheetHtml(character, { mode: "creation" });
  const table = renderCharacterMobileSheetHtml(character, { mode: "table" });

  assert.match(creation, /data-role="spell-editor"/);
  assert.match(creation, /data-action="spell-add"/);
  assert.match(creation, /data-action="spell-remove" data-spell-id="spell_fireball"/);
  assert.match(creation, /data-action="spell-reorder" data-spell-id="spell_fireball" data-target-index="1"/);
  assert.match(creation, /data-action="spell-reorder" data-spell-id="spell_light" data-target-index="0"/);
  assert.match(creation, /PF 1 a 3/);
  assert.match(creation, /TO 1s/);
  assert.match(creation, /Duração Instantânea/);

  assert.doesNotMatch(table, /data-role="spell-editor"/);
  assert.doesNotMatch(table, /data-action="spell-remove"/);
  assert.doesNotMatch(table, /data-action="spell-reorder"/);
});

test("renders power controls only in creation mode", () => {
  const character = composedModel({
    powers: [
      {
        id: "power_fire",
        name: "Piromancia",
        source: "mana",
        powerModifier: { name: "Mágico", valuePercent: -10, notes: "mana sensível" },
        talentTraitId: "trait_fire_talent",
        memberTraitIds: ["trait_firebolt"],
        notes: "Poder declarado",
        tags: ["elemental"],
      },
    ],
  });
  const creation = renderCharacterMobileSheetHtml(character, { mode: "creation" });
  const table = renderCharacterMobileSheetHtml(character, { mode: "table" });

  assert.match(creation, /data-role="power-editor"/);
  assert.match(creation, /data-action="power-add"/);
  assert.match(creation, /data-action="power-rename" data-power-id="power_fire"/);
  assert.match(creation, /data-action="power-remove" data-power-id="power_fire"/);
  assert.match(creation, /Fonte mana/);
  assert.match(creation, /Mod\. Mágico -10% mana sensível/);
  assert.match(creation, /Talento trait_fire_talent/);
  assert.match(creation, /Membros trait_firebolt/);

  assert.doesNotMatch(table, /data-role="power-editor"/);
  assert.doesNotMatch(table, /data-action="power-rename"/);
  assert.doesNotMatch(table, /data-action="power-remove"/);
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

test("renders equipment reorder targets using sibling indexes", () => {
  const html = renderCharacterMobileSheetHtml(renderModel({
    equipment: [
      {
        id: "eq_mochila",
        kind: "container",
        containerKind: "physical",
        name: "Mochila",
        quantity: 1,
        weightKg: 1,
        cost: 30,
        state: "carried",
        children: [
          { id: "eq_tocha", name: "Tocha", quantity: 1, weightKg: 0.5, cost: 2, state: "stored" },
          { id: "eq_corda", name: "Corda", quantity: 1, weightKg: 2, cost: 20, state: "stored" },
        ],
      },
      { id: "eq_espada", name: "Espada Curta", quantity: 1, weightKg: 1.5, cost: 400, state: "equipped" },
    ],
  }), { mode: "creation" });

  assert.match(
    html,
    /data-action="equipment-reorder" data-equipment-id="eq_tocha" data-target-index="1"/,
  );
  assert.match(
    html,
    /data-action="equipment-reorder" data-equipment-id="eq_corda" data-target-index="0"/,
  );
  assert.doesNotMatch(
    html,
    /data-action="equipment-reorder" data-equipment-id="eq_tocha" data-target-index="2"/,
  );
});

test("renders empty languages, attacks and equipment while keeping PV/PF controls operational", () => {
  const html = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(html, /data-section="languages-culture" data-status="empty"/);
  assert.match(html, /Nenhum idioma ou familiaridade cultural declarado/);
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