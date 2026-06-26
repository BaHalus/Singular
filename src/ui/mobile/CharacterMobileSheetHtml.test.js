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
  const character = createCharacter({
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
    metadata: {
      createdAt: "2026-06-26T18:00:00.000Z",
      updatedAt: "2026-06-26T18:00:00.000Z",
      source: "test",
    },
    ...overrides,
  });

  return createCharacterMobileSheetRenderModel(
    projectCharacterForMobileSheet(character),
  );
}

test("exposes the declared-lists mobile sheet HTML schema version", () => {
  assert.equal(getCharacterMobileSheetHtmlSchemaVersion(), 5);
});

test("renders the character summary editor only in creation mode", () => {
  const creation = renderCharacterMobileSheetHtml(renderModel(), { mode: "creation" });
  const table = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(creation, /data-schema-version="5"/);
  assert.match(creation, /data-mode="creation"/);
  assert.match(creation, /data-role="character-summary-editor"/);
  assert.match(creation, /data-role="character-name" value="Ayla &lt;Exploradora&gt;"/);
  assert.match(creation, /data-role="character-concept" value="Batedora &amp; cartógrafa"/);
  assert.match(creation, /data-action="character-summary-save"/);

  assert.match(table, /data-mode="table"/);
  assert.doesNotMatch(table, /data-role="character-summary-editor"/);
  assert.doesNotMatch(table, /data-action="character-summary-save"/);
  assert.match(table, /<dt>Nome<\/dt><dd>Ayla &lt;Exploradora&gt;<\/dd>/);
  assert.match(table, /<dt>Conceito<\/dt><dd>Batedora &amp; cartógrafa<\/dd>/);
});

test("renders primary attribute controls only in creation mode", () => {
  const creation = renderCharacterMobileSheetHtml(renderModel(), { mode: "creation" });
  const table = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(creation, /role="group" aria-label="Atributos principais"/);
  assert.match(creation, /data-attribute="ST"/);
  assert.match(creation, /data-attribute-key="ST" data-attribute-adjust="-1" aria-label="Diminuir ST"/);
  assert.match(creation, /<dt>ST<\/dt><dd>11<\/dd>/);
  assert.match(creation, /data-attribute-key="ST" data-attribute-adjust="1" aria-label="Aumentar ST"/);
  assert.match(creation, /data-attribute-key="DX" data-attribute-adjust="1"/);
  assert.match(creation, /data-attribute-key="IQ" data-attribute-adjust="1"/);
  assert.match(creation, /data-attribute-key="HT" data-attribute-adjust="1"/);

  assert.match(table, /data-attribute="ST"/);
  assert.match(table, /<dt>ST<\/dt><dd>11<\/dd>/);
  assert.doesNotMatch(table, /data-attribute-adjust=/);
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
      {
        id: "trait_honra",
        role: "disadvantage",
        name: "Código de Honra",
        points: -10,
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
  assert.match(html, /<dt>Vantagem<\/dt><dd>Reflexos em Combate <small>15 pts · Reação rápida<\/small><\/dd>/);
  assert.match(html, /<dt>Desvantagem<\/dt><dd>Código de Honra <small>-10 pts<\/small><\/dd>/);
  assert.match(html, /data-card="skills-techniques" data-status="declared-only"/);
  assert.match(html, /<dt>Perícia<\/dt><dd>Espada Curta <small>4 pts · DX\/A · NH 13 · rel \+1<\/small><\/dd>/);
  assert.match(html, /<dt>Técnica<\/dt><dd>Corte no Pescoço <small>2 pts · D · NH 11 · base Espada Curta · pd -5<\/small><\/dd>/);
});

test("renders a semantic mobile sheet and preserves existing sections", () => {
  const html = renderCharacterMobileSheetHtml(renderModel(), { mode: "creation" });

  assert.match(html, /^<article class="singular-mobile-sheet"/);
  assert.match(html, /class="singular-mobile-sheet__toolbar"/);
  assert.match(html, /data-section="traits" data-status="empty"/);
  assert.match(html, /data-section="equipment" data-status="external-front"/);
});

test("renders accessible decrement and increment controls for PV and PF", () => {
  const html = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(html, /role="group" aria-label="PV e PF atuais"/);
  assert.match(html, /data-pool="HP"/);
  assert.match(html, /data-pool-key="HP" data-pool-adjust="-1" aria-label="Diminuir PV"/);
  assert.match(html, /<dt>PV<\/dt><dd>9 \/ 11<\/dd>/);
  assert.match(html, /data-pool-key="HP" data-pool-adjust="1" aria-label="Aumentar PV"/);
  assert.match(html, /data-pool="FP"/);
  assert.match(html, /<dt>PF<\/dt><dd>8 \/ 11<\/dd>/);
});

test("marks the active table mode in the toolbar", () => {
  const html = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(html, /data-action="mode-table" data-status="pending" aria-pressed="true"/);
  assert.match(html, /<dt>PF<\/dt><dd>8 \/ 11<\/dd>/);
});

test("rejects unsupported modes", () => {
  assert.throws(
    () => renderCharacterMobileSheetHtml(renderModel(), { mode: "print" }),
    /mode is invalid/,
  );
});
