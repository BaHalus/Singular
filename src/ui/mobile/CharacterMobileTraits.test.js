import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-traits",
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
  });
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-28T05:30:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:mobile-trait-${sequence}`;
      },
    },
  };
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
      for (const listener of listeners.get(type) ?? []) await listener(event);
    },
  };
}

async function click(root, dataset) {
  await root.dispatch("click", {
    target: { dataset, parentElement: null },
    preventDefault() {},
  });
}

function setTraitDraft(root, { name, role, points, levels = "", tags = "", notes = "" }) {
  root.setInput('[data-role="trait-name"]', name);
  root.setInput('[data-role="trait-role"]', role);
  root.setInput('[data-role="trait-points"]', String(points));
  root.setInput('[data-role="trait-levels"]', String(levels));
  root.setInput('[data-role="trait-tags"]', tags);
  root.setInput('[data-role="trait-notes"]', notes);
}

test("edits Traits in Creation through ApplicationSession commands and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-traits",
    storage: createMemoryStorage(),
    namespace: "test.mobile.traits",
    runtime: runtime(),
    mode: "creation",
  });

  setTraitDraft(root, {
    name: "Reflexos em Combate",
    role: "advantage",
    points: 15,
    notes: "Reação rápida",
  });
  await click(root, { action: "trait-add" });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "trait.add");
  assert.equal(mounted.character.traits[0].name, "Reflexos em Combate");
  assert.equal(mounted.character.traits[0].role, "advantage");
  assert.equal(mounted.character.traits[0].points, 15);
  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.match(root.innerHTML, /data-action="trait-remove"/);
  assert.deepEqual(await mounted.repositories.session.listIds(), []);

  setTraitDraft(root, {
    name: "Impulsividade",
    role: "disadvantage",
    points: -10,
    notes: "Autocontrole declarado",
  });
  await click(root, { action: "trait-add" });
  const firstTraitId = mounted.character.traits[0].id;
  const secondTraitId = mounted.character.traits[1].id;

  await click(root, {
    action: "trait-reorder",
    traitId: firstTraitId,
    targetIndex: "1",
  });
  assert.equal(mounted.session.revision, 3);
  assert.equal(mounted.character.traits[1].id, firstTraitId);
  assert.equal(mounted.session.history.at(-1).commandType, "trait.reorder");

  await click(root, {
    action: "trait-reorder",
    traitId: firstTraitId,
    targetIndex: "1",
  });
  assert.equal(mounted.session.revision, 3);
  assert.equal(root.getAttribute("data-last-command-status"), "no-op");

  await click(root, { action: "trait-remove", traitId: secondTraitId });
  assert.equal(mounted.session.revision, 4);
  assert.equal(mounted.character.traits.length, 1);
  assert.equal(mounted.session.history.at(-1).commandType, "trait.remove");

  await click(root, { action: "persistence-save" });
  const saved = await mounted.repositories.session.load("session-mobile-traits");
  assert.equal(saved.revision, 4);
  assert.equal(saved.character.traits.length, 1);
  assert.equal(saved.character.traits[0].id, firstTraitId);
});

test("blocks structural Trait edits in Mesa while preserving transient PV/PF edits", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-mobile-traits-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.traits.table",
    runtime: runtime(),
    mode: "table",
  });

  setTraitDraft(root, {
    name: "Reflexos em Combate",
    role: "advantage",
    points: 15,
  });
  await click(root, { action: "trait-add" });

  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.traits.length, 0);
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");

  await click(root, { poolKey: "HP", poolAdjust: "-1" });
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.pools.HP.current, 8);
  assert.equal(mounted.session.history[0].commandType, "pool.current.adjust");
});
