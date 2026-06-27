import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

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
      values.delete(key);
    },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-27T19:30:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:spell-ui-${sequence}`;
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
      if (!inputValues.has(selector)) return null;
      return { value: inputValues.get(selector) };
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

function character() {
  return createCharacter({
    identity: {
      id: "character-spell-mobile",
      name: "Iotha",
      concept: "Maga",
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 11, maximum: 11 },
    },
  });
}

test("adds a spell through the mobile UI command path and preserves manual save", async () => {
  const root = rootFixture();
  const storage = createMemoryStorage();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-spell-mobile",
    storage,
    namespace: "test.mobile.spell-roundtrip",
    runtime: runtime(),
    mode: "creation",
  });

  root.setInput('[data-role="spell-name"]', "Bola de Fogo");
  root.setInput('[data-role="spell-type"]', "standard");
  root.setInput('[data-role="spell-attribute"]', "IQ");
  root.setInput('[data-role="spell-difficulty"]', "H");
  root.setInput('[data-role="spell-points"]', "4");
  root.setInput('[data-role="spell-class"]', "Projétil");
  root.setInput('[data-role="spell-resistance"]', "");
  root.setInput('[data-role="spell-casting-cost"]', "1 a 3");
  root.setInput('[data-role="spell-maintenance-cost"]', "");
  root.setInput('[data-role="spell-casting-time"]', "1s");
  root.setInput('[data-role="spell-duration"]', "Instantânea");
  root.setInput('[data-role="spell-notes"]', "Declarada pela UI mobile");

  await root.dispatch("click", {
    target: {
      dataset: { action: "spell-add" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "spell.add");
  assert.equal(mounted.character.spells.length, 1);
  assert.equal(mounted.character.spells[0].name, "Bola de Fogo");
  assert.equal(mounted.character.spells[0].points, 4);
  assert.equal(mounted.character.spells[0].castingCost, "1 a 3");
  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.match(root.innerHTML, /Bola de Fogo/);
  assert.deepEqual(await mounted.repositories.session.listIds(), []);

  await root.dispatch("click", {
    target: {
      dataset: { action: "persistence-save" },
      parentElement: null,
    },
  });
  const saved = await mounted.repositories.session.load("session-spell-mobile");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.spells[0].name, "Bola de Fogo");
});

test("blocks structural spell edits in table mode while keeping PV and PF operational", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-spell-table-mode",
    storage: createMemoryStorage(),
    namespace: "test.mobile.spell-table-mode",
    runtime: runtime(),
    mode: "table",
  });

  await root.dispatch("click", {
    target: {
      dataset: { action: "spell-add" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 0);
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");

  await root.dispatch("click", {
    target: {
      dataset: { poolKey: "FP", poolAdjust: "-1" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.pools.FP.current, 10);
  assert.equal(root.getAttribute("data-last-command-status"), "applied");
});
