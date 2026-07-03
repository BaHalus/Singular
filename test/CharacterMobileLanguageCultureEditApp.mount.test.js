import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileLanguageCultureEditApp } from "../src/ui/mobile/CharacterMobileLanguageCultureEditApp.js";

test("language culture edit mount detaches only its own listener without observer", () => {
  const listeners = new Map();
  let observerConstructCalls = 0;
  let disconnectCalls = 0;
  let observeCalls = 0;
  let previousDestroyCalls = 0;
  let modeSyncCalls = 0;
  let renderCalls = 0;

  const root = createLanguageCultureRoot();

  const MutationObserver = function MutationObserver() {
    observerConstructCalls += 1;
    return {
      observe() { observeCalls += 1; },
      disconnect() { disconnectCalls += 1; },
    };
  };

  const character = Object.freeze({
    identity: Object.freeze({ id: "character-1" }),
    languages: Object.freeze([
      Object.freeze({
        id: "language-1",
        name: "Comum",
        spokenLevel: "native",
        writtenLevel: "accented",
        isNative: true,
        tags: Object.freeze([]),
        notes: "",
      }),
    ]),
    familiarities: Object.freeze([
      Object.freeze({
        id: "culture-1",
        name: "Yrth",
        isNative: true,
        tags: Object.freeze([]),
        notes: "",
      }),
    ]),
  });
  const session = Object.freeze({ id: "session-1", character });
  const app = {
    character,
    session,
    mode: "creation",
    interactions: Object.freeze({}),
    modeSync: Object.freeze({ sync() { modeSyncCalls += 1; } }),
    ui: Object.freeze({ getState: () => Object.freeze({ busy: false }) }),
    persistence: Object.freeze({ getActiveSession: () => session }),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    render() { renderCalls += 1; },
    skillTechniqueEdit: Object.freeze({ destroy() { previousDestroyCalls += 1; } }),
  };

  const mounted = mountCharacterMobileLanguageCultureEditApp(app, { root, MutationObserver });

  assert.equal(listeners.has("click"), true);
  assert.equal(observerConstructCalls, 0);
  assert.equal(observeCalls, 0);
  assert.equal(modeSyncCalls, 1);
  assert.equal(renderCalls, 0);
  assert.equal(mounted.character, app.character);
  assert.equal(mounted.session, app.session);
  assert.match(mounted.html, /data-role="language-inline-editor"/);
  assert.match(mounted.html, /data-role="familiarity-inline-editor"/);

  mounted.languageCultureEdit.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(disconnectCalls, 0);
  assert.equal(previousDestroyCalls, 0);
});

function createLanguageCultureRoot() {
  const root = {
    innerHTML: [
      "<main data-singular-mobile-root>",
      "<dl>",
      '<div><dt>Idioma</dt><dd data-entry-kind="language" data-canonical-id="language-1">Comum</dd></div>',
      '<div><dt>Cultura</dt><dd data-entry-kind="familiarity" data-canonical-id="culture-1">Yrth</dd></div>',
      "</dl>",
      "</main>",
    ].join(""),
    ownerDocument: null,
    querySelector(selector) { return findDefinitionListItem(root, selector); },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    setAttribute() {},
  };

  root.ownerDocument = {
    createElement(tagName) {
      assert.equal(tagName, "template");
      return createTemplateElement();
    },
  };

  const listeners = new Map();
  root.addEventListener = (type, listener) => { listeners.set(type, listener); };
  root.removeEventListener = (type, listener) => {
    if (listeners.get(type) === listener) listeners.delete(type);
  };
  root.hasListener = type => listeners.has(type);

  return root;
}

function findDefinitionListItem(root, selector) {
  const match = /^\[data-entry-kind="([^"]+)"\]\[data-canonical-id="([^"]+)"\]$/.exec(selector);
  if (match === null) return null;
  const [, entryKind, canonicalId] = match;
  const itemMarker = `data-entry-kind="${entryKind}" data-canonical-id="${canonicalId}"`;
  const markerIndex = root.innerHTML.indexOf(itemMarker);
  if (markerIndex < 0) return null;

  return {
    ownerDocument: root.ownerDocument,
    querySelector(childSelector) {
      if (childSelector === "dd") {
        return createMountTarget(root, markerIndex);
      }
      return hasInlineEditor(root, childSelector, entryKind, canonicalId) ? {} : null;
    },
  };
}

function hasInlineEditor(root, selector, entryKind, canonicalId) {
  const roleMatch = /\[data-role="([^"]+)"\]/.exec(selector);
  if (roleMatch === null) return false;
  return root.innerHTML.includes(`data-role="${roleMatch[1]}"`)
    && root.innerHTML.includes(`data-canonical-id="${canonicalId}"`)
    && root.innerHTML.includes(`data-entry-kind="${entryKind}"`);
}

function createMountTarget(root, markerIndex) {
  return {
    append(...nodes) {
      const ddEnd = root.innerHTML.indexOf("</dd>", markerIndex);
      assert.notEqual(ddEnd, -1);
      const renderedNodes = nodes.map(node => String(node)).join("");
      root.innerHTML = `${root.innerHTML.slice(0, ddEnd)}${renderedNodes}${root.innerHTML.slice(ddEnd)}`;
    },
  };
}

function createTemplateElement() {
  return {
    content: { childNodes: [] },
    set innerHTML(value) { this.content.childNodes = [value]; },
  };
}