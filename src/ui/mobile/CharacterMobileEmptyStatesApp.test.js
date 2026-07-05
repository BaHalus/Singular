import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { renderCharacterMobileApp } from "./CharacterMobileApp.js";

function emptyCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-empty-states",
      name: "Ayla",
      concept: "Ficha vazia para regressão",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 10, IQ: 10, HT: 10 },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 10, maximum: 10 },
    },
    traits: [],
    skills: [],
    techniques: [],
    attacks: [],
    equipment: [],
    spells: [],
    powers: [],
    metadata: {
      createdAt: "2026-07-05T04:00:00.000Z",
      updatedAt: "2026-07-05T04:00:00.000Z",
      source: "test",
    },
  });
}

const STRUCTURAL_EDITOR_PATTERNS = Object.freeze([
  /data-role="trait-editor"/,
  /data-role="skill-editor"/,
  /data-role="technique-editor"/,
  /data-role="attack-editor"/,
  /data-role="equipment-editor"/,
  /data-role="spell-editor"/,
  /data-role="power-editor"/,
  /data-action="trait-add"/,
  /data-action="skill-add"/,
  /data-action="technique-add"/,
  /data-action="attack-add"/,
  /data-action="equipment-add"/,
  /data-action="spell-add"/,
  /data-action="power-add"/,
  /data-action="trait-remove"/,
  /data-action="skill-remove"/,
  /data-action="technique-remove"/,
  /data-action="attack-remove"/,
  /data-action="equipment-remove"/,
  /data-action="spell-remove"/,
  /data-action="power-remove"/,
]);

const EMPTY_STATE_MESSAGES = Object.freeze([
  "Nenhum traço declarado.",
  "Nenhuma perícia ou técnica declarada.",
  "Nenhum ataque declarado.",
  "Nenhum equipamento declarado.",
  "Nenhuma magia declarada.",
  "Nenhum poder declarado.",
]);

test("table mode renders clear empty states without structural editors", () => {
  const html = renderCharacterMobileApp(emptyCharacter(), { mode: "table" });

  for (const message of EMPTY_STATE_MESSAGES) {
    assert.match(html, new RegExp(message.replaceAll(".", "\\.")));
  }

  assert.match(html, /data-card="traits" data-status="empty"/);
  assert.match(html, /data-card="skills-techniques" data-status="empty"/);
  assert.match(html, /data-card="attacks" data-status="empty"/);
  assert.match(html, /data-card="equipment" data-status="empty"/);
  assert.match(html, /data-card="spells" data-status="empty"/);
  assert.match(html, /data-card="powers" data-status="empty"/);

  for (const structuralPattern of STRUCTURAL_EDITOR_PATTERNS) {
    assert.doesNotMatch(html, structuralPattern);
  }
});

test("creation mode keeps creation affordances while empty sections remain visible", () => {
  const html = renderCharacterMobileApp(emptyCharacter(), { mode: "creation" });

  for (const message of EMPTY_STATE_MESSAGES) {
    assert.match(html, new RegExp(message.replaceAll(".", "\\.")));
  }

  assert.match(html, /data-role="trait-editor"/);
  assert.match(html, /data-role="skill-editor"/);
  assert.match(html, /data-role="technique-editor"/);
  assert.match(html, /data-role="attack-editor"/);
  assert.match(html, /data-role="equipment-editor"/);
  assert.match(html, /data-role="spell-editor"/);
  assert.match(html, /data-role="power-editor"/);
  assert.match(html, /data-action="trait-add"/);
  assert.match(html, /data-action="skill-add"/);
  assert.match(html, /data-action="technique-add"/);
  assert.match(html, /data-action="attack-add"/);
  assert.match(html, /data-action="equipment-add"/);
  assert.match(html, /data-action="spell-add"/);
  assert.match(html, /data-action="power-add"/);
});
