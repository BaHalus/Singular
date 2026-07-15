import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileTraitEditApp } from "./CharacterMobileTraitEditApp.js";

function character() {
  return createCharacter({
    identity: { id: "character-modifier-editor", name: "Nara" },
    attributes: { ST: 10, DX: 11, IQ: 12, HT: 10 },
    traits: [{
      id: "trait:flight",
      name: "Voo",
      role: "advantage",
      pointValue: { basePoints: 40 },
      modifiers: [
        {
          id: "fast",
          name: "Rápido",
          kind: "enhancement",
          valueType: "percentage",
          value: 20,
          source: null,
          notes: "",
        },
        {
          id: "winged",
          name: "Alado",
          kind: "limitation",
          valueType: "percentage",
          value: 25,
          source: null,
          notes: "Asas expostas",
        },
      ],
    }],
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(String(key)) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-07-15T02:10:00.000Z" },
    idGenerator: { next: prefix => `${prefix}:mobile-${++sequence}` },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  const inputs = new Map();
  return {
    innerHTML: "",
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter(item => item !== listener));
    },
    querySelector(selector) { return { value: inputs.get(selector) ?? "" }; },
    querySelectorAll() { return []; },
    setInput(selector, value) { inputs.set(selector, value); },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) await listener(event);
    },
  };
}

function click(action, dataset = {}) {
  return {
    target: { dataset: { action, ...dataset }, parentElement: null },
    preventDefault() {},
  };
}

function setModifierInputs(root, prefix, suffix, input) {
  root.setInput(`[data-role="${prefix}-name-${suffix}"]`, input.name);
  root.setInput(`[data-role="${prefix}-kind-${suffix}"]`, input.kind);
  root.setInput(`[data-role="${prefix}-value-${suffix}"]`, String(input.value));
  root.setInput(`[data-role="${prefix}-affects-${suffix}"]`, input.affects);
  root.setInput(`[data-role="${prefix}-notes-${suffix}"]`, input.notes);
}

test("edits canonical Trait modifiers through one application revision per mobile intention", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileTraitEditApp({
    root,
    character: character(),
    sessionId: "session-modifier-editor",
    storage: createMemoryStorage(),
    namespace: "test.mobile.trait-modifier-editor",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-role="trait-modifier-editor"/);
  assert.match(root.innerHTML, /data-action="trait-modifier-add"/);
  assert.match(root.innerHTML, /min="0\.01"/);

  setModifierInputs(root, "trait-modifier-add", "trait:flight", {
    name: "Manobrável",
    kind: "enhancement",
    value: 10,
    affects: "total",
    notes: "Curvas fechadas",
  });
  await root.dispatch("click", click("trait-modifier-add", { traitId: "trait:flight" }));
  const added = mounted.character.traits[0].modifiers.find(item => item.name === "Manobrável");
  assert.ok(added);
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "trait.modifier.add");

  setModifierInputs(root, "trait-modifier-edit", `trait:flight-${added.id}`, {
    name: "Muito manobrável",
    kind: "enhancement",
    value: 15,
    affects: "levels",
    notes: "Editado por toque",
  });
  await root.dispatch("click", click("trait-modifier-update", {
    traitId: "trait:flight",
    modifierId: added.id,
  }));
  assert.equal(mounted.character.traits[0].modifiers.at(-1).name, "Muito manobrável");
  assert.equal(mounted.character.traits[0].modifiers.at(-1).value, 15);
  assert.equal(mounted.session.revision, 2);

  await root.dispatch("click", click("trait-modifier-enabled-set", {
    traitId: "trait:flight",
    modifierId: added.id,
    enabled: "true",
  }));
  assert.equal(mounted.character.traits[0].modifiers.at(-1).enabled, false);

  await root.dispatch("click", click("trait-modifier-reorder", {
    traitId: "trait:flight",
    modifierId: added.id,
    targetIndex: "0",
  }));
  assert.equal(mounted.character.traits[0].modifiers[0].id, added.id);

  await root.dispatch("click", click("trait-modifier-remove", {
    traitId: "trait:flight",
    modifierId: added.id,
  }));
  assert.deepEqual(
    mounted.session.history.map(entry => entry.commandType),
    [
      "trait.modifier.add",
      "trait.modifier.edit",
      "trait.modifier.enabled.set",
      "trait.modifier.reorder",
      "trait.modifier.remove",
    ],
  );
  assert.equal(mounted.session.revision, 5);
  assert.equal(mounted.character.traits[0].modifiers.some(item => item.id === added.id), false);

  const saveResult = await mounted.persistence.saveActiveSession();
  assert.equal(saveResult.status, "saved", JSON.stringify(saveResult));
  const saved = await mounted.repositories.session.load("session-modifier-editor");
  assert.deepEqual(saved.character.traits[0].modifiers, mounted.character.traits[0].modifiers);
});

test("keeps Trait modifier structural actions unavailable and blocked in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileTraitEditApp({
    root,
    character: character(),
    sessionId: "session-modifier-editor-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.trait-modifier-editor.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-role="trait-modifier-editor"/);
  assert.doesNotMatch(root.innerHTML, /data-action="trait-modifier-/);
  await root.dispatch("click", click("trait-modifier-remove", {
    traitId: "trait:flight",
    modifierId: "fast",
  }));
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.traits[0].modifiers.length, 2);
});
