import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileSkillTechniqueEditApp,
  injectMobileSkillTechniqueEditControls,
} from "./CharacterMobileSkillTechniqueEditApp.js";

function character() {
  return {
    skills: [
      {
        id: "skill:stealth",
        name: "Furtividade",
        specialization: "Urbana",
        techLevel: null,
        attribute: "DX",
        difficulty: "A",
        points: 2,
        notes: "mover-se sem chamar atenção",
        tags: ["mesa", "alpha"],
      },
    ],
    techniques: [
      {
        id: "technique:arm-lock",
        name: "Chave de Braço",
        specialization: "Judô",
        skillId: "skill:judo",
        skillName: "Judô",
        skillSpecialization: "",
        difficulty: "H",
        points: 3,
        defaultPenalty: -2,
        maximumRelativeLevel: 0,
        notes: "usar apenas em Criação",
        tags: ["combate"],
      },
    ],
  };
}

function fullCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-skill-technique-edit",
      name: "Lio",
      concept: "Especialista",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 12, IQ: 11, HT: 10 },
    ...character(),
    metadata: {
      createdAt: "2026-06-30T11:20:00.000Z",
      updatedAt: "2026-06-30T11:20:00.000Z",
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
    clock: { now: () => "2026-06-30T11:21:00.000Z" },
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

const html = '<section data-card="skills-techniques"><h2>Perícias e Técnicas</h2><p>conteúdo antigo</p></section>';

test("injects mobile skill and technique inline controls in creation mode", () => {
  const creation = injectMobileSkillTechniqueEditControls(html, character(), "creation");

  assert.match(creation, /data-role="skill-editor"/);
  assert.match(creation, /data-action="skill-add"/);
  assert.match(creation, /data-skill-id="skill:stealth"/);
  assert.match(creation, /data-role="skill-inline-editor"/);
  assert.match(creation, /data-action="skill-update"/);
  assert.match(creation, /data-role="skill-edit-name-skill:stealth"/);
  assert.match(creation, /mover-se sem chamar atenção/);
  assert.match(creation, /mesa, alpha/);

  assert.match(creation, /data-role="technique-editor"/);
  assert.match(creation, /data-action="technique-add"/);
  assert.match(creation, /data-technique-id="technique:arm-lock"/);
  assert.match(creation, /data-role="technique-inline-editor"/);
  assert.match(creation, /data-action="technique-update"/);
  assert.match(creation, /data-role="technique-edit-default-penalty-technique:arm-lock"/);
  assert.match(creation, /usar apenas em Criação/);
  assert.match(creation, /combate/);
});

test("renders skill and technique notes as textareas for multiline input", () => {
  const source = character();
  source.skills[0].notes = `Linha 1
Linha 2 com & < > "aspas"`;
  source.techniques[0].notes = `Técnica linha 1
Técnica linha 2 com & < > "aspas"`;

  const creation = injectMobileSkillTechniqueEditControls(html, source, "creation");

  assert.match(
    creation,
    /<textarea data-role="skill-notes" autocomplete="off"><\/textarea>/,
  );
  assert.match(
    creation,
    /<textarea data-role="technique-notes" autocomplete="off"><\/textarea>/,
  );
  assert.ok(creation.includes(
    `<textarea data-role="skill-edit-notes-skill:stealth" autocomplete="off">
Linha 1
Linha 2 com &amp; &lt; &gt; "aspas"</textarea>`,
  ));
  assert.ok(creation.includes(
    `<textarea data-role="technique-edit-notes-technique:arm-lock" autocomplete="off">
Técnica linha 1
Técnica linha 2 com &amp; &lt; &gt; "aspas"</textarea>`,
  ));
  assert.doesNotMatch(creation, /data-role="skill-edit-notes-skill:stealth" value=/);
  assert.doesNotMatch(creation, /data-role="technique-edit-notes-technique:arm-lock" value=/);
});

test("preserves leading blank lines in skill and technique note textareas", () => {
  const source = character();
  source.skills[0].notes = `
Linha inicial de perícia`;
  source.techniques[0].notes = `
Linha inicial de técnica`;

  const creation = injectMobileSkillTechniqueEditControls(html, source, "creation");

  assert.ok(creation.includes(
    `<textarea data-role="skill-edit-notes-skill:stealth" autocomplete="off">

Linha inicial de perícia</textarea>`,
  ));
  assert.ok(creation.includes(
    `<textarea data-role="technique-edit-notes-technique:arm-lock" autocomplete="off">

Linha inicial de técnica</textarea>`,
  ));
});

test("edits existing mobile skills and techniques through canonical update commands", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileSkillTechniqueEditApp({
    root,
    character: fullCharacter(),
    sessionId: "session-mobile-skill-technique-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.skill-technique-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="skill-update"/);
  assert.match(root.innerHTML, /data-action="technique-update"/);

  root.setInput('[data-role="skill-edit-name-skill:stealth"]', "Furtividade Urbana");
  root.setInput('[data-role="skill-edit-specialization-skill:stealth"]', "Becos");
  root.setInput('[data-role="skill-edit-tech-level-skill:stealth"]', "3");
  root.setInput('[data-role="skill-edit-attribute-skill:stealth"]', "DX");
  root.setInput('[data-role="skill-edit-difficulty-skill:stealth"]', "H");
  root.setInput('[data-role="skill-edit-points-skill:stealth"]', "4");
  root.setInput('[data-role="skill-edit-tags-skill:stealth"]', "mesa, furtivo");
  root.setInput('[data-role="skill-edit-notes-skill:stealth"]', "Mover em silêncio.\nLinha 2");
  await root.dispatch("click", click("skill-update", { skillId: "skill:stealth" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "skill.update");
  assert.equal(mounted.character.skills[0].name, "Furtividade Urbana");
  assert.equal(mounted.character.skills[0].specialization, "Becos");
  assert.equal(mounted.character.skills[0].techLevel, "3");
  assert.equal(mounted.character.skills[0].difficulty, "H");
  assert.equal(mounted.character.skills[0].points, 4);
  assert.equal(mounted.character.skills[0].notes, "Mover em silêncio.\nLinha 2");
  assert.deepEqual(mounted.character.skills[0].tags, ["mesa", "furtivo"]);

  root.setInput('[data-role="technique-edit-name-technique:arm-lock"]', "Chave Relâmpago");
  root.setInput('[data-role="technique-edit-specialization-technique:arm-lock"]', "Judô Defensivo");
  root.setInput('[data-role="technique-edit-skill-id-technique:arm-lock"]', "skill:judo");
  root.setInput('[data-role="technique-edit-skill-name-technique:arm-lock"]', "Judô");
  root.setInput('[data-role="technique-edit-skill-specialization-technique:arm-lock"]', "Defesa");
  root.setInput('[data-role="technique-edit-difficulty-technique:arm-lock"]', "A");
  root.setInput('[data-role="technique-edit-points-technique:arm-lock"]', "5");
  root.setInput('[data-role="technique-edit-default-penalty-technique:arm-lock"]', "-1");
  root.setInput('[data-role="technique-edit-maximum-relative-level-technique:arm-lock"]', "1");
  root.setInput('[data-role="technique-edit-tags-technique:arm-lock"]', "combate, controle");
  root.setInput('[data-role="technique-edit-notes-technique:arm-lock"]', "Entrada rápida.\nLinha 2");
  await root.dispatch("click", click("technique-update", { techniqueId: "technique:arm-lock" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history[1].commandType, "technique.update");
  assert.equal(mounted.character.techniques[0].name, "Chave Relâmpago");
  assert.equal(mounted.character.techniques[0].specialization, "Judô Defensivo");
  assert.equal(mounted.character.techniques[0].skillSpecialization, "Defesa");
  assert.equal(mounted.character.techniques[0].difficulty, "A");
  assert.equal(mounted.character.techniques[0].points, 5);
  assert.equal(mounted.character.techniques[0].defaultPenalty, -1);
  assert.equal(mounted.character.techniques[0].maximumRelativeLevel, 1);
  assert.equal(mounted.character.techniques[0].notes, "Entrada rápida.\nLinha 2");
  assert.deepEqual(mounted.character.techniques[0].tags, ["combate", "controle"]);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-skill-technique-edit");

  assert.equal(saved.revision, 2);
  assert.equal(saved.character.skills[0].name, "Furtividade Urbana");
  assert.equal(saved.character.skills[0].notes, "Mover em silêncio.\nLinha 2");
  assert.equal(saved.character.techniques[0].name, "Chave Relâmpago");
  assert.equal(saved.character.techniques[0].notes, "Entrada rápida.\nLinha 2");
});

test("keeps skill and technique structural edit controls out of table mode", () => {
  const table = injectMobileSkillTechniqueEditControls(html, character(), "table");

  assert.doesNotMatch(table, /data-role="skill-editor"/);
  assert.doesNotMatch(table, /data-role="skill-inline-editor"/);
  assert.doesNotMatch(table, /data-action="skill-add"/);
  assert.doesNotMatch(table, /data-action="skill-update"/);
  assert.doesNotMatch(table, /data-role="technique-editor"/);
  assert.doesNotMatch(table, /data-role="technique-inline-editor"/);
  assert.doesNotMatch(table, /data-action="technique-add"/);
  assert.doesNotMatch(table, /data-action="technique-update"/);
  assert.match(table, /Furtividade/);
  assert.match(table, /Chave de Braço/);
});
