import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileAttackEditApp } from "./CharacterMobileAttackEditApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-attack-edit",
      name: "Rauk",
      concept: "Duelista",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 11, DX: 12, IQ: 10, HT: 11 },
    attacks: [
      {
        id: "attack:longsword",
        name: "Espada Longa",
        category: "melee",
        skillId: "skill:sword",
        source: { kind: "manual", id: null },
        damage: { value: "1d+2", type: "cut" },
        reach: "1",
        range: null,
        notes: "Ataque principal.",
      },
    ],
    metadata: {
      createdAt: "2026-06-28T22:55:00.000Z",
      updatedAt: "2026-06-28T22:55:00.000Z",
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
    clock: { now: () => "2026-06-28T22:56:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:attack-edit-mobile-${sequence}`;
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

test("edits an existing mobile attack through the canonical update command", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileAttackEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-attack-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.attack-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="attack-update"/);
  assert.match(root.innerHTML, /Espada Longa/);

  root.setInput('[data-role="attack-edit-name-attack:longsword"]', "Espada Longa em Arco");
  root.setInput('[data-role="attack-edit-category-attack:longsword"]', "melee");
  root.setInput('[data-role="attack-edit-skill-id-attack:longsword"]', "skill:broadsword");
  root.setInput('[data-role="attack-edit-damage-value-attack:longsword"]', "2d");
  root.setInput('[data-role="attack-edit-damage-type-attack:longsword"]', "cut");
  root.setInput('[data-role="attack-edit-reach-attack:longsword"]', "1,2");
  root.setInput('[data-role="attack-edit-range-attack:longsword"]', "");
  root.setInput('[data-role="attack-edit-notes-attack:longsword"]', "Ataque ajustado.");
  await root.dispatch("click", click("attack-update", { attackId: "attack:longsword" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "attack.update");
  assert.equal(mounted.character.attacks[0].name, "Espada Longa em Arco");
  assert.equal(mounted.character.attacks[0].skillId, "skill:broadsword");
  assert.equal(mounted.character.attacks[0].damage.value, "2d");
  assert.equal(mounted.character.attacks[0].reach, "1,2");
  assert.match(root.innerHTML, /Espada Longa em Arco/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-attack-edit");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.attacks[0].name, "Espada Longa em Arco");
});

test("blocks existing mobile attack edits in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileAttackEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-attack-edit-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.attack-edit.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="attack-update"/);

  await root.dispatch("click", click("attack-update", { attackId: "attack:longsword" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.attacks[0].name, "Espada Longa");
});
