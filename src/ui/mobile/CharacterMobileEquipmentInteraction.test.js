import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-equipment",
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
    equipment: [
      {
        id: "equipment:torch",
        kind: "item",
        name: "Tocha",
        quantity: 1,
        weightKg: 0.5,
        cost: 3,
        state: "carried",
        notes: "acesa",
      },
    ],
    metadata: {
      createdAt: "2026-06-28T18:30:00.000Z",
      updatedAt: "2026-06-28T18:30:00.000Z",
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
    clock: { now: () => "2026-06-28T18:31:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:equipment-mobile-${sequence}`;
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

test("edits equipment in creation mode through canonical commands and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-equipment",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-role="equipment-editor"/);
  assert.match(root.innerHTML, /data-action="equipment-add"/);
  assert.match(root.innerHTML, /data-equipment-id="equipment:torch"/);
  assert.match(root.innerHTML, /Tocha/);

  root.setInput('[data-role="equipment-name"]', "Corda");
  root.setInput('[data-role="equipment-kind"]', "item");
  root.setInput('[data-role="equipment-quantity"]', "2");
  root.setInput('[data-role="equipment-weight-kg"]', "1.5");
  root.setInput('[data-role="equipment-cost"]', "10");
  root.setInput('[data-role="equipment-state"]', "stored");
  root.setInput('[data-role="equipment-notes"]', "15 m");
  await root.dispatch("click", click("equipment-add"));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "equipment.add");
  assert.deepEqual(await mounted.repositories.session.listIds(), []);
  assert.equal(mounted.character.equipment.length, 2);
  assert.equal(mounted.character.equipment[1].name, "Corda");
  assert.equal(mounted.character.equipment[1].quantity, 2);
  assert.equal(mounted.character.equipment[1].weightKg, 1.5);
  assert.equal(mounted.character.equipment[1].cost, 10);
  assert.equal(mounted.character.equipment[1].state, "stored");
  assert.match(root.innerHTML, /Corda/);
  assert.match(root.innerHTML, /Qtd 2/);
  assert.match(root.innerHTML, /1\.5 kg\/un/);
  assert.match(root.innerHTML, /\$ 10\/un/);

  const addedId = mounted.character.equipment[1].id;
  await root.dispatch("click", click("equipment-state-set", {
    equipmentId: addedId,
    equipmentState: "equipped",
  }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history[1].commandType, "equipment.state.set");
  assert.equal(mounted.character.equipment[1].state, "equipped");
  assert.match(root.innerHTML, /Equipado/);

  await root.dispatch("click", click("equipment-remove", { equipmentId: "equipment:torch" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 3);
  assert.equal(mounted.session.history[2].commandType, "equipment.remove");
  assert.deepEqual(mounted.character.equipment.map(item => item.name), ["Corda"]);
  assert.doesNotMatch(root.innerHTML, /Tocha/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-equipment");

  assert.equal(saved.revision, 3);
  assert.deepEqual(saved.character.equipment.map(item => item.name), ["Corda"]);
  assert.equal(saved.character.equipment[0].state, "equipped");
});

test("blocks structural equipment actions in table mode while preserving transient pools", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-equipment-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-role="equipment-editor"/);

  await root.dispatch("click", click("equipment-remove", { equipmentId: "equipment:torch" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.deepEqual(mounted.character.equipment.map(item => item.name), ["Tocha"]);

  await root.dispatch("click", {
    target: {
      dataset: { poolKey: "HP", poolAdjust: "-1" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.pools.HP.current, 8);
  assert.deepEqual(mounted.character.equipment.map(item => item.name), ["Tocha"]);
});
