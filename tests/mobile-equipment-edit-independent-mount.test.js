import test from "node:test";
import assert from "node:assert/strict";

import {
  mountCharacterMobileEquipmentEditApp,
} from "../src/ui/mobile/CharacterMobileEquipmentEditApp.js";

test("equipment edit mount detaches only its own listener", () => {
  const listeners = new Map();
  let previousDestroyCalls = 0;
  let modeSyncCalls = 0;

  const root = {
    innerHTML: "",
    querySelector() { return null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    setAttribute() {},
  };

  const app = {
    character: Object.freeze({ equipment: [] }),
    session: Object.freeze({ id: "session-1" }),
    mode: "creation",
    interactions: Object.freeze({}),
    modeSync: Object.freeze({ sync() { modeSyncCalls += 1; } }),
    ui: Object.freeze({ getState: () => Object.freeze({ busy: false }) }),
    persistence: Object.freeze({}),
    commands: Object.freeze({ updateEquipment: () => Object.freeze({ status: "no-op" }) }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    attackEdit: Object.freeze({ destroy() { previousDestroyCalls += 1; } }),
    render() {},
  };

  const mounted = mountCharacterMobileEquipmentEditApp(app, { root });

  assert.equal(listeners.has("click"), true);
  assert.equal(modeSyncCalls, 1);
  assert.equal(mounted.character, app.character);

  mounted.equipmentEdit.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(previousDestroyCalls, 0);
});
