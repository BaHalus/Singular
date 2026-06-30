import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobilePowerEditApp,
  injectMobilePowerEditControls,
  readPowerPatchFromValues,
} from "./CharacterMobilePowerEditApp.js";

function character() {
  return {
    powers: [
      {
        id: "power:psi",
        name: "Psiquismo",
        source: "manual",
        powerModifier: {
          name: "Poder psíquico",
          valuePercent: -10,
          notes: "antipsi afeta",
        },
        talentTraitId: "trait:talent",
        memberTraitIds: ["trait:telepathy", "trait:tk"],
        tags: ["psionics", "alpha"],
        notes: "\nlinha de poderes psíquicos\ncom nota longa",
      },
    ],
  };
}

function fullCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-power-edit",
      name: "Lio",
      concept: "Psi",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 10, IQ: 12, HT: 10 },
    ...character(),
    metadata: {
      createdAt: "2026-06-30T12:58:00.000Z",
      updatedAt: "2026-06-30T12:58:00.000Z",
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
    clock: { now: () => "2026-06-30T12:59:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:power-edit-mobile-${sequence}`;
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

test("injects mobile power inline controls only in creation mode", () => {
  const html = '<section data-card="powers"><h2>Poderes</h2><dl><div data-power-id="power:psi"><dt>Poder</dt><dd>Psiquismo</dd></div></dl></section>';

  const creation = injectMobilePowerEditControls(html, character(), "creation");
  assert.match(creation, /data-role="power-inline-editor"/);
  assert.match(creation, /data-action="power-update"/);
  assert.match(creation, /power-edit-source-power:psi/);
  assert.match(creation, /trait:telepathy, trait:tk/);
  assert.match(creation, /<textarea data-role="power-edit-notes-power:psi"/);
  assert.match(creation, /<textarea data-role="power-edit-notes-power:psi" autocomplete="off" disabled>\n\nlinha de poderes psíquicos\ncom nota longa<\/textarea>/);

  const table = injectMobilePowerEditControls(html, character(), "table");
  assert.doesNotMatch(table, /data-role="power-inline-editor"/);
  assert.doesNotMatch(table, /data-action="power-update"/);
});

test("normalizes power edit values for canonical command payloads", () => {
  const patch = readPowerPatchFromValues({
    name: "Telepatia",
    source: "Powers",
    powerModifierName: "Psíquico",
    powerModifierValuePercent: -10,
    powerModifierNotes: "bloqueável",
    talentTraitId: "",
    memberTraitIds: "trait:a, trait:b",
    tags: "psi, mental",
    notes: "núcleo psíquico",
  });

  assert.deepEqual(patch, {
    name: "Telepatia",
    source: "Powers",
    powerModifierName: "Psíquico",
    powerModifierValuePercent: -10,
    powerModifierNotes: "bloqueável",
    talentTraitId: null,
    memberTraitIds: ["trait:a", "trait:b"],
    tags: ["psi", "mental"],
    notes: "núcleo psíquico",
  });
});

test("persists existing mobile power rename through canonical session save", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobilePowerEditApp({
    root,
    character: fullCharacter(),
    sessionId: "session-mobile-power-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.power-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="power-update"/);
  assert.match(root.innerHTML, /Psiquismo/);

  root.setInput('[data-role="power-edit-name-power:psi"]', "Telepatia Alpha");
  await root.dispatch("click", click("power-update", { powerId: "power:psi" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "power.rename");
  assert.equal(mounted.character.powers[0].name, "Telepatia Alpha");
  assert.match(root.innerHTML, /Telepatia Alpha/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-power-edit");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.powers[0].id, "power:psi");
  assert.equal(saved.character.powers[0].name, "Telepatia Alpha");
  assert.equal(saved.character.powers[0].source, "manual");
  assert.deepEqual(saved.character.powers[0].memberTraitIds, ["trait:telepathy", "trait:tk"]);
  assert.deepEqual(saved.character.powers[0].tags, ["psionics", "alpha"]);
});
