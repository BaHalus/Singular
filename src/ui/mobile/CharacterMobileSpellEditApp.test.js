import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileSpellEditApp,
  injectMobileSpellEditControls,
} from "./CharacterMobileSpellEditApp.js";

function character() {
  return {
    spells: [
      {
        id: "spell:ignite",
        name: "Acender Fogo",
        spellType: "standard",
        attribute: "IQ",
        difficulty: "H",
        points: 2,
        spellClass: "Regular",
        resistance: "",
        castingCost: "1",
        maintenanceCost: "0",
        castingTime: "1s",
        duration: "1 min",
        notes: "\nfunciona melhor em pavio seco\nsem cálculo na UI",
      },
    ],
  };
}

function fullCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-spell-edit",
      name: "Lio",
      concept: "Mago",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 10, IQ: 12, HT: 10 },
    ...character(),
    metadata: {
      createdAt: "2026-06-30T13:40:00.000Z",
      updatedAt: "2026-06-30T13:40:00.000Z",
      source: "test",
    },
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-30T13:41:00.000Z" },
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
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter(entry => entry !== listener));
    },
    querySelector(selector) {
      return { value: inputValues.get(selector) ?? "" };
    },
    querySelectorAll() {
      return [];
    },
    setInput(selector, value) {
      inputValues.set(selector, value);
    },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
}

function click(action, dataset = {}) {
  return {
    target: { dataset: { action, ...dataset }, parentElement: null },
    preventDefault() {},
  };
}

test("injects mobile spell inline controls with multiline notes editor only in creation mode", () => {
  const html = '<section data-card="spells"><h2>Magias</h2><dl><div data-spell-id="spell:ignite"><dt>Magia</dt><dd>Acender Fogo</dd></div></dl></section>';

  const creation = injectMobileSpellEditControls(html, character(), "creation");
  assert.match(creation, /data-role="spell-inline-editor"/);
  assert.match(creation, /data-action="spell-update"/);
  assert.match(creation, /<textarea data-role="spell-edit-notes-spell:ignite"/);
  assert.match(creation, /<textarea data-role="spell-edit-notes-spell:ignite" autocomplete="off">\n\nfunciona melhor em pavio seco\nsem cálculo na UI<\/textarea>/);

  const table = injectMobileSpellEditControls(html, character(), "table");
  assert.doesNotMatch(table, /data-role="spell-inline-editor"/);
  assert.doesNotMatch(table, /data-action="spell-update"/);
});

test("persists existing mobile spell edit through canonical session save", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSpellEditApp({
    root,
    character: fullCharacter(),
    sessionId: "session-mobile-spell-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.spell-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="spell-update"/);
  assert.match(root.innerHTML, /Acender Fogo/);

  root.setInput('[data-role="spell-edit-name-spell:ignite"]', "Chama Controlada");
  root.setInput('[data-role="spell-edit-type-spell:ignite"]', "ritualMagic");
  root.setInput('[data-role="spell-edit-attribute-spell:ignite"]', "IQ");
  root.setInput('[data-role="spell-edit-difficulty-spell:ignite"]', "VH");
  root.setInput('[data-role="spell-edit-points-spell:ignite"]', "4");
  root.setInput('[data-role="spell-edit-class-spell:ignite"]', "Regular; Área");
  root.setInput('[data-role="spell-edit-resistance-spell:ignite"]', "HT");
  root.setInput('[data-role="spell-edit-casting-cost-spell:ignite"]', "2");
  root.setInput('[data-role="spell-edit-maintenance-cost-spell:ignite"]', "1");
  root.setInput('[data-role="spell-edit-casting-time-spell:ignite"]', "2s");
  root.setInput('[data-role="spell-edit-duration-spell:ignite"]', "10 min");
  root.setInput('[data-role="spell-edit-notes-spell:ignite"]', "Controla pavios.\nLinha 2");
  await root.dispatch("click", click("spell-update", { spellId: "spell:ignite" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "spell.update");
  assert.equal(mounted.character.spells[0].name, "Chama Controlada");
  assert.equal(mounted.character.spells[0].spellType, "ritualMagic");
  assert.equal(mounted.character.spells[0].difficulty, "VH");
  assert.equal(mounted.character.spells[0].points, 4);
  assert.equal(mounted.character.spells[0].notes, "Controla pavios.\nLinha 2");
  assert.match(root.innerHTML, /Chama Controlada/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-spell-edit");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.spells[0].id, "spell:ignite");
  assert.equal(saved.character.spells[0].name, "Chama Controlada");
  assert.equal(saved.character.spells[0].spellType, "ritualMagic");
  assert.equal(saved.character.spells[0].attribute, "IQ");
  assert.equal(saved.character.spells[0].difficulty, "VH");
  assert.equal(saved.character.spells[0].points, 4);
  assert.equal(saved.character.spells[0].spellClass, "Regular; Área");
  assert.equal(saved.character.spells[0].resistance, "HT");
  assert.equal(saved.character.spells[0].castingCost, "2");
  assert.equal(saved.character.spells[0].maintenanceCost, "1");
  assert.equal(saved.character.spells[0].castingTime, "2s");
  assert.equal(saved.character.spells[0].duration, "10 min");
  assert.equal(saved.character.spells[0].notes, "Controla pavios.\nLinha 2");
});
