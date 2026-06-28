import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-spells",
      name: "Mira",
      concept: "Maga de campo",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: 9,
      DX: 10,
      IQ: 13,
      HT: 10,
    },
    pools: {
      HP: { current: 9, maximum: 9 },
      FP: { current: 12, maximum: 13 },
    },
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
      createdAt: "2026-06-28T19:30:00.000Z",
      updatedAt: "2026-06-28T19:30:00.000Z",
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
    clock: { now: () => "2026-06-28T19:31:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:spell-mobile-${sequence}`;
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
    target: {
      dataset: { action, ...dataset },
      parentElement: null,
    },
    preventDefault() {},
  };
}

test("edits spells in creation mode through canonical commands and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-spells",
    storage: createMemoryStorage(),
    namespace: "test.mobile.spells",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-role="spell-editor"/);
  assert.match(root.innerHTML, /data-action="spell-add"/);
  assert.match(root.innerHTML, /data-spell-id="spell:light"/);
  assert.match(root.innerHTML, /Luz/);

  root.setInput('[data-role="spell-name"]', "Bola de Fogo");
  root.setInput('[data-role="spell-type"]', "standard");
  root.setInput('[data-role="spell-attribute"]', "IQ");
  root.setInput('[data-role="spell-difficulty"]', "H");
  root.setInput('[data-role="spell-points"]', "4");
  root.setInput('[data-role="spell-class"]', "Projétil");
  root.setInput('[data-role="spell-resistance"]', "");
  root.setInput('[data-role="spell-casting-cost"]', "1 a 3");
  root.setInput('[data-role="spell-maintenance-cost"]', "—");
  root.setInput('[data-role="spell-casting-time"]', "1 a 3s");
  root.setInput('[data-role="spell-duration"]', "instantânea");
  root.setInput('[data-role="spell-notes"]', "dano declarado pelo contrato");
  await root.dispatch("click", click("spell-add"));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "spell.add");
  assert.deepEqual(await mounted.repositories.session.listIds(), []);
  assert.equal(mounted.character.spells.length, 2);
  assert.equal(mounted.character.spells[1].name, "Bola de Fogo");
  assert.equal(mounted.character.spells[1].spellType, "standard");
  assert.equal(mounted.character.spells[1].attribute, "IQ");
  assert.equal(mounted.character.spells[1].difficulty, "H");
  assert.equal(mounted.character.spells[1].points, 4);
  assert.equal(mounted.character.spells[1].spellClass, "Projétil");
  assert.equal(mounted.character.spells[1].castingCost, "1 a 3");
  assert.equal(mounted.character.spells[1].castingTime, "1 a 3s");
  assert.match(root.innerHTML, /Bola de Fogo/);
  assert.match(root.innerHTML, /Projétil/);
  assert.match(root.innerHTML, /PF 1 a 3/);

  const addedId = mounted.character.spells[1].id;
  await root.dispatch("click", click("spell-reorder", {
    spellId: addedId,
    targetIndex: "0",
  }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history[1].commandType, "spell.reorder");
  assert.deepEqual(mounted.character.spells.map(spell => spell.name), ["Bola de Fogo", "Luz"]);

  await root.dispatch("click", click("spell-remove", { spellId: "spell:light" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 3);
  assert.equal(mounted.session.history[2].commandType, "spell.remove");
  assert.deepEqual(mounted.character.spells.map(spell => spell.name), ["Bola de Fogo"]);
  assert.doesNotMatch(root.innerHTML, /Luz/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-spells");

  assert.equal(saved.revision, 3);
  assert.deepEqual(saved.character.spells.map(spell => spell.name), ["Bola de Fogo"]);
  assert.equal(saved.character.spells[0].castingCost, "1 a 3");
});

test("blocks structural spell actions in table mode while preserving transient pools", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-spells-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.spells.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-role="spell-editor"/);

  await root.dispatch("click", click("spell-remove", { spellId: "spell:light" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.deepEqual(mounted.character.spells.map(spell => spell.name), ["Luz"]);

  await root.dispatch("click", {
    target: {
      dataset: { poolKey: "FP", poolAdjust: "-1" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.pools.FP.current, 11);
  assert.deepEqual(mounted.character.spells.map(spell => spell.name), ["Luz"]);
});
