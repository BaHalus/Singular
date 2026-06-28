import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileSecondaryNotesApp } from "./CharacterMobileSecondaryNotesApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-secondary-notes",
      name: "Nara",
      concept: "Exploradora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: 10,
      DX: 11,
      IQ: 12,
      HT: 10,
    },
    secondaryCharacteristics: {
      HP: { base: 10, override: null },
      FP: { base: 10, override: null },
      Will: { base: 12, override: null },
      Per: { base: 12, override: null },
      BasicSpeed: { base: 5.25, override: null },
      BasicMove: { base: 5, override: null },
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 9, maximum: 10 },
    },
    notes: {
      general: "Evita entrar sozinha em ruínas.",
      structured: [
        {
          id: "note:contact",
          title: "Contato",
          text: "Guia em Megalos",
          category: "NPC",
          reference: "Yrth",
          tags: ["aliado"],
          metadata: {},
        },
      ],
    },
    metadata: {
      createdAt: "2026-06-28T20:30:00.000Z",
      updatedAt: "2026-06-28T20:30:00.000Z",
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
    clock: { now: () => "2026-06-28T20:31:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:secondary-notes-mobile-${sequence}`;
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

test("edits secondary structure and notes in creation mode through canonical commands and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSecondaryNotesApp({
    root,
    character: character(),
    sessionId: "session-mobile-secondary-notes",
    storage: createMemoryStorage(),
    namespace: "test.mobile.secondary-notes",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-card="secondary-characteristics"/);
  assert.match(root.innerHTML, /data-action="secondary-override-set"/);
  assert.match(root.innerHTML, /data-card="notes"/);
  assert.match(root.innerHTML, /data-action="notes-general-save"/);
  assert.match(root.innerHTML, /Evita entrar sozinha em ruínas\./);
  assert.match(root.innerHTML, /Contato/);

  root.setInput('[data-role="secondary-override-Will"]', "13");
  await root.dispatch("click", click("secondary-override-set", { secondaryKey: "Will" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "secondary.override.set");
  assert.equal(mounted.character.secondaryCharacteristics.Will.override, 13);
  assert.match(root.innerHTML, /Vontade/);
  assert.match(root.innerHTML, /ajuste 13/);

  root.setInput('[data-role="pool-maximum-HP"]', "12");
  await root.dispatch("click", click("pool-maximum-set", { poolKey: "HP" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history[1].commandType, "pool.maximum.set");
  assert.equal(mounted.character.pools.HP.maximum, 12);
  assert.match(root.innerHTML, /máximo 12/);

  root.setInput('[data-role="notes-general"]', "Nunca abandona mapa incompleto.");
  await root.dispatch("click", click("notes-general-save"));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 3);
  assert.equal(mounted.session.history[2].commandType, "notes.general.set");
  assert.equal(mounted.character.notes.general, "Nunca abandona mapa incompleto.");
  assert.match(root.innerHTML, /Nunca abandona mapa incompleto\./);

  root.setInput('[data-role="note-title"]', "Pista");
  root.setInput('[data-role="note-text"]', "Marca de casco na lama");
  root.setInput('[data-role="note-category"]', "Investigação");
  root.setInput('[data-role="note-reference"]', "Sessão 2");
  root.setInput('[data-role="note-tags"]', "rastro, viagem");
  await root.dispatch("click", click("note-add"));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 4);
  assert.equal(mounted.session.history[3].commandType, "note.add");
  assert.equal(mounted.character.notes.structured.length, 2);
  assert.equal(mounted.character.notes.structured[1].title, "Pista");
  assert.deepEqual(mounted.character.notes.structured[1].tags, ["rastro", "viagem"]);
  assert.match(root.innerHTML, /Pista/);

  await root.dispatch("click", click("note-remove", { noteId: "note:contact" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 5);
  assert.equal(mounted.session.history[4].commandType, "note.remove");
  assert.deepEqual(mounted.character.notes.structured.map(note => note.title), ["Pista"]);
  assert.doesNotMatch(root.innerHTML, /Contato/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-secondary-notes");

  assert.equal(saved.revision, 5);
  assert.equal(saved.character.secondaryCharacteristics.Will.override, 13);
  assert.equal(saved.character.pools.HP.maximum, 12);
  assert.equal(saved.character.notes.general, "Nunca abandona mapa incompleto.");
  assert.deepEqual(saved.character.notes.structured.map(note => note.title), ["Pista"]);
});

test("blocks structural secondary and notes actions in table mode while preserving transient pools", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSecondaryNotesApp({
    root,
    character: character(),
    sessionId: "session-mobile-secondary-notes-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.secondary-notes.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="secondary-override-set"/);
  assert.doesNotMatch(root.innerHTML, /data-action="notes-general-save"/);
  assert.match(root.innerHTML, /data-card="notes"/);

  await root.dispatch("click", click("secondary-override-set", { secondaryKey: "Will" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.secondaryCharacteristics.Will.override, null);

  await root.dispatch("click", click("note-remove", { noteId: "note:contact" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.deepEqual(mounted.character.notes.structured.map(note => note.title), ["Contato"]);

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
  assert.equal(mounted.character.notes.general, "Evita entrar sozinha em ruínas.");
});
