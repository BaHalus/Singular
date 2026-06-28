import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileSkillTechniqueEditApp } from "./CharacterMobileSkillTechniqueEditApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-skill-technique-edit",
      name: "Mira",
      concept: "Batedora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 12, IQ: 11, HT: 10 },
    skills: [
      {
        id: "skill:stealth",
        name: "Furtividade",
        specialization: "",
        techLevel: null,
        attribute: "DX",
        difficulty: "A",
        points: 2,
        notes: "Aproximação silenciosa.",
        tags: ["campo"],
        source: { kind: "singular" },
      },
    ],
    techniques: [
      {
        id: "technique:neck-strike",
        name: "Golpe no Pescoço",
        specialization: "Faca",
        skillId: "skill:knife",
        skillName: "Faca",
        skillSpecialization: "",
        difficulty: "H",
        points: 1,
        defaultPenalty: -5,
        maximumRelativeLevel: 0,
        notes: "Ataque direcionado.",
        tags: ["combate"],
        source: { kind: "singular" },
      },
    ],
    metadata: {
      createdAt: "2026-06-28T22:30:00.000Z",
      updatedAt: "2026-06-28T22:30:00.000Z",
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
    clock: { now: () => "2026-06-28T22:31:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:skill-technique-edit-mobile-${sequence}`;
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

test("edits existing mobile skills and techniques through canonical update commands", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSkillTechniqueEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-skill-technique-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.skill-technique-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="skill-update"/);
  assert.match(root.innerHTML, /data-action="technique-update"/);
  assert.match(root.innerHTML, /Furtividade/);
  assert.match(root.innerHTML, /Golpe no Pescoço/);

  root.setInput('[data-role="skill-edit-name-skill:stealth"]', "Furtividade Urbana");
  root.setInput('[data-role="skill-edit-specialization-skill:stealth"]', "Becos");
  root.setInput('[data-role="skill-edit-tech-level-skill:stealth"]', "3");
  root.setInput('[data-role="skill-edit-attribute-skill:stealth"]', "DX");
  root.setInput('[data-role="skill-edit-difficulty-skill:stealth"]', "H");
  root.setInput('[data-role="skill-edit-points-skill:stealth"]', "4");
  root.setInput('[data-role="skill-edit-tags-skill:stealth"]', "campo, cidade");
  root.setInput('[data-role="skill-edit-notes-skill:stealth"]', "Movimento silencioso em ruas.");
  await root.dispatch("click", click("skill-update", { skillId: "skill:stealth" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "skill.update");
  assert.equal(mounted.character.skills[0].name, "Furtividade Urbana");
  assert.equal(mounted.character.skills[0].specialization, "Becos");
  assert.equal(mounted.character.skills[0].techLevel, "3");
  assert.equal(mounted.character.skills[0].difficulty, "H");
  assert.equal(mounted.character.skills[0].points, 4);
  assert.deepEqual(mounted.character.skills[0].tags, ["campo", "cidade"]);
  assert.match(root.innerHTML, /Furtividade Urbana/);

  root.setInput('[data-role="technique-edit-name-technique:neck-strike"]', "Golpe Preciso no Pescoço");
  root.setInput('[data-role="technique-edit-specialization-technique:neck-strike"]', "Faca");
  root.setInput('[data-role="technique-edit-skill-id-technique:neck-strike"]', "skill:knife");
  root.setInput('[data-role="technique-edit-skill-name-technique:neck-strike"]', "Faca");
  root.setInput('[data-role="technique-edit-skill-specialization-technique:neck-strike"]', "Curta");
  root.setInput('[data-role="technique-edit-difficulty-technique:neck-strike"]', "H");
  root.setInput('[data-role="technique-edit-points-technique:neck-strike"]', "2");
  root.setInput('[data-role="technique-edit-default-penalty-technique:neck-strike"]', "-4");
  root.setInput('[data-role="technique-edit-maximum-relative-level-technique:neck-strike"]', "1");
  root.setInput('[data-role="technique-edit-tags-technique:neck-strike"]', "combate, precisão");
  root.setInput('[data-role="technique-edit-notes-technique:neck-strike"]', "Ataque treinado.");
  await root.dispatch("click", click("technique-update", { techniqueId: "technique:neck-strike" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history[1].commandType, "technique.update");
  assert.equal(mounted.character.techniques[0].name, "Golpe Preciso no Pescoço");
  assert.equal(mounted.character.techniques[0].skillSpecialization, "Curta");
  assert.equal(mounted.character.techniques[0].points, 2);
  assert.equal(mounted.character.techniques[0].defaultPenalty, -4);
  assert.equal(mounted.character.techniques[0].maximumRelativeLevel, 1);
  assert.deepEqual(mounted.character.techniques[0].tags, ["combate", "precisão"]);
  assert.match(root.innerHTML, /Golpe Preciso no Pescoço/);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-skill-technique-edit");

  assert.equal(saved.revision, 2);
  assert.equal(saved.character.skills[0].name, "Furtividade Urbana");
  assert.equal(saved.character.techniques[0].name, "Golpe Preciso no Pescoço");
});

test("blocks existing mobile skill and technique edits in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSkillTechniqueEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-skill-technique-edit-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.skill-technique-edit.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="skill-update"/);
  assert.doesNotMatch(root.innerHTML, /data-action="technique-update"/);

  await root.dispatch("click", click("skill-update", { skillId: "skill:stealth" }));
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");

  await root.dispatch("click", click("technique-update", { techniqueId: "technique:neck-strike" }));
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.skills[0].name, "Furtividade");
  assert.equal(mounted.character.techniques[0].name, "Golpe no Pescoço");
});
