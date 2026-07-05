import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-table-pool-transients",
      name: "Ayla",
      concept: "Batedora em combate",
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
        id: "equipment:backpack",
        kind: "container",
        containerKind: "physical",
        name: "Mochila",
        quantity: 1,
        weightKg: 0.5,
        cost: 60,
        state: "carried",
        notes: "Tem bolsos internos",
      },
    ],
    metadata: {
      createdAt: "2026-07-04T21:20:00.000Z",
      updatedAt: "2026-07-04T21:20:00.000Z",
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
    clock: { now: () => "2026-07-04T21:21:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:table-pool-transients-${sequence}`;
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

function click(targetDataset) {
  return {
    target: {
      dataset: targetDataset,
      parentElement: null,
    },
    preventDefault() {},
  };
}

test("table mode edits only current PV and PF through canonical pool commands and survives save/remount/load", async () => {
  const storage = createMemoryStorage();
  const firstRoot = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root: firstRoot,
    character: character(),
    sessionId: "session-table-pool-transients",
    storage,
    namespace: "test.mobile.table-pool-transients",
    runtime: runtime(),
    mode: "table",
  });

  assert.equal(mounted.mode, "table");
  assert.match(firstRoot.innerHTML, /data-pool-key="HP" data-pool-adjust="-1"/);
  assert.match(firstRoot.innerHTML, /data-pool-key="FP" data-pool-adjust="1"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-attribute-key="ST"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="character-summary-editor"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="equipment-editor"/);

  await firstRoot.dispatch("click", click({ poolKey: "HP", poolAdjust: "-1" }));

  assert.equal(firstRoot.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history.length, 1);
  assert.equal(mounted.session.history[0].commandType, "pool.current.adjust");
  assert.equal(mounted.character.pools.HP.current, 8);
  assert.equal(mounted.character.pools.HP.maximum, 11);
  assert.equal(mounted.character.pools.FP.current, 8);
  assert.equal(mounted.character.pools.FP.maximum, 11);
  assert.match(firstRoot.innerHTML, /<dt>PV<\/dt><dd>8 \/ 11<\/dd>/);

  await firstRoot.dispatch("click", click({ poolKey: "FP", poolAdjust: "1" }));

  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history.length, 2);
  assert.equal(mounted.session.history[1].commandType, "pool.current.adjust");
  assert.equal(mounted.character.pools.HP.current, 8);
  assert.equal(mounted.character.pools.HP.maximum, 11);
  assert.equal(mounted.character.pools.FP.current, 9);
  assert.equal(mounted.character.pools.FP.maximum, 11);
  assert.match(firstRoot.innerHTML, /<dt>PF<\/dt><dd>9 \/ 11<\/dd>/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="character-summary-editor"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="equipment-editor"/);

  await firstRoot.dispatch("click", click({ action: "persistence-save" }));
  const saved = await mounted.repositories.session.load("session-table-pool-transients");

  assert.equal(saved.revision, 2);
  assert.equal(saved.character.pools.HP.current, 8);
  assert.equal(saved.character.pools.HP.maximum, 11);
  assert.equal(saved.character.pools.FP.current, 9);
  assert.equal(saved.character.pools.FP.maximum, 11);

  mounted.interactions.destroy();

  const remountRoot = rootFixture();
  const remounted = await bootstrapCharacterMobileApp({
    root: remountRoot,
    character: character(),
    sessionId: "session-table-pool-transients",
    storage,
    namespace: "test.mobile.table-pool-transients",
    runtime: runtime(),
    mode: "table",
  });
  await remountRoot.dispatch("click", click({ action: "persistence-load" }));

  assert.equal(remounted.mode, "table");
  assert.equal(remounted.character.pools.HP.current, 8);
  assert.equal(remounted.character.pools.HP.maximum, 11);
  assert.equal(remounted.character.pools.FP.current, 9);
  assert.equal(remounted.character.pools.FP.maximum, 11);
  assert.match(remountRoot.innerHTML, /<dt>PV<\/dt><dd>8 \/ 11<\/dd>/);
  assert.match(remountRoot.innerHTML, /<dt>PF<\/dt><dd>9 \/ 11<\/dd>/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-attribute-key="ST"/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-role="character-summary-editor"/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-role="equipment-editor"/);
});
