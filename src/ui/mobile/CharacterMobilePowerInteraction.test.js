import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-powers",
      name: "Iara",
      concept: "Psíquica",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: 10,
      DX: 11,
      IQ: 12,
      HT: 10,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 9, maximum: 10 },
    },
    powers: [
      {
        id: "power:psi",
        name: "Psiquismo",
        source: "psionic",
        powerModifier: {
          name: "Psíquico",
          valuePercent: -10,
          notes: "anti-poderes psíquicos afetam",
        },
        talentTraitId: null,
        memberTraitIds: [],
        notes: "poder base",
        tags: ["mental"],
      },
    ],
    metadata: {
      createdAt: "2026-06-28T19:40:00.000Z",
      updatedAt: "2026-06-28T19:40:00.000Z",
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
    clock: { now: () => "2026-06-28T19:41:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:power-mobile-${sequence}`;
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

test("edits powers in creation mode through canonical commands and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-powers",
    storage: createMemoryStorage(),
    namespace: "test.mobile.powers",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-role="power-editor"/);
  assert.match(root.innerHTML, /data-action="power-add"/);
  assert.match(root.innerHTML, /data-power-id="power:psi"/);
  assert.match(root.innerHTML, /Psiquismo/);

  root.setInput('[data-role="power-name"]', "Chi");
  root.setInput('[data-role="power-source"]', "mystic");
  root.setInput('[data-role="power-modifier-name"]', "Místico");
  root.setInput('[data-role="power-modifier-value-percent"]', "-10");
  root.setInput('[data-role="power-modifier-notes"]', "afetado por zonas sem mana");
  root.setInput('[data-role="power-talent-trait-id"]', "trait:chi-talent");
  root.setInput('[data-role="power-member-trait-ids"]', "trait:iron-hand, trait:leap");
  root.setInput('[data-role="power-tags"]', "marcial, chi");
  root.setInput('[data-role="power-notes"]', "poder aprendido");
  await root.dispatch("click", click("power-add"));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "power.add");
  assert.deepEqual(await mounted.repositories.session.listIds(), []);
  assert.equal(mounted.character.powers.length, 2);
  assert.equal(mounted.character.powers[1].name, "Chi");
  assert.equal(mounted.character.powers[1].source, "mystic");
  assert.deepEqual(mounted.character.powers[1].powerModifier, {
    name: "Místico",
    valuePercent: -10,
    notes: "afetado por zonas sem mana",
  });
  assert.equal(mounted.character.powers[1].talentTraitId, "trait:chi-talent");
  assert.deepEqual(mounted.character.powers[1].memberTraitIds, ["trait:iron-hand", "trait:leap"]);
  assert.deepEqual(mounted.character.powers[1].tags, ["marcial", "chi"]);
  assert.match(root.innerHTML, /Chi/);
  assert.match(root.innerHTML, /Mod\. Místico -10%/);

  const addedId = mounted.character.powers[1].id;
  root.setInput(`[data-role="power-rename"][data-power-id="${addedId}"]`, "Chi Interior");
  await root.dispatch("click", click("power-rename", { powerId: addedId }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history[1].commandType, "power.rename");
  assert.deepEqual(mounted.character.powers.map(power => power.name), ["Psiquismo", "Chi Interior"]);
  assert.match(root.innerHTML, /Chi Interior/);

  await root.dispatch("click", click("power-remove", { powerId: "power:psi" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 3);
  assert.equal(mounted.session.history[2].commandType, "power.remove");
  assert.deepEqual(mounted.character.powers.map(power => power.name), ["Chi Interior"]);
  assert.doesNotMatch(root.innerHTML, /Psiquismo/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-powers");

  assert.equal(saved.revision, 3);
  assert.deepEqual(saved.character.powers.map(power => power.name), ["Chi Interior"]);
  assert.equal(saved.character.powers[0].powerModifier.name, "Místico");
});

test("blocks structural power actions in table mode while preserving transient pools", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-powers-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.powers.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-role="power-editor"/);

  await root.dispatch("click", click("power-remove", { powerId: "power:psi" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.deepEqual(mounted.character.powers.map(power => power.name), ["Psiquismo"]);

  await root.dispatch("click", {
    target: {
      dataset: { poolKey: "FP", poolAdjust: "-1" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.pools.FP.current, 8);
  assert.deepEqual(mounted.character.powers.map(power => power.name), ["Psiquismo"]);
});
