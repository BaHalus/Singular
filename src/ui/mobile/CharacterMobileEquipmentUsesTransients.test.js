import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  applyEquipmentUsesPatch,
  bootstrapCharacterMobileEquipmentEditApp,
  buildEquipmentUsesUpdatePayload,
  injectMobileEquipmentEditControls,
} from "./CharacterMobileEquipmentEditApp.js";

function character(overrides = {}) {
  return createCharacter({
    identity: {
      id: "character-table-equipment-uses-transients",
      name: "Mira",
      concept: "Exploradora de masmorra",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 11, IQ: 10, HT: 10 },
    equipment: [
      {
        id: "equipment:lantern",
        kind: "item",
        name: "Lanterna",
        quantity: 1,
        weightKg: 1,
        cost: 20,
        state: "carried",
        uses: overrides.lanternUses ?? 1,
        maxUses: 3,
        notes: "Óleo contado por cena",
      },
      {
        id: "equipment:backpack",
        kind: "container",
        containerKind: "physical",
        name: "Mochila",
        quantity: 1,
        weightKg: 0.5,
        cost: 60,
        state: "carried",
        uses: null,
        maxUses: null,
        notes: "Estrutura não editável em Mesa",
        children: [
          {
            id: "equipment:rope",
            kind: "item",
            name: "Corda 15 m",
            quantity: 1,
            weightKg: 1.5,
            cost: 30,
            state: "stored",
            uses: null,
            maxUses: null,
            notes: "Sem contador",
          },
        ],
      },
    ],
    metadata: {
      createdAt: "2026-07-04T23:40:00.000Z",
      updatedAt: "2026-07-04T23:40:00.000Z",
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
    clock: { now: () => "2026-07-04T23:41:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:table-equipment-uses-transients-${sequence}`;
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

test("builds canonical table-uses payload with only the transient uses counter", () => {
  const current = character().equipment[0];

  assert.deepEqual(buildEquipmentUsesUpdatePayload(current, "equipment:lantern", 2), {
    itemId: "equipment:lantern",
    patch: { uses: 2 },
  });

  assert.deepEqual(buildEquipmentUsesUpdatePayload(current, "equipment:lantern", 1), {
    itemId: "equipment:lantern",
    patch: {},
  });
});

test("applies table-mode equipment uses transients through canonical update", () => {
  const calls = [];
  const result = applyEquipmentUsesPatch({
    character: character(),
    commands: {
      updateEquipment(payload) {
        calls.push(payload);
        return Object.freeze({ status: "applied" });
      },
      setEquipmentState() {
        throw new Error("legacy equipment state must not be used for uses transients");
      },
    },
  }, "equipment:lantern", 2);

  assert.equal(result.status, "applied");
  assert.deepEqual(calls, [{
    itemId: "equipment:lantern",
    patch: { uses: 2 },
  }]);
});

test("omits table uses controls when equipment has no uses counter", () => {
  const sparseHtml = [
    '<section data-card="equipment"><h2>Equipamentos</h2><dl>',
    '<div data-equipment-id="equipment:torch"><dt>Equipamento</dt><dd>Tocha</dd></div>',
    '</dl></section>',
  ].join("");
  const table = injectMobileEquipmentEditControls(sparseHtml, {
    equipment: [{ id: "equipment:torch", name: "Tocha", state: "carried" }],
  }, "table");

  assert.match(table, /data-role="equipment-state-controls"/);
  assert.doesNotMatch(table, /data-role="equipment-uses-controls"/);
  assert.doesNotMatch(table, /data-action="equipment-uses-update"/);
});

test("decrementing zero table uses is a no-op instead of throwing", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileEquipmentEditApp({
    root,
    character: character({ lanternUses: 0 }),
    sessionId: "session-table-equipment-uses-zero",
    storage: createMemoryStorage(),
    namespace: "test.mobile.table-equipment-uses-zero",
    runtime: runtime(),
    mode: "table",
  });

  assert.match(root.innerHTML, /Usos 0 \/ 3/);
  assert.match(root.innerHTML, /data-equipment-uses-delta="-1" aria-disabled="true"/);

  await root.dispatch("click", click("equipment-uses-update", {
    equipmentId: "equipment:lantern",
    equipmentUsesDelta: "-1",
  }));

  assert.equal(root.getAttribute("data-last-command-status"), "no-op");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.session.history.length, 0);
  assert.equal(mounted.character.equipment[0].uses, 0);
  assert.equal(mounted.character.equipment[0].maxUses, 3);
});

test("table mode edits only equipment uses through canonical session commands and survives save/remount/load", async () => {
  const storage = createMemoryStorage();
  const firstRoot = rootFixture();
  const mounted = await bootstrapCharacterMobileEquipmentEditApp({
    root: firstRoot,
    character: character(),
    sessionId: "session-table-equipment-uses-transients",
    storage,
    namespace: "test.mobile.table-equipment-uses-transients",
    runtime: runtime(),
    mode: "table",
  });

  assert.equal(mounted.mode, "table");
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="equipment-inline-editor"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-action="equipment-update"/);
  assert.match(firstRoot.innerHTML, /data-role="equipment-uses-controls"/);
  assert.match(firstRoot.innerHTML, /data-action="equipment-uses-update"/);
  assert.match(firstRoot.innerHTML, /Usos 1 \/ 3/);

  await firstRoot.dispatch("click", click("equipment-uses-update", {
    equipmentId: "equipment:lantern",
    equipmentUsesDelta: "1",
  }));

  assert.equal(firstRoot.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.session.history.length, 1);
  assert.equal(mounted.session.history[0].commandType, "equipment.update");
  assert.equal(mounted.character.equipment[0].uses, 2);
  assert.equal(mounted.character.equipment[0].maxUses, 3);
  assert.equal(mounted.character.equipment[0].quantity, 1);
  assert.equal(mounted.character.equipment[0].weightKg, 1);
  assert.equal(mounted.character.equipment[0].cost, 20);
  assert.equal(mounted.character.equipment[0].state, "carried");
  assert.equal(mounted.character.equipment[1].children.length, 1);
  assert.match(firstRoot.innerHTML, /Usos 2 \/ 3/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="equipment-inline-editor"/);

  await firstRoot.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-table-equipment-uses-transients");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.equipment[0].uses, 2);
  assert.equal(saved.character.equipment[0].maxUses, 3);
  assert.equal(saved.character.equipment[1].children.length, 1);

  mounted.equipmentEdit.destroy();

  const remountRoot = rootFixture();
  const remounted = await bootstrapCharacterMobileEquipmentEditApp({
    root: remountRoot,
    character: character(),
    sessionId: "session-table-equipment-uses-transients",
    storage,
    namespace: "test.mobile.table-equipment-uses-transients",
    runtime: runtime(),
    mode: "table",
  });
  await remountRoot.dispatch("click", click("persistence-load"));

  assert.equal(remounted.mode, "table");
  assert.equal(remounted.character.equipment[0].uses, 2);
  assert.equal(remounted.character.equipment[0].maxUses, 3);
  assert.equal(remounted.character.equipment[0].quantity, 1);
  assert.equal(remounted.character.equipment[0].weightKg, 1);
  assert.equal(remounted.character.equipment[0].cost, 20);
  assert.equal(remounted.character.equipment[0].state, "carried");
  assert.equal(remounted.character.equipment[1].children.length, 1);
  assert.match(remountRoot.innerHTML, /Usos 2 \/ 3/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-role="equipment-inline-editor"/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-action="equipment-update"/);
});
