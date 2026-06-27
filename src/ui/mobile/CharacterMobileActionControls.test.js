import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(String(key)) ?? null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
}

function createRuntime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-26T22:15:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:mobile-${sequence}`;
      },
    },
  };
}

function createRoot() {
  const attributes = new Map();
  const listeners = new Map();
  const inputs = new Map();
  return {
    innerHTML: "",
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter(entry => entry !== listener),
      );
    },
    querySelector(selector) {
      return { value: inputs.get(selector) ?? "" };
    },
    querySelectorAll() {
      return [];
    },
    setInput(selector, value) {
      inputs.set(selector, value);
    },
    async dispatch(action, dataset = {}, editorInputs = {}) {
      const editor = action === "attack-update"
        ? {
          dataset: { attackEditId: dataset.attackId },
          parentElement: null,
          querySelector(selector) {
            return { value: editorInputs[selector] ?? "" };
          },
        }
        : null;
      const event = {
        target: {
          dataset: { action, ...dataset },
          parentElement: editor,
        },
        preventDefault() {},
      };
      for (const listener of listeners.get("click") ?? []) {
        await listener(event);
      }
    },
  };
}

function createSourceCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-action-controls",
      name: "Ayla",
    },
    attacks: [
      {
        id: "attack_sword",
        name: "Espada Curta",
        category: "melee",
        skillId: "skill_sword",
        source: { kind: "equipment", id: "eq_sword" },
        damage: { value: "1d+2", type: "corte" },
        reach: "C,1",
      },
    ],
  });
}

test("creates, edits, reorders and removes attacks through mobile App Core", async () => {
  const root = createRoot();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: createSourceCharacter(),
    sessionId: "session-mobile-action-controls",
    storage: createMemoryStorage(),
    namespace: "test.mobile.action-controls",
    runtime: createRuntime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-role="attack-editor"/);
  assert.match(root.innerHTML, /data-action="attack-add"/);
  assert.match(root.innerHTML, /data-attack-edit-id="attack_sword"/);
  assert.match(
    root.innerHTML,
    /data-action="attack-update" data-attack-id="attack_sword"/,
  );

  root.setInput('[data-role="attack-name"]', "Arco Curto");
  root.setInput('[data-role="attack-category"]', "ranged");
  root.setInput('[data-role="attack-skill-id"]', "skill_bow");
  root.setInput('[data-role="attack-damage-value"]', "1d");
  root.setInput('[data-role="attack-damage-type"]', "perfuração");
  root.setInput('[data-role="attack-range"]', "150/200");
  root.setInput('[data-role="attack-notes"]', "Requer flecha");

  await root.dispatch("attack-add");
  const bow = mounted.character.attacks[1];

  await root.dispatch("attack-update", { attackId: "attack_sword" }, {
    '[data-role="attack-edit-name"]': "Espada Curta Afiada",
    '[data-role="attack-edit-category"]': "melee",
    '[data-role="attack-edit-skill-id"]': "skill_sword",
    '[data-role="attack-edit-damage-value"]': "2d",
    '[data-role="attack-edit-damage-type"]': "corte",
    '[data-role="attack-edit-reach"]': "1",
    '[data-role="attack-edit-range"]': "",
    '[data-role="attack-edit-notes"]': "Lâmina melhorada",
  });

  const sword = mounted.character.attacks[0];
  assert.equal(mounted.session.revision, 2);
  assert.equal(sword.id, "attack_sword");
  assert.equal(sword.name, "Espada Curta Afiada");
  assert.deepEqual(sword.source, { kind: "equipment", id: "eq_sword" });
  assert.deepEqual(sword.damage, {
    value: "2d",
    type: "corte",
    authority: "declared",
  });
  assert.match(root.innerHTML, /Espada Curta Afiada/);

  await root.dispatch("attack-reorder", {
    attackId: bow.id,
    targetIndex: "0",
  });
  await root.dispatch("attack-remove", { attackId: "attack_sword" });

  assert.equal(mounted.session.revision, 4);
  assert.deepEqual(
    mounted.character.attacks.map(attack => attack.id),
    [bow.id],
  );
  assert.deepEqual(
    mounted.session.history.map(entry => entry.commandType),
    ["attack.add", "attack.update", "attack.reorder", "attack.remove"],
  );
  assert.deepEqual(await mounted.repositories.session.listIds(), []);
});

test("keeps all structural attack controls unavailable in table mode", async () => {
  const root = createRoot();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: createSourceCharacter(),
    sessionId: "session-mobile-action-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.action-table",
    runtime: createRuntime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-role="attack-editor"/);
  assert.doesNotMatch(root.innerHTML, /data-attack-edit-id=/);
  assert.doesNotMatch(root.innerHTML, /data-action="attack-update"/);
  assert.doesNotMatch(root.innerHTML, /data-action="attack-remove"/);
  assert.doesNotMatch(root.innerHTML, /data-action="attack-reorder"/);

  await root.dispatch("attack-update", { attackId: "attack_sword" });

  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.attacks[0].name, "Espada Curta");
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
});
