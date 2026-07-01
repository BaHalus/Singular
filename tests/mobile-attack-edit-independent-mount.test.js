import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileAttackEditApp } from "../src/ui/mobile/CharacterMobileAttackEditApp.js";

test("attack edit mount cleanup stays local", () => {
  const listeners = new Map();
  let previousDestroyCalls = 0;
  let modeSyncCalls = 0;
  let disconnectCalls = 0;

  const root = {
    innerHTML: "",
    querySelector() { return null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    setAttribute() {},
  };

  const MutationObserver = function MutationObserver() {
    return {
      observe() {},
      disconnect() { disconnectCalls += 1; },
    };
  };

  const character = Object.freeze({ attacks: [] });
  const app = {
    character,
    session: Object.freeze({ id: "session-1" }),
    mode: "creation",
    interactions: Object.freeze({}),
    modeSync: Object.freeze({ sync() { modeSyncCalls += 1; } }),
    ui: Object.freeze({ getState: () => Object.freeze({ busy: false }) }),
    persistence: Object.freeze({ getActiveSession: () => Object.freeze({ character }) }),
    commands: Object.freeze({ updateAttack: () => Object.freeze({ status: "no-op" }) }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    languageCultureEdit: Object.freeze({ destroy() { previousDestroyCalls += 1; } }),
    render() {},
  };

  const mounted = mountCharacterMobileAttackEditApp(app, { root, MutationObserver });

  assert.equal(listeners.has("click"), true);
  assert.equal(modeSyncCalls, 1);
  assert.equal(mounted.character, app.character);

  mounted.attackEdit.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(disconnectCalls, 1);
  assert.equal(previousDestroyCalls, 0);
});
