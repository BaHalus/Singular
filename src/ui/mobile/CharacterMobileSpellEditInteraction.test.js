import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileSpellEditApp,
  injectMobileSpellEditControls,
} from "./CharacterMobileSpellEditApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-spell-edit",
      name: "Mira",
      concept: "Maga de campo",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 9, DX: 10, IQ: 13, HT: 10 },
    spells: [
      {
        id: "spell:light",
        spellType: "standard",
        name: "Luz",
        attribute: "IQ",
        difficulty: "H",
        points: 1,
        spellClass: "Regular",
        resistance: "",
        castingCost: "1",
        maintenanceCost: "1",
        castingTime: "1s",
        duration: "1 min",
        notes: "ilumina",
      },
    ],
    metadata: {
      createdAt: "2026-06-29T08:40:00.000Z",
      updatedAt: "2026-06-29T08:40:00.000Z",
      source: "test",
    },
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-29T08:41:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:spell-edit-mobile-${sequence}`;
      },
    },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  const inputValues = new Map();
  return {
    innerHTML: "",
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter(entry => entry !== listener));
    },
    querySelector(selector) { return { value: inputValues.get(selector) ?? "" }; },
    querySelectorAll() { return []; },
    setInput(selector, value) { inputValues.set(selector, value); },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) await listener(event);
    },
  };
}

function click(action, dataset = {}) {
  return {
    target: { dataset: { action, ...dataset }, parentElement: null },
    preventDefault() {},
  };
}

test("injects mobile spell edit controls only in creation mode", () => {
  const fixture = character();
  const html = '<section data-card="spells"><h2>Magias</h2><dl><div data-spell-id="spell:light"><dt>Magia</dt><dd>Luz</dd></div></dl></section>';

  const creation = injectMobileSpellEditControls(html, fixture, "creation");
  assert.match(creation, /data-action="spell-update"/);
  assert.match(creation, /data-role="spell-inline-editor"/);

  const table = injectMobileSpellEditControls(html, fixture, "table");
  assert.doesNotMatch(table, /data-action="spell-update"/);
});

test("edits existing mobile spells through canonical commands and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSpellEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-spell-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.spell-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="spell-update"/);
  assert.match(root.innerHTML, /data-action="persistence-save"/);
  assert.match(root.innerHTML, /Luz/);

  root.setInput('[data-role="spell-edit-name-spell:light"]', "Luz Maior");
  root.setInput('[data-role="spell-edit-type-spell:light"]', "ritualMagic");
  root.setInput('[data-role="spell-edit-attribute-spell:light"]', "IQ");
  root.setInput('[data-role="spell-edit-difficulty-spell:light"]', "VH");
  root.setInput('[data-role="spell-edit-points-spell:light"]', "2");
  root.setInput('[data-role="spell-edit-class-spell:light"]', "Área");
  root.setInput('[data-role="spell-edit-resistance-spell:light"]', "Vontade");
  root.setInput('[data-role="spell-edit-casting-cost-spell:light"]', "2");
  root.setInput('[data-role="spell-edit-maintenance-cost-spell:light"]', "1");
  root.setInput('[data-role="spell-edit-casting-time-spell:light"]', "2s");
  root.setInput('[data-role="spell-edit-duration-spell:light"]', "2 min");
  root.setInput('[data-role="spell-edit-notes-spell:light"]', "luz editada");
  await root.dispatch("click", click("spell-update", { spellId: "spell:light" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "spell.update");
  assert.equal(mounted.character.spells[0].name, "Luz Maior");
  assert.equal(mounted.character.spells[0].spellType, "ritualMagic");
  assert.equal(mounted.character.spells[0].difficulty, "VH");
  assert.equal(mounted.character.spells[0].points, 2);
  assert.equal(mounted.character.spells[0].spellClass, "Área");
  assert.equal(mounted.character.spells[0].resistance, "Vontade");
  assert.equal(mounted.character.spells[0].castingTime, "2s");
  assert.match(root.innerHTML, /Luz Maior/);
  assert.match(root.innerHTML, /data-action="persistence-save"/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-spell-edit");

  assert.notEqual(saved, null, JSON.stringify({ state: mounted.ui.getState(), html: root.innerHTML }));
  assert.equal(saved.revision, 1);
  assert.equal(saved.character.spells[0].name, "Luz Maior");
  assert.equal(saved.character.spells[0].spellType, "ritualMagic");
  assert.equal(saved.character.spells[0].points, 2);
});

test("blocks existing mobile spell edits in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSpellEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-spell-edit-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.spell-edit.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="spell-update"/);

  await root.dispatch("click", click("spell-update", { spellId: "spell:light" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.spells[0].name, "Luz");
});
