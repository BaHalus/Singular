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

test("exposes the primary-attribute mobile sheet HTML schema version", () => {
  assert.equal(getCharacterMobileSheetHtmlSchemaVersion(), 4);
});

test("renders the character summary editor only in creation mode", () => {
  const creation = renderCharacterMobileSheetHtml(renderModel(), { mode: "creation" });
  const table = renderCharacterMobileSheetHtml(renderModel(), { mode: "table" });

  assert.match(creation, /data-schema-version="4"/);
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

test("renders a semantic mobile sheet and preserves existing sections", () => {
  const html = renderCharacterMobileSheetHtml(renderModel(), { mode: "creation" });

  assert.match(html, /^<article class="singular-mobile-sheet"/);
  assert.match(html, /class="singular-mobile-sheet__toolbar"/);
  assert.match(html, /data-section="traits" data-status="pending"/);
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
