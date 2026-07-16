import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: { id: "character-equipment-editor", name: "Ferreira" },
    equipment: [{
      id: "sword",
      name: "Espada",
      cost: 100,
      weightKg: 2,
      state: "equipped",
      modifiers: [{
        type: "eqp_modifier",
        id: "fine",
        name: "Superior",
        cost_type: "to_base_cost",
        cost: "x4",
      }],
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
    clock: { now: () => "2026-07-16T06:25:00.000Z" },
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

function setDraft(root, prefix, suffix, values) {
  for (const [field, value] of Object.entries(values)) {
    root.setInput(`[data-role="${prefix}-${field}-${suffix}"]`, value);
  }
}

function modifierRows(mounted) {
  const item = mounted.character.equipment[0];
  return item.modifierList?.rows ?? item.modifiers;
}

test("edits canonical Equipment modifiers through one application revision per mobile intention", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-equipment-modifier-editor",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment-modifier-editor",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-role="equipment-modifier-editor"/);
  assert.match(root.innerHTML, /data-action="equipment-modifier-add"/);
  setDraft(root, "equipment-modifier-add", "sword", {
    name: "Leve",
    kind: "modifier",
    parent: "",
    cost: "-10%",
    weight: "x0.5",
    notes: "Forjada para mobilidade",
  });
  await root.dispatch("click", click("equipment-modifier-add", { equipmentId: "sword" }));

  const added = modifierRows(mounted).find(item => item.name === "Leve");
  assert.ok(added);
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history[0].commandType, "equipment.modifier.add");

  setDraft(root, "equipment-modifier-edit", `sword-${added.id}`, {
    name: "Muito leve",
    cost: "-15%",
    weight: "x0.4",
    notes: "Editado por toque",
  });
  await root.dispatch("click", click("equipment-modifier-update", {
    equipmentId: "sword",
    modifierId: added.id,
    modifierKind: "modifier",
  }));
  assert.equal(modifierRows(mounted).at(-1).name, "Muito leve");
  assert.equal(modifierRows(mounted).at(-1).weightAdjustment.expression, "x0.4");

  await root.dispatch("click", click("equipment-modifier-enabled-set", {
    equipmentId: "sword",
    modifierId: added.id,
    enabled: "true",
  }));
  assert.equal(modifierRows(mounted).at(-1).enabled, false);

  await root.dispatch("click", click("equipment-modifier-reorder", {
    equipmentId: "sword",
    modifierId: added.id,
    parentId: "",
    targetIndex: "0",
  }));
  assert.equal(modifierRows(mounted)[0].id, added.id);

  await root.dispatch("click", click("equipment-modifier-remove", {
    equipmentId: "sword",
    modifierId: added.id,
  }));
  assert.deepEqual(mounted.session.history.map(entry => entry.commandType), [
    "equipment.modifier.add",
    "equipment.modifier.edit",
    "equipment.modifier.enabled.set",
    "equipment.modifier.reorder",
    "equipment.modifier.remove",
  ]);
  assert.equal(mounted.session.revision, 5);
  assert.equal(modifierRows(mounted).some(item => item.id === added.id), false);

  const saveResult = await mounted.persistence.saveActiveSession();
  assert.equal(saveResult.status, "saved", JSON.stringify(saveResult));
  const saved = await mounted.repositories.session.load("session-equipment-modifier-editor");
  assert.deepEqual(saved.character.equipment, mounted.character.equipment);
});

test("keeps Equipment modifier structural actions unavailable and blocked in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-equipment-modifier-editor-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment-modifier-editor.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-role="equipment-modifier-editor"/);
  assert.doesNotMatch(root.innerHTML, /data-action="equipment-modifier-/);
  await root.dispatch("click", click("equipment-modifier-remove", {
    equipmentId: "sword",
    modifierId: "fine",
  }));
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(modifierRows(mounted).length, 1);
});
