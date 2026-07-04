import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  applyEquipmentPatch,
  applyEquipmentStatePatch,
  bootstrapCharacterMobileEquipmentEditApp,
  buildEquipmentStateUpdatePayload,
  buildEquipmentUpdatePayload,
  injectMobileEquipmentEditControls,
  shouldBlockMobileEquipmentEdit,
} from "./CharacterMobileEquipmentEditApp.js";

const html = [
  '<section data-card="equipment"><h2>Equipamentos</h2><dl>',
  '<div data-equipment-id="equipment:backpack"><dt>Equipamento</dt><dd>Mochila</dd></div>',
  '<div data-equipment-id="equipment:rope"><dt>Equipamento</dt><dd>Corda</dd></div>',
  '</dl></section>',
].join("");

function character() {
  return {
    equipment: [
      {
        id: "equipment:backpack",
        name: "Mochila",
        quantity: 1,
        weightKg: 0.5,
        cost: 60,
        state: "carried",
        notes: "Tem bolsos internos",
        children: [
          {
            id: "equipment:rope",
            name: "Corda 15 m",
            quantity: 2,
            weightKg: 1.5,
            cost: 30,
            state: "stored",
            notes: "Enrolada\nem couro",
          },
        ],
      },
    ],
  };
}

function sparseCharacter() {
  return {
    equipment: [
      {
        id: "equipment:torch",
        name: "Tocha",
        quantity: 1,
        state: "carried",
      },
    ],
  };
}

function fullCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-equipment-edit",
      name: "Aldric",
      concept: "Guarda de muralha",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 12, DX: 11, IQ: 10, HT: 10 },
    ...character(),
    metadata: {
      createdAt: "2026-06-30T14:40:00.000Z",
      updatedAt: "2026-06-30T14:40:00.000Z",
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
    clock: { now: () => "2026-06-30T14:41:00.000Z" },
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

test("injects mobile equipment inline editors in creation mode", () => {
  const creation = injectMobileEquipmentEditControls(html, character(), "creation");

  assert.match(creation, /data-role="equipment-inline-editor"/);
  assert.match(creation, /data-action="equipment-update"/);
  assert.match(creation, /data-role="equipment-edit-name-equipment:backpack"/);
  assert.match(creation, /data-role="equipment-edit-quantity-equipment:backpack"/);
  assert.match(creation, /data-role="equipment-edit-weight-equipment:backpack"/);
  assert.match(creation, /data-role="equipment-edit-cost-equipment:backpack"/);
  assert.match(creation, /data-role="equipment-edit-state-equipment:backpack"/);
  assert.match(creation, /data-role="equipment-edit-notes-equipment:backpack"/);
  assert.match(creation, /<option value="carried" selected>Carregado<\/option>/);
});

test("injects editors for nested equipment items", () => {
  const creation = injectMobileEquipmentEditControls(html, character(), "creation");

  assert.match(creation, /data-equipment-id="equipment:rope"/);
  assert.match(creation, /data-role="equipment-edit-name-equipment:rope"/);
  assert.match(creation, /value="Corda 15 m"/);
  assert.match(creation, /value="2"/);
  assert.match(creation, /value="1.5"/);
  assert.match(creation, /value="30"/);
  assert.match(creation, /Enrolada\nem couro/);
  assert.match(creation, /<option value="stored" selected>Guardado<\/option>/);
});

test("keeps equipment structural edit controls out of table mode", () => {
  const table = injectMobileEquipmentEditControls(html, character(), "table");

  assert.doesNotMatch(table, /data-role="equipment-inline-editor"/);
  assert.doesNotMatch(table, /data-action="equipment-update"/);
  assert.match(table, /data-role="equipment-state-controls"/);
  assert.match(table, /data-action="equipment-state-update"/);
  assert.match(table, /data-equipment-state="equipped"/);
  assert.match(table, /data-equipment-state="ignored"/);
  assert.match(table, /Mochila/);
  assert.match(table, /Corda/);
});

test("does not duplicate equipment editors when reinjected", () => {
  const creation = injectMobileEquipmentEditControls(html, character(), "creation");
  const reinjected = injectMobileEquipmentEditControls(creation, character(), "creation");

  const matches = reinjected.match(/data-role="equipment-inline-editor"/g) ?? [];
  assert.equal(matches.length, 2);
});

test("builds canonical equipment.update payload with only changed fields", () => {
  const current = character().equipment[0];
  const payload = buildEquipmentUpdatePayload(current, "equipment:backpack", {
    name: "Mochila reforçada",
    quantity: 1,
    weightKg: 0.75,
    cost: 80,
    state: "carried",
    notes: "Tem bolsos internos\ne fivela nova",
  });

  assert.deepEqual(payload, {
    itemId: "equipment:backpack",
    patch: {
      name: "Mochila reforçada",
      weightKg: 0.75,
      cost: 80,
      notes: "Tem bolsos internos\ne fivela nova",
    },
  });
});

test("builds canonical table-state payload with only the transient state", () => {
  const current = character().equipment[0];

  assert.deepEqual(buildEquipmentStateUpdatePayload(current, "equipment:backpack", "equipped"), {
    itemId: "equipment:backpack",
    patch: { state: "equipped" },
  });

  assert.deepEqual(buildEquipmentStateUpdatePayload(current, "equipment:backpack", "carried"), {
    itemId: "equipment:backpack",
    patch: {},
  });
});

test("does not mark missing optional equipment fields as changed by editor defaults", () => {
  const current = sparseCharacter().equipment[0];
  const payload = buildEquipmentUpdatePayload(current, "equipment:torch", {
    name: "Tocha resinada",
    quantity: 1,
    weightKg: 0,
    cost: 0,
    state: "carried",
    notes: "",
  });

  assert.deepEqual(payload, {
    itemId: "equipment:torch",
    patch: {
      name: "Tocha resinada",
    },
  });
});

test("uses canonical equipment.update command when available", () => {
  const calls = [];
  const result = applyEquipmentPatch({
    character: character(),
    commands: {
      updateEquipment(payload) {
        calls.push(payload);
        return Object.freeze({ status: "applied" });
      },
    },
  }, "equipment:backpack", {
    name: "Mochila reforçada",
    quantity: 1,
    weightKg: 0.5,
    cost: 60,
    state: "carried",
    notes: "Tem bolsos internos",
  });

  assert.equal(result.status, "applied");
  assert.deepEqual(calls, [{
    itemId: "equipment:backpack",
    patch: { name: "Mochila reforçada" },
  }]);
});

test("uses canonical equipment.update for weight cost and notes when available", () => {
  const calls = [];
  const result = applyEquipmentPatch({
    character: character(),
    commands: {
      updateEquipment(payload) {
        calls.push(payload);
        return Object.freeze({ status: "applied" });
      },
      renameEquipment() {
        throw new Error("legacy equipment rename must not be used when updateEquipment exists");
      },
      setEquipmentQuantity() {
        throw new Error("legacy equipment quantity must not be used when updateEquipment exists");
      },
      setEquipmentState() {
        throw new Error("legacy equipment state must not be used when updateEquipment exists");
      },
    },
  }, "equipment:backpack", {
    name: "Mochila",
    quantity: 1,
    weightKg: 0.75,
    cost: 80,
    state: "carried",
    notes: "Tem bolsos internos\ne fivela nova",
  });

  assert.equal(result.status, "applied");
  assert.deepEqual(calls, [{
    itemId: "equipment:backpack",
    patch: {
      weightKg: 0.75,
      cost: 80,
      notes: "Tem bolsos internos\ne fivela nova",
    },
  }]);
});

test("applies table-mode equipment state transients through canonical update", () => {
  const calls = [];
  const result = applyEquipmentStatePatch({
    character: character(),
    commands: {
      updateEquipment(payload) {
        calls.push(payload);
        return Object.freeze({ status: "applied" });
      },
      setEquipmentState() {
        throw new Error("legacy equipment state must not be used when updateEquipment exists");
      },
    },
  }, "equipment:backpack", "equipped");

  assert.equal(result.status, "applied");
  assert.deepEqual(calls, [{
    itemId: "equipment:backpack",
    patch: { state: "equipped" },
  }]);
});

test("persists existing mobile equipment edits through canonical update commands", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileEquipmentEditApp({
    root,
    character: fullCharacter(),
    sessionId: "session-mobile-equipment-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.equipment-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="equipment-update"/);

  root.setInput('[data-role="equipment-edit-name-equipment:backpack"]', "Mochila reforçada");
  root.setInput('[data-role="equipment-edit-quantity-equipment:backpack"]', "3");
  root.setInput('[data-role="equipment-edit-weight-equipment:backpack"]', "0.75");
  root.setInput('[data-role="equipment-edit-cost-equipment:backpack"]', "80");
  root.setInput('[data-role="equipment-edit-state-equipment:backpack"]', "stored");
  root.setInput('[data-role="equipment-edit-notes-equipment:backpack"]', "Tem bolsos internos\ne fivela nova");
  await root.dispatch("click", click("equipment-update", { equipmentId: "equipment:backpack" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "equipment.update");
  assert.equal(mounted.character.equipment[0].name, "Mochila reforçada");
  assert.equal(mounted.character.equipment[0].quantity, 3);
  assert.equal(mounted.character.equipment[0].weightKg, 0.75);
  assert.equal(mounted.character.equipment[0].cost, 80);
  assert.equal(mounted.character.equipment[0].state, "stored");
  assert.equal(mounted.character.equipment[0].notes, "Tem bolsos internos\ne fivela nova");

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-equipment-edit");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.equipment[0].name, "Mochila reforçada");
  assert.equal(saved.character.equipment[0].quantity, 3);
  assert.equal(saved.character.equipment[0].weightKg, 0.75);
  assert.equal(saved.character.equipment[0].cost, 80);
  assert.equal(saved.character.equipment[0].state, "stored");
  assert.equal(saved.character.equipment[0].notes, "Tem bolsos internos\ne fivela nova");
});

test("persists table-mode equipment state through save and remount", async () => {
  const root = rootFixture();
  const storage = createMemoryStorage();
  const mounted = await bootstrapCharacterMobileEquipmentEditApp({
    root,
    character: fullCharacter(),
    sessionId: "session-mobile-equipment-state-table",
    storage,
    namespace: "test.mobile.equipment-state-table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="equipment-update"/);
  assert.match(root.innerHTML, /data-action="equipment-state-update"/);
  assert.match(root.innerHTML, /data-equipment-state="equipped"/);

  await root.dispatch("click", click("equipment-state-update", {
    equipmentId: "equipment:backpack",
    equipmentState: "equipped",
  }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "equipment.update");
  assert.equal(mounted.character.equipment[0].state, "equipped");
  assert.match(root.innerHTML, /data-equipment-state="equipped" aria-pressed="true"/);
  assert.doesNotMatch(root.innerHTML, /data-role="equipment-inline-editor"/);

  await root.dispatch("click", click("persistence-save"));
  mounted.equipmentEdit.destroy();

  const remountRoot = rootFixture();
  const remounted = await bootstrapCharacterMobileEquipmentEditApp({
    root: remountRoot,
    character: fullCharacter(),
    sessionId: "session-mobile-equipment-state-table",
    storage,
    namespace: "test.mobile.equipment-state-table",
    runtime: runtime(),
    mode: "table",
  });
  await remountRoot.dispatch("click", click("persistence-load"));

  assert.equal(remounted.character.equipment[0].state, "equipped");
  assert.match(remountRoot.innerHTML, /data-equipment-state="equipped" aria-pressed="true"/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-role="equipment-inline-editor"/);
});

test("preserves legacy equipment commands when updateEquipment is unavailable", () => {
  const calls = [];
  const result = applyEquipmentPatch({
    character: character(),
    commands: {
      renameEquipment(input) {
        calls.push(["rename", input]);
        return Object.freeze({ status: "applied" });
      },
      setEquipmentQuantity(input) {
        calls.push(["quantity", input]);
        return Object.freeze({ status: "applied" });
      },
      setEquipmentState(input) {
        calls.push(["state", input]);
        return Object.freeze({ status: "applied" });
      },
    },
  }, "equipment:backpack", {
    name: "Mochila reforçada",
    quantity: 3,
    weightKg: 0.5,
    cost: 60,
    state: "stored",
    notes: "Tem bolsos internos",
  });

  assert.equal(result.status, "applied");
  assert.deepEqual(calls, [
    ["rename", { itemId: "equipment:backpack", name: "Mochila reforçada" }],
    ["quantity", { itemId: "equipment:backpack", quantity: 3 }],
    ["state", { itemId: "equipment:backpack", state: "stored" }],
  ]);
});

test("preserves legacy edits on sparse equipment items", () => {
  const calls = [];
  const result = applyEquipmentPatch({
    character: sparseCharacter(),
    commands: {
      renameEquipment(input) {
        calls.push(["rename", input]);
        return Object.freeze({ status: "applied" });
      },
    },
  }, "equipment:torch", {
    name: "Tocha resinada",
    quantity: 1,
    weightKg: 0,
    cost: 0,
    state: "carried",
    notes: "",
  });

  assert.equal(result.status, "applied");
  assert.deepEqual(calls, [
    ["rename", { itemId: "equipment:torch", name: "Tocha resinada" }],
  ]);
});

test("blocks unsupported equipment patch fields without updateEquipment", () => {
  const calls = [];
  const result = applyEquipmentPatch({
    character: character(),
    commands: {
      renameEquipment(input) {
        calls.push(input);
        return Object.freeze({ status: "applied" });
      },
    }, "equipment:backpack", {
    name: "Mochila",
    quantity: 1,
    weightKg: 0.75,
    cost: 60,
    state: "carried",
    notes: "Tem bolsos internos",
  });

  assert.equal(result.status, "unsupported");
  assert.deepEqual(result.unsupportedKeys, ["weightKg"]);
  assert.deepEqual(calls, []);
});

test("blocks equipment structural edits while UI is busy", () => {
  const status = shouldBlockMobileEquipmentEdit({
    mode: "creation",
    ui: { getState: () => ({ busy: true }) },
  });

  assert.equal(status, "busy");
});

test("blocks equipment structural edits outside creation mode", () => {
  const status = shouldBlockMobileEquipmentEdit({
    mode: "table",
    ui: { getState: () => ({ busy: false }) },
  });

  assert.equal(status, "blocked-by-mode");
});

test("allows equipment structural edits when creation mode is idle", () => {
  const status = shouldBlockMobileEquipmentEdit({
    mode: "creation",
    ui: { getState: () => ({ busy: false }) },
  });

  assert.equal(status, null);
});
