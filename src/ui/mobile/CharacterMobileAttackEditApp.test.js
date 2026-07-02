import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileAttackEditApp,
  injectMobileAttackEditControls,
} from "./CharacterMobileAttackEditApp.js";

const html = '<section data-card="attacks"><h2>Ataques</h2><dl><div data-attack-id="attack:sword"><dt>Ataque</dt><dd>Espada longa</dd></div></dl></section>';

function character() {
  return {
    attacks: [
      {
        id: "attack:sword",
        name: "Espada longa",
        category: "melee",
        skillId: "skill:broadsword",
        damage: {
          value: "1d+2",
          type: "cut",
        },
        reach: "1",
        range: null,
        notes: "usar com escudo",
      },
    ],
  };
}

function fullCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-attack-edit",
      name: "Aldric",
      concept: "Guarda de muralha",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 12, DX: 11, IQ: 10, HT: 10 },
    ...character(),
    metadata: {
      createdAt: "2026-06-30T11:40:00.000Z",
      updatedAt: "2026-06-30T11:40:00.000Z",
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
    clock: { now: () => "2026-06-30T11:41:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:attack-edit-mobile-${sequence}`;
      },
    },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  const inputValues = new Map();
  const attackEditors = [];
  const documentRef = createTemplateDocument();
  const attackItem = {
    ownerDocument: documentRef,
    querySelector(selector) {
      if (selector === '[data-role="attack-inline-editor"][data-attack-id="attack:sword"]') {
        return attackEditors.length > 0 ? {} : null;
      }
      return null;
    },
    append(...nodes) {
      attackEditors.push(...nodes.map(String));
    },
  };
  let innerHTML = "";

  return {
    get innerHTML() {
      return innerHTML;
    },
    set innerHTML(value) {
      innerHTML = String(value);
      attackEditors.length = 0;
    },
    ownerDocument: documentRef,
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
      if (selector === '[data-attack-id="attack:sword"]') return attackItem;
      return { value: inputValues.get(selector) ?? "" };
    },
    querySelectorAll() {
      return [];
    },
    attackEditorHtml() {
      return attackEditors.join("");
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

function createTemplateDocument() {
  return {
    createElement(tagName) {
      assert.equal(tagName, "template");
      return {
        content: { childNodes: [] },
        set innerHTML(value) {
          this.content.childNodes = [value];
        },
      };
    },
  };
}

function click(action, dataset = {}) {
  return {
    target: { dataset: { action, ...dataset }, parentElement: null },
    preventDefault() {},
  };
}

test("injects mobile attack inline editor in creation mode", () => {
  const creation = injectMobileAttackEditControls(html, character(), "creation");

  assert.match(creation, /data-role="attack-inline-editor"/);
  assert.match(creation, /data-action="attack-update"/);
  assert.match(creation, /data-role="attack-edit-name-attack:sword"/);
  assert.match(creation, /data-role="attack-edit-damage-value-attack:sword"/);
  assert.match(creation, /usar com escudo/);
});

test("renders attack notes as textareas for multiline input", () => {
  const source = character();
  source.attacks[0].notes = `Linha 1
Linha 2 com & < > "aspas"`;

  const creation = injectMobileAttackEditControls(html, source, "creation");

  assert.ok(creation.includes(
    `<textarea data-role="attack-edit-notes-attack:sword" autocomplete="off">
Linha 1
Linha 2 com &amp; &lt; &gt; "aspas"</textarea>`,
  ));
  assert.doesNotMatch(creation, /data-role="attack-edit-notes-attack:sword" value=/);
});

test("preserves leading blank lines in attack note textareas", () => {
  const source = character();
  source.attacks[0].notes = `
Linha inicial de ataque`;

  const creation = injectMobileAttackEditControls(html, source, "creation");

  assert.ok(creation.includes(
    `<textarea data-role="attack-edit-notes-attack:sword" autocomplete="off">

Linha inicial de ataque</textarea>`,
  ));
});

test("edits existing mobile attacks through canonical update commands", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileAttackEditApp({
    root,
    character: fullCharacter(),
    sessionId: "session-mobile-attack-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.attack-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.attackEditorHtml(), /data-action="attack-update"/);

  root.setInput('[data-role="attack-edit-name-attack:sword"]', "Arco defensivo");
  root.setInput('[data-role="attack-edit-category-attack:sword"]', "ranged");
  root.setInput('[data-role="attack-edit-skill-id-attack:sword"]', "skill:bow");
  root.setInput('[data-role="attack-edit-damage-value-attack:sword"]', "1d+1");
  root.setInput('[data-role="attack-edit-damage-type-attack:sword"]', "imp");
  root.setInput('[data-role="attack-edit-reach-attack:sword"]', "");
  root.setInput('[data-role="attack-edit-range-attack:sword"]', "100/200");
  root.setInput('[data-role="attack-edit-notes-attack:sword"]', "Manter distância.\nLinha 2");
  await root.dispatch("click", click("attack-update", { attackId: "attack:sword" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "attack.update");
  assert.equal(mounted.character.attacks[0].name, "Arco defensivo");
  assert.equal(mounted.character.attacks[0].category, "ranged");
  assert.equal(mounted.character.attacks[0].skillId, "skill:bow");
  assert.deepEqual(mounted.character.attacks[0].damage, { value: "1d+1", type: "imp", authority: "declared" });
  assert.equal(mounted.character.attacks[0].reach, null);
  assert.equal(mounted.character.attacks[0].range, "100/200");
  assert.equal(mounted.character.attacks[0].notes, "Manter distância.\nLinha 2");

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-attack-edit");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.attacks[0].name, "Arco defensivo");
  assert.equal(saved.character.attacks[0].category, "ranged");
  assert.equal(saved.character.attacks[0].skillId, "skill:bow");
  assert.deepEqual(saved.character.attacks[0].damage, { value: "1d+1", type: "imp", authority: "declared" });
  assert.equal(saved.character.attacks[0].reach, null);
  assert.equal(saved.character.attacks[0].range, "100/200");
  assert.equal(saved.character.attacks[0].notes, "Manter distância.\nLinha 2");
});

test("keeps attack structural edit controls out of table mode", () => {
  const table = injectMobileAttackEditControls(html, character(), "table");

  assert.doesNotMatch(table, /data-role="attack-inline-editor"/);
  assert.doesNotMatch(table, /data-action="attack-update"/);
  assert.match(table, /Espada longa/);
});
