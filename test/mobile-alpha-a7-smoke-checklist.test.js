import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCharacter } from "../src/domain/character/Character.js";
import { renderCharacterMobileApp } from "../src/ui/mobile/CharacterMobileApp.js";

const ACCEPTANCE_CHECKLIST = Object.freeze([
  "Criação and Mesa modes render through the canonical mobile renderer",
  "Mesa exposes transient controls and keeps structural editors absent",
  "section collapse affordances remain reachable",
  "empty states remain visible",
  "touch target and text overflow guard styles are loaded together",
  "the guard does not introduce UI rules, mutations, or parallel roots",
]);

const FORBIDDEN_PRESENTATION_ORCHESTRATION_PATTERNS = Object.freeze([
  ["\\.inner", "HTML\\s*="],
  ["set", "Item\\("],
  ["create", "Application", "Session"],
  ["Command", "Executor"],
  ["Command", "Registry"],
  ["create", "Command", "Registry"],
  ["create", "Character", "Mobile", "Composition", "Root"],
].map((parts) => new RegExp(parts.join(""))));

function createAlphaSmokeCharacter(overrides = {}) {
  return createCharacter({
    identity: {
      id: "alpha-a7-smoke-character",
      name: "Alpha Smoke Mobile Mesa",
      concept: "Checklist A7",
      playerId: "player-alpha",
      campaignId: "campaign-alpha",
      ...(overrides.identity ?? {}),
    },
    attributes: {
      ST: 10,
      DX: 10,
      IQ: 10,
      HT: 10,
      ...(overrides.attributes ?? {}),
    },
    pools: {
      HP: { current: 8, maximum: 10 },
      FP: { current: 7, maximum: 10 },
      ...(overrides.pools ?? {}),
    },
    traits: overrides.traits ?? [],
    skills: overrides.skills ?? [],
    techniques: overrides.techniques ?? [],
    attacks: overrides.attacks ?? [],
    equipment: overrides.equipment ?? [],
    spells: overrides.spells ?? [],
    powers: overrides.powers ?? [],
    metadata: {
      createdAt: "2026-07-05T07:00:00.000Z",
      updatedAt: "2026-07-05T07:00:00.000Z",
      source: "test",
      ...(overrides.metadata ?? {}),
    },
  });
}

function assertNoStructuralEditorsInTableMode(html) {
  assert.doesNotMatch(html, /data-role="character-name"/);
  assert.doesNotMatch(html, /data-role="character-concept"/);
  assert.doesNotMatch(html, /data-role="trait-editor"/);
  assert.doesNotMatch(html, /data-role="skill-editor"/);
  assert.doesNotMatch(html, /data-role="technique-editor"/);
  assert.doesNotMatch(html, /data-action="trait-add"/);
  assert.doesNotMatch(html, /data-action="skill-add"/);
  assert.doesNotMatch(html, /data-action="technique-add"/);
  assert.doesNotMatch(html, /data-action="equipment-add"/);
  assert.doesNotMatch(html, /data-action="spell-add"/);
  assert.doesNotMatch(html, /data-action="power-add"/);
}

function assertNoParallelUiInfrastructure(label, source) {
  for (const pattern of FORBIDDEN_PRESENTATION_ORCHESTRATION_PATTERNS) {
    assert.doesNotMatch(source, pattern, `${label} must not declare parallel UI infrastructure`);
  }
}

test("A7 smoke checklist is explicit and covers the integrated mobile/table affordances", () => {
  assert.deepEqual(ACCEPTANCE_CHECKLIST, [
    "Criação and Mesa modes render through the canonical mobile renderer",
    "Mesa exposes transient controls and keeps structural editors absent",
    "section collapse affordances remain reachable",
    "empty states remain visible",
    "touch target and text overflow guard styles are loaded together",
    "the guard does not introduce UI rules, mutations, or parallel roots",
  ]);
});

test("mobile entrypoint keeps touch target and overflow guards on the Alpha surface", async () => {
  const mobileHtml = await readFile(new URL("../mobile.html", import.meta.url), "utf8");
  const appStyle = "./src/ui/mobile/CharacterMobileApp.css";
  const touchTargets = "./src/ui/mobile/CharacterMobileTouchTargets.css";
  const overflowGuards = "./src/ui/mobile/CharacterMobileTextOverflowGuards.css";

  assert.ok(mobileHtml.indexOf(appStyle) >= 0, "canonical mobile style is still linked");
  assert.ok(mobileHtml.indexOf(touchTargets) > mobileHtml.indexOf(appStyle));
  assert.ok(mobileHtml.indexOf(overflowGuards) > mobileHtml.indexOf(touchTargets));
  assert.match(mobileHtml, /bootstrapCharacterMobileCompositionRoot/);
  assertNoParallelUiInfrastructure("mobile.html", mobileHtml);
});

test("Mesa smoke keeps transient controls and section collapse reachable without structural editors", () => {
  const html = renderCharacterMobileApp(createAlphaSmokeCharacter(), {
    mode: "table",
    sectionCollapse: { traits: false, equipment: true },
  });

  assert.match(html, /data-mode="table"/);
  assert.match(html, /class="singular-mobile-sheet__pool-adjust"/);
  assert.match(html, /data-pool-adjust="-1"/);
  assert.match(html, /data-pool-adjust="1"/);
  assert.match(html, /class="singular-mobile-sheet__section-collapse-toggle"/);
  assert.match(html, /data-action="section-collapse-toggle"/);
  assert.match(html, /aria-expanded="true" aria-label="Colapsar/);
  assert.match(html, /data-card="traits" data-status="empty" data-section-collapsible="true" data-collapsed="false"/);
  assert.match(html, /data-card="equipment" data-status="empty" data-section-collapsible="true" data-collapsed="true"/);
  assert.match(html, /Nenhum traço declarado\.|Nenhum equipamento declarado\.|Nenhuma perícia ou técnica declarada\./);
  assertNoStructuralEditorsInTableMode(html);
});

test("Criação smoke keeps existing sections, empty states, and structural editors reachable", () => {
  const html = renderCharacterMobileApp(createAlphaSmokeCharacter(), {
    mode: "creation",
    sectionCollapse: { traits: false, "skills-techniques": false },
  });

  assert.match(html, /data-mode="creation"/);
  assert.match(html, /data-card="attributes"/);
  assert.match(html, /data-card="secondary-characteristics"/);
  assert.match(html, /data-card="traits" data-status="empty" data-section-collapsible="true" data-collapsed="false"/);
  assert.match(html, /data-card="skills-techniques" data-status="empty" data-section-collapsible="true" data-collapsed="false"/);
  assert.match(html, /data-role="character-name"/);
  assert.match(html, /data-role="character-concept"/);
  assert.match(html, /data-role="trait-editor"/);
  assert.match(html, /data-role="skill-editor"/);
  assert.match(html, /data-role="technique-editor"/);
  assert.match(html, /data-action="trait-add"/);
  assert.match(html, /data-action="skill-add"/);
  assert.match(html, /data-action="technique-add"/);
  assert.match(html, /Nenhum traço declarado\./);
  assert.match(html, /Nenhuma perícia ou técnica declarada\./);
});

test("A7 smoke guard remains presentation/orchestration-only", async () => {
  const [touchTargetCss, overflowGuardCss] = await Promise.all([
    readFile(new URL("../src/ui/mobile/CharacterMobileTouchTargets.css", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/mobile/CharacterMobileTextOverflowGuards.css", import.meta.url), "utf8"),
  ]);

  assert.match(touchTargetCss, /min-height:\s*2\.75rem|min-width:\s*2\.75rem/);
  assert.match(overflowGuardCss, /overflow-wrap:\s*anywhere/);
  assert.match(overflowGuardCss, /white-space:\s*normal/);
  assert.doesNotMatch(overflowGuardCss, /text-overflow\s*:\s*ellipsis|white-space\s*:\s*nowrap/);
  assertNoParallelUiInfrastructure("touch target guard CSS", touchTargetCss);
  assertNoParallelUiInfrastructure("text overflow guard CSS", overflowGuardCss);
});