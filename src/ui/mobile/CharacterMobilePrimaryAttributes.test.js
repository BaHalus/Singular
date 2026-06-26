import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-attributes",
      name: "Ayla",
      concept: "Batedora",
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
  });
}

function storage() {
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
    clock: { now: () => "2026-06-26T21:10:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:mobile-attribute-${sequence}`;
      },
    },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
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
    querySelector() {
      return { value: "" };
    },
    querySelectorAll() {
      return [];
    },
    async click(dataset) {
      for (const listener of listeners.get("click") ?? []) {
        await listener({
          target: { dataset, parentElement: null },
          preventDefault() {},
        });
      }
    },
  };
}

test("edits primary attributes in creation and blocks them in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-attributes",
    storage: storage(),
    namespace: "test.mobile.primary-attributes",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-attribute-key="DX" data-attribute-adjust="1"/);

  await root.click({ attributeKey: "DX", attributeAdjust: "1" });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.attributes.DX.base, 13);
  assert.equal(mounted.session.history[0].commandType, "attribute.base.adjust");
  assert.match(root.innerHTML, /<dt>DX<\/dt><dd>13<\/dd>/);
  assert.deepEqual(await mounted.repositories.session.listIds(), []);

  await root.click({ action: "mode-table" });

  assert.equal(mounted.mode, "table");
  assert.equal(root.getAttribute("data-last-mode-status"), "applied");
  assert.doesNotMatch(root.innerHTML, /data-attribute-adjust=/);

  await root.click({ attributeKey: "ST", attributeAdjust: "1" });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.attributes.ST.base, 11);
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");

  await root.click({ poolKey: "HP", poolAdjust: "-1" });

  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.character.pools.HP.current, 8);

  await root.click({ action: "persistence-save" });
  mounted.modeSync.sync();
  const saved = await mounted.repositories.session.load("session-mobile-attributes");

  assert.equal(saved.character.attributes.DX.base, 13);
  assert.equal(saved.character.attributes.ST.base, 11);
  assert.equal(saved.character.pools.HP.current, 8);
  assert.equal(root.getAttribute("data-mode"), "table");
});
