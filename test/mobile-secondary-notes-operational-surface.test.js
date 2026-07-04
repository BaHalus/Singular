import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../src/domain/character/Character.js";
import { createApplicationSession } from "../src/application/session/ApplicationSession.js";
import { renderCharacterMobileApp } from "../src/ui/mobile/CharacterMobileApp.js";
import {
  mountCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "../src/ui/mobile/CharacterMobilePostRenderLifecycle.js";
import {
  mountCharacterMobileSecondaryNotesApp,
} from "../src/ui/mobile/CharacterMobileSecondaryNotesApp.js";

test("A6 secondary notes surface survives composed render, remount and mode changes", () => {
  const character = createCharacter({
    identity: { id: "character-a6", name: "A6 Test" },
    secondaryCharacteristics: {
      HP: { base: 10, override: 12 },
      FP: { base: 10, override: null },
      Will: { base: 10, override: 11 },
      Per: { base: 10, override: null },
      BasicSpeed: { base: 5, override: null },
      BasicMove: { base: 5, override: 6 },
    },
    pools: {
      HP: { current: 12, maximum: 12 },
      FP: { current: 10, maximum: 10 },
    },
    notes: {
      general: "A6 operational note",
      structured: [Object.freeze({
        id: "note-a6",
        title: "Cena",
        text: "Checar uso em mesa.",
        category: "sessão",
        reference: "A6",
        tags: ["alpha", "mobile"],
      })],
    },
  });
  const session = createApplicationSession({ id: "session-a6", character });
  const root = createRoot();
  const postRenderLifecycle = createCharacterMobilePostRenderLifecycle();
  let mode = "creation";
  let baseRenderCount = 0;
  let modeSyncCount = 0;

  const app = Object.freeze({
    get character() { return character; },
    get session() { return session; },
    get html() { return root.innerHTML; },
    get mode() { return mode; },
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() { modeSyncCount += 1; }, destroy() {} }),
    ui: Object.freeze({
      render({ mode: renderMode } = {}) {
        return renderCharacterMobileApp(character, { mode: renderMode ?? mode });
      },
      getState() { return Object.freeze({ busy: false }); },
    }),
    persistence: Object.freeze({ getActiveSession() { return session; } }),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle,
    render(options = {}) {
      baseRenderCount += 1;
      const renderMode = options.mode ?? mode;
      root.innerHTML = renderCharacterMobileApp(character, { mode: renderMode });
      if (!options.skipPostRenderLifecycle) {
        postRenderLifecycle.run({ root, character, session, mode: renderMode });
      }
      return root.innerHTML;
    },
  });

  const mounted = mountCharacterMobileCompositionRoot(app, { root }, [
    Object.freeze({
      name: "secondary-notes",
      destroyKey: "secondaryNotes",
      mount: mountCharacterMobileSecondaryNotesApp,
    }),
  ]);

  assert.equal(count(root.innerHTML, 'data-role="general-notes-editor"'), 1);
  assert.equal(count(root.innerHTML, 'data-role="structured-note-editor"'), 1);
  assert.equal(count(root.innerHTML, 'data-role="structured-note-inline-editor"'), 1);
  assert.equal(count(root.innerHTML, 'data-action="secondary-base-set"'), 6);
  assert.equal(count(root.innerHTML, 'data-card="notes"'), 1);

  mounted.render();
  mounted.render();

  assert.ok(baseRenderCount >= 2);
  assert.equal(count(root.innerHTML, 'data-role="general-notes-editor"'), 1);
  assert.equal(count(root.innerHTML, 'data-role="structured-note-editor"'), 1);
  assert.equal(count(root.innerHTML, 'data-role="structured-note-inline-editor"'), 1);
  assert.equal(count(root.innerHTML, 'data-action="secondary-base-set"'), 6);
  assert.equal(count(root.innerHTML, 'data-card="notes"'), 1);

  mode = "table";
  mounted.render();

  assert.equal(count(root.innerHTML, 'data-role="general-notes-editor"'), 0);
  assert.equal(count(root.innerHTML, 'data-role="structured-note-editor"'), 0);
  assert.equal(count(root.innerHTML, 'data-role="structured-note-inline-editor"'), 0);
  assert.equal(count(root.innerHTML, 'data-card="notes"'), 1);
  assert.match(root.innerHTML, /A6 operational note/);

  mode = "creation";
  mounted.render();

  assert.equal(count(root.innerHTML, 'data-role="general-notes-editor"'), 1);
  assert.equal(count(root.innerHTML, 'data-role="structured-note-inline-editor"'), 1);
  assert.ok(modeSyncCount >= 4);

  mounted.compositionRoot.destroy();
});

function createRoot() {
  const listeners = new Map();
  const attributes = new Map();
  return {
    innerHTML: "",
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector() { return null; },
  };
}

function count(html, needle) {
  return html.split(needle).length - 1;
}
