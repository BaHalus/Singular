import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mode-switch",
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
    clock: { now: () => "2026-06-26T20:30:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:mode-${sequence}`;
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
    querySelector() {
      return { value: "" };
    },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
}

test("switches creation and table modes without changing the active session", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mode-switch",
    storage: createMemoryStorage(),
    namespace: "test.mobile.mode-switch",
    runtime: runtime(),
    mode: "creation",
  });
  let prevented = false;

  assert.equal(mounted.mode, "creation");
  assert.equal(root.getAttribute("data-mode"), "creation");
  assert.match(root.innerHTML, /data-mode="creation"/);
  assert.match(root.innerHTML, /data-action="mode-creation"[^>]*aria-pressed="true"/);

  await root.dispatch("click", {
    target: {
      dataset: { action: "mode-table" },
      parentElement: null,
    },
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(mounted.mode, "table");
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.equal(root.getAttribute("data-session-id"), "session-mode-switch");
  assert.equal(root.getAttribute("data-character-id"), "character-mode-switch");
  assert.equal(root.getAttribute("data-last-mode-status"), "applied");
  assert.match(root.innerHTML, /data-mode="table"/);
  assert.match(root.innerHTML, /data-action="mode-table"[^>]*aria-pressed="true"/);
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.identity.name, "Ayla");

  await root.dispatch("click", {
    target: {
      dataset: { action: "mode-table" },
      parentElement: null,
    },
  });

  assert.equal(mounted.mode, "table");
  assert.equal(root.getAttribute("data-last-mode-status"), "unchanged");
  assert.equal(mounted.session.revision, 0);
});
