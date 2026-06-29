import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileEquipmentEditApp,
  injectMobileEquipmentEditControls,
} from "./CharacterMobileEquipmentEditApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-equipment-edit",
      name: "Mira",
      concept: "Batedora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 12, IQ: 11, HT: 10 },
    equipment: [
      {
        id: "eq:rope",
        kind: "item",
        name: "Corda",
        quantity: 1,
        weightKg: 1,
        cost: 10,
        state: "carried",
        children: [],
      },
    ],
    metadata: {
      createdAt: "2026-06-29T05:30:00.000Z",
      updatedAt: "2026-06-29T05:30:00.000Z",
      source: "test",
    },
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-29T05:31:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:equipment-edit-mobile-${sequence}`;
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
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter(entry => entry !== listener));
    },
    querySelector(selector) { return { value: inputValues.get(selector) ?? "" }; },
    querySelectorAll() { return []; },
    setInput(selector, value) { inputValues.set(selector, value); },
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

test("injects mobile equipment edit controls only in creation mode", () => {
  const fixture = createCharacter({
    identity: { id: "c", name: "Teste", concept: "Alpha", playerId: "p", campaignId: "g" },
    equipment: [{ id: "eq1", kind: "item", name: "Corda", quantity: 1, weightKg: 1, cost: 10, state: "carried" }],
    metadata: { createdAt: "2026-06-28T23:31:00.000Z", updatedAt: "2026-06-28T23:31:00.000Z", source: "test" },
  });
  const html = '<section data-card="equipment"><h2>Equipamentos</h2><dl><div data-equipment-id="eq1"><dt>Item</dt><dd>Corda</dd></div></dl></section>';

  const creation = injectMobileEquipmentEditControls(html, fixture, "creation");
  assert.match(creation, /data-action="equipment-update"/);
  assert.match(creation, /data-role="equipment-inline-editor"/);

  const table = injectMobileEquipmentEditControls(html, fixture, "table");
  assert.doesNotMatch(table, /data-action="equipment-update"/);
});

test("edits existing mobile equipment through canonical commands and manual persistence", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileEquipmentEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-equipment-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="equipment-update"/);
  assert.match(root.innerHTML, /data-action="persistence-save"/);
  assert.match(root.innerHTML, /Corda/);

  root.setInput('[data-role="equipment-edit-name-eq:rope"]', "Corda de escalada");
  root.setInput('[data-role="equipment-edit-quantity-eq:rope"]', "2");
  root.setInput('[data-role="equipment-edit-state-eq:rope"]', "stored");
  await root.dispatch("click", click("equipment-update", { equipmentId: "eq:rope" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 3);
  assert.deepEqual(
    mounted.session.history.map(entry => entry.commandType),
    ["equipment.rename", "equipment.setQuantity", "equipment.setState"],
  );
  assert.equal(mounted.character.equipment[0].name, "Corda de escalada");
  assert.equal(mounted.character.equipment[0].quantity, 2);
  assert.equal(mounted.character.equipment[0].state, "stored");
  assert.match(root.innerHTML, /Corda de escalada/);
  assert.match(root.innerHTML, /data-action="persistence-save"/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-equipment-edit");

  assert.notEqual(saved, null, JSON.stringify({ state: mounted.ui.getState(), html: root.innerHTML }));
  assert.equal(saved.revision, 3);
  assert.equal(saved.character.equipment[0].name, "Corda de escalada");
  assert.equal(saved.character.equipment[0].quantity, 2);
  assert.equal(saved.character.equipment[0].state, "stored");
});

test("blocks existing mobile equipment edits in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileEquipmentEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-equipment-edit-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment-edit.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="equipment-update"/);

  await root.dispatch("click", click("equipment-update", { equipmentId: "eq:rope" }));

  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.equipment[0].name, "Corda");
});
