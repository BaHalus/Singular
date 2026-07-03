import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { bootstrapCharacterMobileLanguageCultureEditApp } from "./CharacterMobileLanguageCultureEditApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-mobile-language-culture-edit",
      name: "Lio",
      concept: "Intérprete",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 10, DX: 10, IQ: 12, HT: 10 },
    languages: [
      {
        id: "language:latin",
        name: "Latim",
        spokenLevel: "accented",
        writtenLevel: "native",
        isNative: false,
        notes: "Litúrgico.",
        tags: ["erudito"],
        source: { kind: "singular" },
      },
    ],
    familiarities: [
      {
        id: "familiarity:imperial",
        name: "Império Antigo",
        isNative: false,
        notes: "Costumes de corte.",
        tags: ["história"],
        source: { kind: "singular" },
      },
    ],
    metadata: {
      createdAt: "2026-06-28T22:45:00.000Z",
      updatedAt: "2026-06-28T22:45:00.000Z",
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
    clock: { now: () => "2026-06-28T22:46:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:language-culture-edit-mobile-${sequence}`;
      },
    },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  const inputValues = new Map();
  const root = {
    innerHTML: "",
    ownerDocument: createDocumentFixture(),
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
      const canonicalId = readCanonicalIdSelector(selector);
      if (canonicalId !== null && root.innerHTML.includes(`data-canonical-id="${canonicalId}"`)) {
        return createDefinitionListItemFixture(root, canonicalId);
      }
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
  return root;
}

function createDocumentFixture() {
  return {
    createElement(tagName) {
      if (tagName !== "template") return null;
      return {
        content: { childNodes: [] },
        set innerHTML(value) {
          this.content.childNodes = [String(value)];
        },
      };
    },
  };
}

function createDefinitionListItemFixture(root, canonicalId) {
  return {
    ownerDocument: root.ownerDocument,
    querySelector(selector) {
      const hasLanguageEditor = selector.includes('data-role="language-inline-editor"')
        && root.innerHTML.includes(`data-role="language-inline-editor" data-canonical-id="${canonicalId}"`);
      const hasFamiliarityEditor = selector.includes('data-role="familiarity-inline-editor"')
        && root.innerHTML.includes(`data-role="familiarity-inline-editor" data-canonical-id="${canonicalId}"`);
      return hasLanguageEditor || hasFamiliarityEditor ? {} : null;
    },
    append(...nodes) {
      root.innerHTML = `${root.innerHTML}${nodes.join("")}`;
    },
  };
}

function readCanonicalIdSelector(selector) {
  const match = /^\[data-canonical-id="(.+)"\]$/.exec(selector);
  return match === null ? null : match[1];
}

function click(action, dataset = {}) {
  return {
    target: { dataset: { action, ...dataset }, parentElement: null },
    preventDefault() {},
  };
}

test("edits existing mobile languages and cultural familiarities through canonical update commands", async () => {
  const root = rootFixture();
  let observerConstructCalls = 0;
  const mounted = await bootstrapCharacterMobileLanguageCultureEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-language-culture-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.language-culture-edit",
    runtime: runtime(),
    mode: "creation",
    MutationObserver() {
      observerConstructCalls += 1;
      return { observe() {}, disconnect() {} };
    },
  });

  assert.equal(observerConstructCalls, 0);
  assert.match(root.innerHTML, /data-action="language-update"/);
  assert.match(root.innerHTML, /data-action="familiarity-update"/);
  assert.match(root.innerHTML, /Latim/);
  assert.match(root.innerHTML, /Império Antigo/);

  const htmlAfterFirstMount = root.innerHTML;
  mounted.render();
  assert.equal(root.innerHTML.match(/data-action="language-update"/g).length, 1);
  assert.equal(root.innerHTML.match(/data-action="familiarity-update"/g).length, 1);
  assert.notEqual(root.innerHTML, "");
  assert.equal(observerConstructCalls, 0);
  assert.match(htmlAfterFirstMount, /data-role="language-inline-editor"/);

  root.setInput('[data-role="language-edit-name-language:latin"]', "Latim Imperial");
  root.setInput('[data-role="language-edit-spoken-level-language:latin"]', "native");
  root.setInput('[data-role="language-edit-written-level-language:latin"]', "native");
  root.setInput('[data-role="language-edit-native-language:latin"]', "true");
  root.setInput('[data-role="language-edit-tags-language:latin"]', "erudito, corte");
  root.setInput('[data-role="language-edit-notes-language:latin"]', "Uso diplomático.\nLinha 2");
  await root.dispatch("click", click("language-update", { languageId: "language:latin" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "language.update");
  assert.equal(mounted.character.languages[0].name, "Latim Imperial");
  assert.equal(mounted.character.languages[0].spokenLevel, "native");
  assert.equal(mounted.character.languages[0].writtenLevel, "native");
  assert.equal(mounted.character.languages[0].isNative, true);
  assert.equal(mounted.character.languages[0].notes, "Uso diplomático.\nLinha 2");
  assert.deepEqual(mounted.character.languages[0].tags, ["erudito", "corte"]);
  assert.match(root.innerHTML, /Latim Imperial/);
  assert.equal(root.innerHTML.match(/data-action="language-update"/g).length, 1);

  root.setInput('[data-role="familiarity-edit-name-familiarity:imperial"]', "Corte Imperial");
  root.setInput('[data-role="familiarity-edit-native-familiarity:imperial"]', "true");
  root.setInput('[data-role="familiarity-edit-tags-familiarity:imperial"]', "história, etiqueta");
  root.setInput('[data-role="familiarity-edit-notes-familiarity:imperial"]', "Etiqueta cortesã.\nLinha 2");
  await root.dispatch("click", click("familiarity-update", { familiarityId: "familiarity:imperial" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history[1].commandType, "familiarity.update");
  assert.equal(mounted.character.familiarities[0].name, "Corte Imperial");
  assert.equal(mounted.character.familiarities[0].isNative, true);
  assert.equal(mounted.character.familiarities[0].notes, "Etiqueta cortesã.\nLinha 2");
  assert.deepEqual(mounted.character.familiarities[0].tags, ["história", "etiqueta"]);
  assert.match(root.innerHTML, /Corte Imperial/);
  assert.equal(root.innerHTML.match(/data-action="familiarity-update"/g).length, 1);

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-language-culture-edit");

  assert.equal(saved.revision, 2);
  assert.equal(saved.character.languages[0].name, "Latim Imperial");
  assert.equal(saved.character.languages[0].spokenLevel, "native");
  assert.equal(saved.character.languages[0].writtenLevel, "native");
  assert.equal(saved.character.languages[0].isNative, true);
  assert.equal(saved.character.languages[0].notes, "Uso diplomático.\nLinha 2");
  assert.deepEqual(saved.character.languages[0].tags, ["erudito", "corte"]);
  assert.equal(saved.character.familiarities[0].name, "Corte Imperial");
  assert.equal(saved.character.familiarities[0].isNative, true);
  assert.equal(saved.character.familiarities[0].notes, "Etiqueta cortesã.\nLinha 2");
  assert.deepEqual(saved.character.familiarities[0].tags, ["história", "etiqueta"]);
});

test("blocks existing mobile language and culture edits in table mode", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileLanguageCultureEditApp({
    root,
    character: character(),
    sessionId: "session-mobile-language-culture-edit-table",
    storage: createMemoryStorage(),
    namespace: "test.mobile.language-culture-edit.table",
    runtime: runtime(),
    mode: "table",
  });

  assert.doesNotMatch(root.innerHTML, /data-action="language-update"/);
  assert.doesNotMatch(root.innerHTML, /data-action="familiarity-update"/);

  await root.dispatch("click", click("language-update", { languageId: "language:latin" }));
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");

  await root.dispatch("click", click("familiarity-update", { familiarityId: "familiarity:imperial" }));
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
  assert.equal(mounted.session.revision, 0);
  assert.equal(mounted.character.languages[0].name, "Latim");
  assert.equal(mounted.character.familiarities[0].name, "Império Antigo");
});
