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
      values.delete(String(key));
    },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-27T09:30:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:equipment-ui-${sequence}`;
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
      id: "character-equipment-mobile",
      name: "Ayla",
      concept: "Batedora",
    },
    pools: {
      HP: { current: 11, maximum: 11 },
      FP: { current: 10, maximum: 10 },
    },
  });
}

test("adds equipment through the mobile UI command path and preserves manual save", async () => {
  const root = rootFixture();
  const storage = createMemoryStorage();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-equipment-mobile",
    storage,
    namespace: "test.mobile.equipment-roundtrip",
    runtime: runtime(),
    mode: "creation",
  });

  root.setInput('[data-role="equipment-name"]', "Mochila");
  root.setInput('[data-role="equipment-kind"]', "container");
  root.setInput('[data-role="equipment-quantity"]', "1");
  root.setInput('[data-role="equipment-weight-kg"]', "1.5");
  root.setInput('[data-role="equipment-cost"]', "60");
  root.setInput('[data-role="equipment-state"]', "carried");
  root.setInput('[data-role="equipment-notes"]', "Carga inicial");

  await root.dispatch("click", {
    target: {
      dataset: { action: "equipment-add" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "equipment.add");
  assert.equal(mounted.character.equipment.length, 1);
  assert.equal(mounted.character.equipment[0].name, "Mochila");
  assert.equal(mounted.character.equipment[0].kind, "container");
  assert.equal(mounted.character.equipment[0].containerKind, "physical");
  assert.equal(mounted.character.equipment[0].weightKg, 1.5);
  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.match(root.innerHTML, /Mochila/);
  assert.deepEqual(await mounted.repositories.session.listIds(), []);

  await root.dispatch("click", {
    target: {
      dataset: { action: "persistence-save" },
      parentElement: null,
    },
  });
  const saved = await mounted.repositories.session.load("session-equipment-mobile");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.equipment[0].name, "Mochila");
});

test("blocks structural equipment edits in table mode while keeping PV and PF operational", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-equipment-table-mode",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment-table-mode",
    runtime: runtime(),
    mode: "table",
  });

  await root.dispatch("click", {
    target: {
      dataset: { action: "equipment-add" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 0);
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");

  await root.dispatch("click", {
    target: {
      dataset: { poolKey: "HP", poolAdjust: "-1" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.pools.HP.current, 10);
  assert.equal(root.getAttribute("data-last-command-status"), "applied");
});
