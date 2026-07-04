import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../src/domain/character/Character.js";
import { mountCharacterMobileSecondaryNotesApp } from "../src/ui/mobile/CharacterMobileSecondaryNotesApp.js";

test("secondary notes mount detaches only its own listener and lifecycle registration", () => {
  const listeners = new Map();
  let observerConstructCalls = 0;
  let unregisterCalls = 0;
  let registerCalls = 0;
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
    observerConstructCalls += 1;
    return {
      observe() {},
      disconnect() {},
    };
  };

  const character = createCharacter({
    identity: Object.freeze({
      id: "character-1",
      name: "Personagem de teste",
      concept: "Regressão H3-B",
      playerId: null,
      campaignId: null,
    }),
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
    postRenderLifecycle: Object.freeze({
      register() {
        registerCalls += 1;
        return () => { unregisterCalls += 1; };
      },
      run() {},
    }),
    languageCulture: Object.freeze({ destroy() { previousDestroyCalls += 1; } }),
    render() {},
  };

  const mounted = mountCharacterMobileSecondaryNotesApp(app, { root, MutationObserver });

  assert.equal(listeners.has("click"), true);
  assert.equal(observerConstructCalls, 0);
  assert.equal(registerCalls, 1);
  assert.equal(modeSyncCalls, 1);
  assert.equal(mounted.character, app.character);
  assert.equal(mounted.session, app.session);

  mounted.secondaryNotes.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(unregisterCalls, 1);
  assert.equal(observerConstructCalls, 0);
  assert.equal(previousDestroyCalls, 0);
});
