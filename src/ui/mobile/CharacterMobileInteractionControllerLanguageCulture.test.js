import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileInteractionController } from "./CharacterMobileInteractionController.js";

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  return {
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
    dispatch(type, event) {
      return (listeners.get(type) ?? []).map(listener => listener(event));
    },
  };
}

function createBaseCommands() {
  const applied = () => Object.freeze({ status: "applied" });
  return {
    adjustPoolCurrent: applied,
    setCharacterSummary: applied,
    adjustAttributeBase: applied,
    addAttack: applied,
    removeAttack: applied,
    reorderAttack: applied,
    addEquipment: applied,
    removeEquipment: applied,
    reorderEquipment: applied,
    setEquipmentState: applied,
    addSpell: applied,
    removeSpell: applied,
    reorderSpell: applied,
    addTrait: applied,
    removeTrait: applied,
    reorderTrait: applied,
  };
}

function mountController({ mode = "creation", commands = {}, readers = {}, busy = false } = {}) {
  const root = rootFixture();
  const calls = [];
  const mounted = mountCharacterMobileInteractionController({
    root,
    commands: {
      ...createBaseCommands(),
      ...commands,
    },
    ui: { getState: () => ({ busy }) },
    getMode: () => mode,
    setMode() {},
    readCharacterSummary: () => ({}),
    readAttackDraft: () => ({}),
    readEquipmentDraft: () => ({}),
    readSpellDraft: () => ({}),
    readTraitDraft: () => ({}),
    render() {
      calls.push("render");
    },
    syncMode() {
      calls.push("sync");
    },
    ...readers,
  });
  return { root, mounted, calls };
}

function click(action, dataset = {}) {
  let prevented = false;
  return {
    target: {
      dataset: { action, ...dataset },
      parentElement: null,
    },
    preventDefault() {
      prevented = true;
    },
    get prevented() {
      return prevented;
    },
  };
}

test("routes mobile language creation actions through canonical commands and rerenders", () => {
  const commandCalls = [];
  const languageDraft = { language: { name: "Anão", spokenLevel: "accented" } };
  const { root, calls } = mountController({
    commands: {
      addLanguage(payload) {
        commandCalls.push(["add", payload]);
        return { status: "applied" };
      },
      removeLanguage(payload) {
        commandCalls.push(["remove", payload]);
        return { status: "applied" };
      },
      reorderLanguage(payload) {
        commandCalls.push(["reorder", payload]);
        return { status: "no-op" };
      },
    },
    readers: {
      readLanguageDraft: () => languageDraft,
    },
  });

  const addEvent = click("language-add");
  const removeEvent = click("language-remove", { languageId: "language-1" });
  const reorderEvent = click("language-reorder", { languageId: "language-1", targetIndex: "2" });

  root.dispatch("click", addEvent);
  root.dispatch("click", removeEvent);
  root.dispatch("click", reorderEvent);

  assert.equal(addEvent.prevented, true);
  assert.equal(removeEvent.prevented, true);
  assert.equal(reorderEvent.prevented, true);
  assert.deepEqual(commandCalls, [
    ["add", languageDraft],
    ["remove", { languageId: "language-1" }],
    ["reorder", { languageId: "language-1", targetIndex: 2 }],
  ]);
  assert.deepEqual(calls, ["render", "sync", "render", "sync", "render", "sync"]);
  assert.equal(root.getAttribute("data-last-command-status"), "no-op");
});

test("routes mobile familiarity creation actions through canonical commands and rerenders", () => {
  const commandCalls = [];
  const familiarityDraft = { familiarity: { name: "Elfos", isNative: false } };
  const { root, calls } = mountController({
    commands: {
      addFamiliarity(payload) {
        commandCalls.push(["add", payload]);
        return { status: "applied" };
      },
      removeFamiliarity(payload) {
        commandCalls.push(["remove", payload]);
        return { status: "applied" };
      },
      reorderFamiliarity(payload) {
        commandCalls.push(["reorder", payload]);
        return { status: "applied" };
      },
    },
    readers: {
      readFamiliarityDraft: () => familiarityDraft,
    },
  });

  root.dispatch("click", click("familiarity-add"));
  root.dispatch("click", click("familiarity-remove", { familiarityId: "familiarity-1" }));
  root.dispatch("click", click("familiarity-reorder", { familiarityId: "familiarity-1", targetIndex: "0" }));

  assert.deepEqual(commandCalls, [
    ["add", familiarityDraft],
    ["remove", { familiarityId: "familiarity-1" }],
    ["reorder", { familiarityId: "familiarity-1", targetIndex: 0 }],
  ]);
  assert.deepEqual(calls, ["render", "sync", "render", "sync", "render", "sync"]);
  assert.equal(root.getAttribute("data-last-command-status"), "applied");
});

test("blocks mobile language and familiarity structural edits outside creation mode", () => {
  let languageCalls = 0;
  let familiarityCalls = 0;
  const { root, calls } = mountController({
    mode: "table",
    commands: {
      addLanguage() {
        languageCalls += 1;
        return { status: "applied" };
      },
      addFamiliarity() {
        familiarityCalls += 1;
        return { status: "applied" };
      },
    },
    readers: {
      readLanguageDraft: () => ({ language: { name: "Bloqueado" } }),
      readFamiliarityDraft: () => ({ familiarity: { name: "Bloqueada" } }),
    },
  });

  root.dispatch("click", click("language-add"));
  root.dispatch("click", click("familiarity-add"));

  assert.equal(languageCalls, 0);
  assert.equal(familiarityCalls, 0);
  assert.deepEqual(calls, []);
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");
});
