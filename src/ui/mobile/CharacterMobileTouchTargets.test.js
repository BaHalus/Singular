import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { renderCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-touch-targets",
      name: "Ayla",
      concept: "Batedora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: 11,
      DX: 12,
      IQ: 10,
      HT: 11,
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
  });
}

test("mobile entrypoint loads touch-target-only styling after the canonical mobile sheet CSS", () => {
  const html = readFileSync("mobile.html", "utf8");
  const canonical = "./src/ui/mobile/CharacterMobileApp.css";
  const touchTargets = "./src/ui/mobile/CharacterMobileTouchTargets.css";

  assert.match(html, /CharacterMobileTouchTargets\.css/);
  assert.ok(html.indexOf(canonical) < html.indexOf(touchTargets));
});

test("touch target stylesheet hardens existing mobile actions without adding structural behavior", () => {
  const css = readFileSync("src/ui/mobile/CharacterMobileTouchTargets.css", "utf8");

  assert.match(css, /\.singular-mobile-sheet button/);
  assert.match(css, /min-height:\s*2\.75rem/);
  assert.match(css, /min-width:\s*2\.75rem/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /\.singular-mobile-sheet__section-collapse-toggle/);
  assert.doesNotMatch(css, /data-action/);
  assert.doesNotMatch(css, /CommandExecutor|CommandRegistry|ApplicationSession|createCharacter/);
});

test("table mode keeps touchable controls reachable without structural editors", () => {
  const html = renderCharacterMobileApp(character(), {
    mode: "table",
    sectionCollapse: { traits: true },
  });

  assert.match(html, /data-mode="table"/);
  assert.match(html, /class="singular-mobile-sheet__pool-adjust"/);
  assert.match(html, /class="singular-mobile-sheet__section-collapse-toggle"/);
  assert.match(html, /data-action="section-collapse-toggle"/);
  assert.match(html, /data-card="traits" data-status="empty" data-section-collapsible="true" data-collapsed="true"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /data-role="character-summary-editor"/);
  assert.doesNotMatch(html, /data-role="trait-editor"/);
  assert.doesNotMatch(html, /data-action="trait-add"/);
  assert.doesNotMatch(html, /data-action="equipment-add"/);
  assert.match(html, /data-card="attributes"/);
  assert.match(html, /data-card="secondary-characteristics"/);
});
