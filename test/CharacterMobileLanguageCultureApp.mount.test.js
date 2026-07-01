import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileLanguageCultureApp } from "../src/ui/mobile/CharacterMobileLanguageCultureApp.js";

test("language culture mount detaches only its own listener and observer", () => {
  const listeners = new Map();
  let disconnectCalls = 0;
  let observeCalls = 0;

  const root = {
    innerHTML: "",
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
  });
  const session = Object.freeze({ id: "session-1", character });
  const app = {
    character,
    session,
    mode: "creation",
    interactions: Object.freeze({}),
    modeSync: Object.freeze({ sync() {} }),
    ui: Object.freeze({ getState: () => Object.freeze({ busy: false }) }),
    persistence: Object.freeze({ getActiveSession: () => session }),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
  };

  const mounted = mountCharacterMobileLanguageCultureApp(app, { root, MutationObserver });

  assert.equal(listeners.has("click"), true);
  assert.equal(observeCalls, 1);
  assert.equal(mounted.character, app.character);
  assert.equal(mounted.session, app.session);

  mounted.languageCulture.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(disconnectCalls, 1);
});
