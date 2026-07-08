import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { renderCharacterMobileApp } from "./CharacterMobileApp.js";

const LONG_LABEL = "Nome extremamente longo sem espaços para verificar guardas de overflow em celular e Mesa";
const LONG_TOKEN = "TextoSuperLongoSemEspacosParaNaoSerCortadoEmCartoesMobileMesaAcoesValoresRotulos";

function characterWithLongRenderedText() {
  return createCharacter({
    identity: {
      id: "character-text-overflow-guards",
      name: `${LONG_LABEL} ${LONG_TOKEN}`,
      concept: `Conceito ${LONG_TOKEN}`,
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: 10,
      DX: 10,
      IQ: 10,
      HT: 10,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 10, maximum: 10 },
    },
    traits: [
      {
        id: "trait-overflow",
        name: `Vantagem ${LONG_TOKEN}`,
        role: "advantage",
        points: 15,
        levels: 3,
        notes: `Notas ${LONG_TOKEN}`,
        tags: [LONG_TOKEN],
      },
    ],
    skills: [
      {
        id: "skill-overflow",
        name: `Perícia ${LONG_TOKEN}`,
        specialization: `Especialização ${LONG_TOKEN}`,
        attribute: "DX",
        difficulty: "A",
        points: 4,
        notes: `Notas ${LONG_TOKEN}`,
        tags: [LONG_TOKEN],
      },
    ],
    techniques: [],
    attacks: [],
    equipment: [],
    spells: [],
    powers: [],
    metadata: {
      createdAt: "2026-07-05T06:00:00.000Z",
      updatedAt: "2026-07-05T06:00:00.000Z",
      source: "test",
    },
  });
}

test("mobile entrypoint loads text-overflow guards after canonical and touch target styles", () => {
  const html = readFileSync("mobile.html", "utf8");
  const canonical = "./src/ui/mobile/CharacterMobileApp.css";
  const touchTargets = "./src/ui/mobile/CharacterMobileTouchTargets.css";
  const overflowGuards = "./src/ui/mobile/CharacterMobileTextOverflowGuards.css";

  assert.match(html, /CharacterMobileTextOverflowGuards\.css/);
  assert.ok(html.indexOf(canonical) < html.indexOf(overflowGuards));
  assert.ok(html.indexOf(touchTargets) < html.indexOf(overflowGuards));
});

test("text-overflow guards are presentation-only and avoid truncation primitives", () => {
  const css = readFileSync("src/ui/mobile/CharacterMobileTextOverflowGuards.css", "utf8");

  assert.match(css, /\.singular-mobile-sheet h1/);
  assert.match(css, /\.singular-mobile-sheet dt/);
  assert.match(css, /\.singular-mobile-sheet dd/);
  assert.match(css, /\.singular-mobile-sheet__section-collapse-toggle/);
  assert.match(css, /\.singular-mobile-sheet__equipment-state-totals/);
  assert.match(css, /\.singular-mobile-sheet__spell-actions button/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /white-space:\s*normal/);
  assert.match(css, /min-width:\s*0/);
  assert.doesNotMatch(css, /text-overflow\s*:\s*ellipsis/);
  assert.doesNotMatch(css, /white-space\s*:\s*nowrap/);
  assert.doesNotMatch(css, /data-action/);
  assert.doesNotMatch(css, /CommandExecutor|CommandRegistry|ApplicationSession|createCharacter/);
});

test("text-overflow guards preserve touch target minimums on action buttons", () => {
  const css = readFileSync("src/ui/mobile/CharacterMobileTextOverflowGuards.css", "utf8");
  const actionButtonRule = css.match(
    /\.singular-mobile-sheet__section-collapse-toggle,[\s\S]*?\.singular-mobile-sheet__note-actions button \{([\s\S]*?)\}/,
  );

  assert.ok(actionButtonRule);
  assert.match(actionButtonRule[1], /min-width:\s*2\.75rem/);
  assert.doesNotMatch(actionButtonRule[1], /min-width:\s*0/);
  assert.match(actionButtonRule[1], /white-space:\s*normal/);
});

test("table mode preserves long rendered content and reachable controls without structural editors", () => {
  const html = renderCharacterMobileApp(characterWithLongRenderedText(), {
    mode: "table",
    sectionCollapse: { traits: false, "skills-techniques": false },
  });

  assert.match(html, /data-mode="table"/);
  assert.match(html, new RegExp(LONG_TOKEN));
  assert.match(html, /class="singular-mobile-sheet__section-collapse-toggle"/);
  assert.match(html, /data-action="section-collapse-toggle"/);
  assert.match(html, /class="singular-mobile-sheet__pool-adjust"/);
  assert.match(html, /data-card="traits" data-status="declared-only" data-section-collapsible="true" data-collapsed="false"/);
  assert.match(html, /data-card="skills-techniques" data-status="declared-only" data-section-collapsible="true" data-collapsed="false"/);
  assert.doesNotMatch(html, /data-role="trait-editor"/);
  assert.doesNotMatch(html, /data-role="skill-editor"/);
  assert.doesNotMatch(html, /data-action="trait-add"/);
  assert.doesNotMatch(html, /data-action="skill-add"/);
  assert.doesNotMatch(html, /data-action="equipment-add"/);
});

test("creation mode keeps existing sections and controls visible with long rendered labels", () => {
  const html = renderCharacterMobileApp(characterWithLongRenderedText(), {
    mode: "creation",
  });

  assert.match(html, new RegExp(LONG_TOKEN));
  assert.match(html, /data-card="attributes"/);
  assert.match(html, /data-card="secondary-characteristics"/);
  assert.match(html, /data-card="traits" data-status="declared-only"/);
  assert.match(html, /data-card="skills-techniques" data-status="declared-only"/);
  assert.match(html, /data-role="trait-editor"/);
  assert.match(html, /data-role="skill-editor"/);
  assert.match(html, /data-action="trait-add"/);
  assert.match(html, /data-action="skill-add"/);
  assert.match(html, /class="singular-mobile-sheet__trait-actions"/);
  assert.match(html, /class="singular-mobile-sheet__skill-actions"/);
});
