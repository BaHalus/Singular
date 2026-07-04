import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../src/domain/character/Character.js";
import { createApplicationSession } from "../src/application/session/ApplicationSession.js";
import { renderCharacterMobileApp } from "../src/ui/mobile/CharacterMobileApp.js";
import {
  mountCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "../src/ui/mobile/CharacterMobilePostRenderLifecycle.js";

test("A8 final alpha mobile composition gate stays idempotent across render, remount and mode changes", () => {
  const character = createAlphaCharacter();
  const session = createApplicationSession({ id: "session-a8-final", character });
  const root = createRoot();
  const postRenderLifecycle = createCharacterMobilePostRenderLifecycle();
  let mode = "creation";
  let baseRenderCount = 0;
  let modeSyncCount = 0;

  const app = Object.freeze({
    get character() { return session.character; },
    get session() { return session; },
    get html() { return root.innerHTML; },
    get mode() { return mode; },
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() { modeSyncCount += 1; }, destroy() {} }),
    ui: Object.freeze({
      render({ mode: renderMode } = {}) {
        return renderCharacterMobileApp(session.character, { mode: renderMode ?? mode });
      },
      getState() { return Object.freeze({ busy: false }); },
    }),
    persistence: Object.freeze({ getActiveSession() { return session; } }),
    commands: Object.freeze({
      addLanguage: noOpCommand,
      removeLanguage: noOpCommand,
      reorderLanguage: noOpCommand,
      addFamiliarity: noOpCommand,
      removeFamiliarity: noOpCommand,
      reorderFamiliarity: noOpCommand,
      updateSecondaryCharacteristic: noOpCommand,
      clearSecondaryCharacteristicOverride: noOpCommand,
      setPoolMaximum: noOpCommand,
      saveGeneralNotes: noOpCommand,
      addStructuredNote: noOpCommand,
      updateStructuredNote: noOpCommand,
      removeStructuredNote: noOpCommand,
      reorderStructuredNote: noOpCommand,
      addTrait: noOpCommand,
      updateTrait: noOpCommand,
      removeTrait: noOpCommand,
      reorderTrait: noOpCommand,
      addSkill: noOpCommand,
      updateSkill: noOpCommand,
      removeSkill: noOpCommand,
      reorderSkill: noOpCommand,
      addTechnique: noOpCommand,
      updateTechnique: noOpCommand,
      removeTechnique: noOpCommand,
      reorderTechnique: noOpCommand,
      updateAttack: noOpCommand,
      updateEquipment: noOpCommand,
      updateSpell: noOpCommand,
      renamePower: noOpCommand,
    }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle,
    render(options = {}) {
      baseRenderCount += 1;
      const renderMode = options.mode ?? mode;
      root.innerHTML = renderCharacterMobileApp(session.character, { mode: renderMode });
      root.setAttribute("data-mode", renderMode);
      if (!options.skipPostRenderLifecycle) {
        postRenderLifecycle.run({ root, character: session.character, session, mode: renderMode });
      }
      return root.innerHTML;
    },
  });

  const mounted = mountCharacterMobileCompositionRoot(app, { root });

  assertCreationSurface(root.innerHTML);

  mounted.render();
  mounted.render();

  assert.ok(baseRenderCount >= 2);
  assertCreationSurface(root.innerHTML);

  mode = "table";
  mounted.render();

  assertTableSurface(root.innerHTML);

  mode = "creation";
  mounted.render();

  assertCreationSurface(root.innerHTML);
  assert.ok(modeSyncCount >= 4);

  mounted.compositionRoot.destroy();
  postRenderLifecycle.run({ root, character: session.character, session, mode: "creation" });

  assertCreationSurface(root.innerHTML);
});

function createAlphaCharacter() {
  return createCharacter({
    identity: {
      id: "character-a8-final",
      name: "A8 Final",
      concept: "Alpha mobile composition gate",
      playerId: "player-a8",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 11, DX: 12, IQ: 11, HT: 10 },
    secondaryCharacteristics: {
      HP: { base: 11, override: 12 },
      FP: { base: 10, override: null },
      Will: { base: 11, override: 12 },
      Per: { base: 11, override: null },
      BasicSpeed: { base: 5.5, override: null },
      BasicMove: { base: 5, override: 6 },
    },
    pools: {
      HP: { current: 12, maximum: 12 },
      FP: { current: 10, maximum: 10 },
    },
    traits: [{
      id: "trait-combat-reflexes",
      name: "Reflexos em Combate",
      role: "advantage",
      points: 15,
      levels: null,
      selfControl: null,
      frequency: null,
      roundCostDown: false,
      choices: [],
      notes: "A8 trait surface",
      tags: ["a8"],
    }],
    skills: [{
      id: "skill-broadsword",
      name: "Espada de Lâmina Larga",
      specialization: "",
      techLevel: null,
      attribute: "DX",
      difficulty: "A",
      points: 2,
      notes: "A8 skill surface",
      tags: ["a8"],
    }],
    techniques: [{
      id: "technique-feint",
      name: "Finta",
      specialization: "Espada de Lâmina Larga",
      skillId: "skill-broadsword",
      skillName: "Espada de Lâmina Larga",
      skillSpecialization: "",
      difficulty: "A",
      points: 1,
      defaultPenalty: -4,
      maximumRelativeLevel: 0,
      notes: "A8 technique surface",
      tags: ["a8"],
    }],
    attacks: [{
      id: "attack-sword",
      name: "Espada longa",
      category: "melee",
      skillId: "skill-broadsword",
      damage: { value: "1d+2", type: "cut" },
      reach: "1",
      range: null,
      notes: "A8 attack surface",
    }],
    equipment: [{
      id: "equipment-rope",
      name: "Corda",
      quantity: 1,
      state: "carried",
      weightKg: 2.5,
      cost: 10,
      notes: "15 m",
    }],
    spells: [{
      id: "spell-ignite",
      name: "Ignite Fire",
      spellType: "standard",
      attribute: "IQ",
      difficulty: "H",
      points: 1,
      spellClass: "Regular",
      resistance: "",
      castingCost: "1",
      maintenanceCost: "0",
      castingTime: "1 s",
      duration: "1 min",
      notes: "A8 spell surface",
    }],
    powers: [{
      id: "power-divine-favor",
      name: "Divine Favor",
      source: "divine",
      powerModifier: { name: "Pacto", valuePercent: -10, notes: "A8 power modifier" },
      talentTraitId: null,
      memberTraitIds: [],
      tags: ["a8"],
      notes: "A8 power surface",
    }],
    languages: [{
      id: "language-norse",
      name: "Nórdico Antigo",
      spokenLevel: "native",
      writtenLevel: "accented",
      native: true,
      notes: "A8 language surface",
      tags: ["a8"],
    }],
    familiarities: [{
      id: "familiarity-yrth",
      name: "Yrth",
      native: true,
      notes: "A8 familiarity surface",
      tags: ["a8"],
    }],
    notes: {
      general: "A8 operational final note",
      structured: [{
        id: "note-a8",
        title: "Mesa",
        text: "Checar composição final.",
        category: "sessão",
        reference: "A8",
        tags: ["alpha", "mobile"],
      }],
    },
    metadata: {
      createdAt: "2026-07-04T07:40:00.000Z",
      updatedAt: "2026-07-04T07:40:00.000Z",
      source: "test",
    },
  });
}

function assertCreationSurface(html) {
  assertSingle(html, 'data-role="language-editor"');
  assertSingle(html, 'data-role="familiarity-editor"');
  assertSingle(html, 'data-role="trait-editor"');
  assertSingle(html, 'data-role="skill-editor"');
  assertSingle(html, 'data-role="technique-editor"');
  assertSingle(html, 'data-role="attack-editor"');
  assertSingle(html, 'data-role="equipment-editor"');
  assertSingle(html, 'data-role="spell-editor"');
  assertSingle(html, 'data-role="power-editor"');
  assertSingle(html, 'data-role="general-notes-editor"');
  assertSingle(html, 'data-role="structured-note-editor"');
  assertSingle(html, 'data-role="structured-note-inline-editor"');
  assert.equal(count(html, 'data-action="secondary-base-set"'), 6);
  assert.equal(count(html, 'data-card="notes"'), 1);
  assert.equal(count(html, 'data-card="languages-culture"'), 1);
  assert.equal(count(html, 'data-card="traits"'), 1);
  assert.equal(count(html, 'data-card="skills-techniques"'), 1);
  assert.equal(count(html, 'data-card="attacks"'), 1);
  assert.equal(count(html, 'data-card="equipment"'), 1);
  assert.equal(count(html, 'data-card="spells"'), 1);
  assert.equal(count(html, 'data-card="powers"'), 1);
}

function assertTableSurface(html) {
  assert.equal(count(html, 'data-role="language-editor"'), 0);
  assert.equal(count(html, 'data-role="familiarity-editor"'), 0);
  assert.equal(count(html, 'data-role="trait-editor"'), 0);
  assert.equal(count(html, 'data-role="skill-editor"'), 0);
  assert.equal(count(html, 'data-role="technique-editor"'), 0);
  assert.equal(count(html, 'data-role="attack-editor"'), 0);
  assert.equal(count(html, 'data-role="equipment-editor"'), 0);
  assert.equal(count(html, 'data-role="spell-editor"'), 0);
  assert.equal(count(html, 'data-role="power-editor"'), 0);
  assert.equal(count(html, 'data-role="general-notes-editor"'), 0);
  assert.equal(count(html, 'data-role="structured-note-editor"'), 0);
  assert.equal(count(html, 'data-role="structured-note-inline-editor"'), 0);
  assert.equal(count(html, 'data-action="secondary-base-set"'), 0);
  assert.equal(count(html, 'data-card="notes"'), 1);
  assert.match(html, /A8 operational final note/);
}

function createRoot() {
  const listeners = new Map();
  const attributes = new Map();
  return {
    innerHTML: "",
    ownerDocument: createDocument(),
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

function createDocument() {
  return {
    createElement(tagName) {
      if (tagName !== "template") return null;
      return {
        content: { childNodes: [] },
        set innerHTML(value) { this.content.childNodes = [String(value)]; },
      };
    },
  };
}

function noOpCommand() {
  return Object.freeze({ status: "no-op" });
}

function assertSingle(html, needle) {
  assert.equal(count(html, needle), 1, `${needle} should appear exactly once`);
}

function count(html, needle) {
  return html.split(needle).length - 1;
}
