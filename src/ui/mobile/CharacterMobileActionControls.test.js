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
    async dispatch(action, dataset = {}) {
      const event = {
        target: {
          dataset: { action, ...dataset },
          parentElement: null,
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

test("creates, reorders and removes attacks through the mobile App Core", async () => {
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
  assert.match(
    root.innerHTML,
    /data-action="attack-remove" data-attack-id="attack_sword"/,
  );

  root.setInput('[data-role="attack-name"]', "Arco Curto");
  root.setInput('[data-role="attack-category"]', "ranged");
  root.setInput('[data-role="attack-skill-id"]', "skill_bow");
  root.setInput('[data-role="attack-damage-value"]', "1d");
  root.setInput('[data-role="attack-damage-type"]', "perfuração");
  root.setInput('[data-role="attack-range"]', "150/200");
  root.setInput('[data-role="attack-notes"]', "Requer flecha");

  await root.dispatch("attack-add");

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.attacks.length, 2);
  const bow = mounted.character.attacks[1];
  assert.equal(bow.name, "Arco Curto");
  assert.equal(bow.category, "ranged");
  assert.deepEqual(bow.source, { kind: "manual", id: null });
  assert.deepEqual(bow.damage, {
    value: "1d",
    type: "perfuração",
    authority: "declared",
  });
  assert.match(root.innerHTML, /Arco Curto/);
  assert.equal(root.getAttribute("data-last-command-status"), "applied");

  await root.dispatch("attack-reorder", {
    attackId: bow.id,
    targetIndex: "0",
  });

  assert.equal(mounted.session.revision, 2);
  assert.deepEqual(
    mounted.character.attacks.map(attack => attack.id),
    [bow.id, "attack_sword"],
  );

  await root.dispatch("attack-remove", { attackId: "attack_sword" });

  assert.equal(mounted.session.revision, 3);
  assert.deepEqual(
    mounted.character.attacks.map(attack => attack.id),
    [bow.id],
  );
  assert.deepEqual(
    mounted.session.history.map(entry => entry.commandType),
    ["attack.add", "attack.reorder", "attack.remove"],
  );
  assert.deepEqual(await mounted.repositories.session.listIds(), []);
});

test("keeps structural attack controls unavailable in table mode", async () => {
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
  assert.doesNotMatch(root.innerHTML, /data-action="attack-remove"/);
  assert.doesNotMatch(root.innerHTML, /data-action="attack-reorder"/);

  await root.dispatch("attack-add");

  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.attacks.length, 1);
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
});
