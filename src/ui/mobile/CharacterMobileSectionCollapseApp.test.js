import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileApp,
  injectMobileSectionCollapseControls,
} from "./CharacterMobileApp.js";

const mobileCss = readFileSync(new URL("./CharacterMobileApp.css", import.meta.url), "utf8");

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-section-collapse",
      name: "Ayla",
      concept: "Batedora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 11, DX: 12, IQ: 10, HT: 11 },
    pools: {
      HP: { current: 9, maximum: 11 },
      FP: { current: 8, maximum: 11 },
    },
    equipment: [
      {
        id: "eq_mochila",
        name: "Mochila",
        quantity: 1,
        weightKg: 1,
        cost: 30,
        state: "carried",
      },
    ],
    metadata: {
      createdAt: "2026-07-05T03:00:00.000Z",
      updatedAt: "2026-07-05T03:00:00.000Z",
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
    clock: { now: () => "2026-07-05T03:01:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:section-collapse-mobile-${sequence}`;
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
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
}

function click(dataset) {
  return {
    target: { dataset, parentElement: null },
    preventDefault() {},
  };
}

test("injects section collapse controls without enabling structural table editors", () => {
  const html = [
    '<section class="singular-mobile-sheet__card" data-card="equipment" data-status="declared-only">',
    "<h2>Equipamentos</h2>",
    '<dl><div data-equipment-id="eq_mochila"><dt>Item</dt><dd>Mochila</dd></div></dl>',
    "</section>",
  ].join("");

  const injected = injectMobileSectionCollapseControls(html, { equipment: true });

  assert.match(injected, /data-section-collapsible="true" data-collapsed="true"/);
  assert.match(injected, /data-action="section-collapse-toggle" data-section-id="equipment"/);
  assert.match(injected, /aria-expanded="false"/);
  assert.doesNotMatch(injected, /data-action="equipment-remove"/);
  assert.doesNotMatch(injected, /data-role="equipment-editor"/);
});

test("collapsed mobile sections hide their body without hiding the touch target", () => {
  assert.match(
    mobileCss,
    /\.singular-mobile-sheet__card\[data-section-collapsible="true"\]\[data-collapsed="true"\] > :not\(h2\) \{\s*display: none;\s*\}/,
  );

  const injected = injectMobileSectionCollapseControls([
    '<section class="singular-mobile-sheet__card" data-card="equipment" data-status="declared-only">',
    "<h2>Equipamentos</h2>",
    '<dl><div data-equipment-id="eq_mochila"><dt>Item</dt><dd>Mochila</dd></div></dl>',
    "</section>",
  ].join(""), { equipment: true });

  assert.match(injected, /<h2>Equipamentos<button type="button" class="singular-mobile-sheet__section-collapse-toggle"/);
  assert.match(injected, /data-collapsed="true"/);
  assert.match(injected, /<dl><div data-equipment-id="eq_mochila"/);
});

test("table mode toggles section collapse state, preserves character state and restores after remount", async () => {
  const storage = createMemoryStorage();
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-section-collapse-table",
    storage,
    namespace: "test.mobile.section-collapse",
    runtime: runtime(),
    mode: "table",
  });

  assert.match(root.innerHTML, /data-section-id="equipment"/);
  assert.match(root.innerHTML, /data-card="equipment" data-status="declared-only" data-section-collapsible="true" data-collapsed="false"/);
  assert.doesNotMatch(root.innerHTML, /data-role="equipment-editor"/);
  assert.doesNotMatch(root.innerHTML, /data-action="equipment-remove"/);

  await root.dispatch("click", click({ action: "section-collapse-toggle", sectionId: "equipment" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.pools.HP.current, 9);
  assert.equal(mounted.character.pools.HP.maximum, 11);
  assert.equal(mounted.character.equipment[0].name, "Mochila");
  assert.equal(mounted.character.equipment[0].quantity, 1);
  assert.match(root.innerHTML, /data-card="equipment" data-status="declared-only" data-section-collapsible="true" data-collapsed="true"/);
  assert.match(root.innerHTML, /data-section-id="equipment" aria-expanded="false"/);
  assert.doesNotMatch(root.innerHTML, /data-role="equipment-editor"/);

  await root.dispatch("click", click({ action: "persistence-save" }));
  mounted.interactions.destroy();

  const remountRoot = rootFixture();
  const remounted = await bootstrapCharacterMobileApp({
    root: remountRoot,
    storage,
    namespace: "test.mobile.section-collapse",
    runtime: runtime(),
    mode: "table",
  });

  assert.equal(remounted.session.id, "session-section-collapse-table");
  assert.equal(remounted.session.revision, 0);
  assert.equal(remounted.character.pools.HP.current, 9);
  assert.equal(remounted.character.pools.HP.maximum, 11);
  assert.match(remountRoot.innerHTML, /data-card="equipment" data-status="declared-only" data-section-collapsible="true" data-collapsed="true"/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-role="equipment-editor"/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-action="equipment-remove"/);
});
