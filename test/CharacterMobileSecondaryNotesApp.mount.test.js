import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileSecondaryNotesApp } from "../src/ui/mobile/CharacterMobileSecondaryNotesApp.js";

test("secondary notes mount detaches only its own listener and observer", () => {
  const listeners = new Map();
  let disconnectCalls = 0;
  let observeCalls = 0;
  let previousDestroyCalls = 0;
  let modeSyncCalls = 0;

  const root = {
    innerHTML: [
      '<main data-singular-mobile-root>',
      '<section class="singular-mobile-sheet__card" data-card="secondary-characteristics">',
      "<h2>Secundárias</h2>",
      "</section>",
      "</main>",
    ].join(""),
    querySelector() { return null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    setAttribute() {},
  };

  const MutationObserver = function MutationObserver() {
    return {
      observe() { observeCalls += 1; },
      disconnect() { disconnectCalls += 1; },
    };
  };

  const character = Object.freeze({
    identity: Object.freeze({ id: "character-1" }),
    languages: [],
    familiarities: [],
    secondaryCharacteristics: Object.freeze({}),
    pools: Object.freeze({}),
    notes: Object.freeze({ general: "", structured: [] }),
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
    languageCulture: Object.freeze({ destroy() { previousDestroyCalls += 1; } }),
  };

  const mounted = mountCharacterMobileSecondaryNotesApp(app, { root, MutationObserver });

  assert.equal(listeners.has("click"), true);
  assert.equal(observeCalls, 1);
  assert.equal(modeSyncCalls, 1);
  assert.equal(mounted.character, app.character);
  assert.equal(mounted.session, app.session);

  mounted.secondaryNotes.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(disconnectCalls, 1);
  assert.equal(previousDestroyCalls, 0);
});
