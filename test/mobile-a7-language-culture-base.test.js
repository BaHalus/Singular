import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileLanguageCultureApp } from "../src/ui/mobile/CharacterMobileLanguageCultureApp.js";
import { createCharacterMobilePostRenderLifecycle } from "../src/ui/mobile/CharacterMobilePostRenderLifecycle.js";

test("A7 language culture base controls mount through post-render lifecycle without observers", () => {
  const root = createLanguageCultureRoot();
  const lifecycle = createCharacterMobilePostRenderLifecycle();
  const app = createLanguageCultureApp({ root, postRenderLifecycle: lifecycle });
  let observerConstructed = false;

  const mounted = mountCharacterMobileLanguageCultureApp(app, {
    root,
    MutationObserver: function MutationObserver() {
      observerConstructed = true;
    },
  });

  assert.equal(observerConstructed, false);
  assert.equal(lifecycle.size, 1);
  assert.equal(root.section.editorInsertions, 1);
  assert.equal(root.section.languageItem.actionInsertions, 1);
  assert.equal(root.section.familiarityItem.actionInsertions, 1);

  lifecycle.run({
    root,
    character: app.character,
    session: app.session,
    mode: "creation",
  });

  assert.equal(root.section.editorInsertions, 1);
  assert.equal(root.section.languageItem.actionInsertions, 1);
  assert.equal(root.section.familiarityItem.actionInsertions, 1);

  mounted.languageCulture.destroy();
  assert.equal(lifecycle.size, 0);
  assert.deepEqual(root.removedListeners, ["click"]);
});

test("A7 language culture base controls survive render, remount and mode changes", () => {
  const root = createLanguageCultureRoot();
  const lifecycle = createCharacterMobilePostRenderLifecycle();
  let renderCalls = 0;
  const app = createLanguageCultureApp({
    root,
    postRenderLifecycle: lifecycle,
    render() {
      renderCalls += 1;
      root.resetSection();
    },
  });

  const mounted = mountCharacterMobileLanguageCultureApp(app, { root });
  assert.equal(root.section.editorInsertions, 1);

  mounted.render();
  assert.equal(renderCalls, 1);
  assert.equal(root.section.editorInsertions, 1);
  assert.equal(root.section.languageItem.actionInsertions, 1);
  assert.equal(root.section.familiarityItem.actionInsertions, 1);

  mounted.render();
  assert.equal(renderCalls, 2);
  assert.equal(root.section.editorInsertions, 1);
  assert.equal(root.section.languageItem.actionInsertions, 1);
  assert.equal(root.section.familiarityItem.actionInsertions, 1);

  mounted.render({ mode: "table" });
  assert.equal(renderCalls, 3);
  assert.equal(root.section.editorInsertions, 0);
  assert.equal(root.section.languageItem.actionInsertions, 0);
  assert.equal(root.section.familiarityItem.actionInsertions, 0);

  mounted.render({ mode: "creation" });
  assert.equal(renderCalls, 4);
  assert.equal(root.section.editorInsertions, 1);
  assert.equal(root.section.languageItem.actionInsertions, 1);
  assert.equal(root.section.familiarityItem.actionInsertions, 1);

  mounted.languageCulture.destroy();
});

function createLanguageCultureApp(overrides = {}) {
  const character = {
    identity: { id: "character-a7" },
    languages: [{ id: "lang-a7", name: "Anglish" }],
    familiarities: [{ id: "fam-a7", name: "Yrth" }],
  };
  const session = { id: "session-a7", character };
  return Object.freeze({
    character,
    session,
    html: "",
    mode: "creation",
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() {} }),
    ui: Object.freeze({ getState: () => ({ busy: false }) }),
    persistence: Object.freeze({ getActiveSession: () => session }),
    commands: Object.freeze({
      addLanguage: () => ({ status: "applied" }),
      removeLanguage: () => ({ status: "applied" }),
      reorderLanguage: () => ({ status: "applied" }),
      addFamiliarity: () => ({ status: "applied" }),
      removeFamiliarity: () => ({ status: "applied" }),
      reorderFamiliarity: () => ({ status: "applied" }),
    }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle: createCharacterMobilePostRenderLifecycle(),
    ...overrides,
  });
}

function createLanguageCultureRoot() {
  const root = {
    innerHTML: "",
    attributes: {},
    removedListeners: [],
    querySelector(selector) {
      if (selector === '[data-card="languages-culture"]') return this.section;
      return null;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, listener) {
      this.listener = { type, listener };
    },
    removeEventListener(type) {
      this.removedListeners.push(type);
    },
    resetSection() {
      this.section = createLanguageCultureSection();
    },
  };
  root.resetSection();
  return root;
}

function createLanguageCultureSection() {
  const section = {
    editorInsertions: 0,
    languageItem: createLanguageCultureItem("lang-a7", "language"),
    familiarityItem: createLanguageCultureItem("fam-a7", "familiarity"),
    querySelector(selector) {
      if (selector === '[data-role="language-editor"]') {
        return this.editorInsertions > 0 ? { role: "language-editor" } : null;
      }
      if (selector === "h2") {
        return {
          insertAdjacentHTML: () => {
            this.editorInsertions += 1;
          },
        };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-entry-kind="language"][data-canonical-id]') return [this.languageItem];
      if (selector === '[data-entry-kind="familiarity"][data-canonical-id]') return [this.familiarityItem];
      return [];
    },
  };
  return section;
}

function createLanguageCultureItem(id, kind) {
  return {
    actionInsertions: 0,
    getAttribute(name) {
      return name === "data-canonical-id" ? id : null;
    },
    querySelector(selector) {
      if (selector === `[data-role="${kind}-actions"]`) {
        return this.actionInsertions > 0 ? { role: `${kind}-actions` } : null;
      }
      if (selector === "dd") {
        return {
          insertAdjacentHTML: () => {
            this.actionInsertions += 1;
          },
        };
      }
      if (selector === "dt") return { textContent: kind };
      return null;
    },
  };
}
