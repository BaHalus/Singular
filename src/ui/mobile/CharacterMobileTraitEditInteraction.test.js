import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileTraitEditApp } from "./CharacterMobileTraitEditApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-trait-edit",
      name: "Nara",
      concept: "Exploradora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 11, IQ: 12, HT: 10 },
    traits: [
      {
        id: "trait:voice",
        name: "Voz Melodiosa",
        role: "advantage",
        points: 10,
        levels: null,
        selfControl: {
          roll: 0,
          status: "none",
          multiplier: 1,
          penalty: 0,
          adjustment: { type: "none", status: "ready", value: 0 },
          raw: null,
        },
        frequency: { roll: 0, status: "none", multiplier: 1, raw: null },
        roundCostDown: false,
        choices: [],
        notes: "Bônus social em tavernas.",
        tags: ["social"],
        source: { kind: "singular" },
        pointValue: { declaredPoints: 10, levels: null },
      },
    ],
    metadata: {
      createdAt: "2026-06-28T21:45:00.000Z",
      updatedAt: "2026-06-28T21:45:00.000Z",
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
    clock: { now: () => "2026-06-28T21:46:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:trait-edit-mobile-${sequence}`;
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
    target: { dataset: { action, ...dataset }, parentElement: null },
    preventDefault() {},
  };
}

test("edits an existing mobile trait through the canonical update command and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileTraitEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-trait-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.trait-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="trait-update"/);
  assert.match(root.innerHTML, /Voz Melodiosa/);

  root.setInput('[data-role="trait-edit-name-trait:voice"]', "Voz Hipnótica");
  root.setInput('[data-role="trait-edit-role-trait:voice"]', "advantage");
  root.setInput('[data-role="trait-edit-points-trait:voice"]', "12");
  root.setInput('[data-role="trait-edit-levels-trait:voice"]', "2");
  root.setInput('[data-role="trait-edit-tags-trait:voice"]', "social, voz");
  root.setInput('[data-role="trait-edit-notes-trait:voice"]', "Afeta reações por canto e fala.");
  await root.dispatch("click", click("trait-update", { traitId: "trait:voice" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "trait.update");
  assert.equal(mounted.character.traits[0].name, "Voz Hipnótica");
  assert.equal(mounted.character.traits[0].points, 12);
  assert.equal(mounted.character.traits[0].levels, 2);
  assert.deepEqual(mounted.character.traits[0].tags, ["social", "voz"]);
  assert.equal(mounted.character.traits[0].pointValue.declaredPoints, 12);
  assert.match(root.innerHTML, /Voz Hipnótica/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-trait-edit");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.traits[0].name, "Voz Hipnótica");
  assert.equal(saved.character.traits[0].points, 12);
});

test("blocks existing trait edits in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileTraitEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-trait-edit-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.trait-edit.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="trait-update"/);

  await root.dispatch("click", click("trait-update", { traitId: "trait:voice" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.traits[0].name, "Voz Melodiosa");
});
