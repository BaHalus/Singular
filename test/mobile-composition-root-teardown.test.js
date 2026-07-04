import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileCompositionRoot } from "../src/ui/mobile/CharacterMobileCompositionRoot.js";

function createApp(calls) {
  return Object.freeze({
    character: Object.freeze({ name: "Teardown" }),
    session: Object.freeze({ id: "session-teardown" }),
    html: "",
    mode: "creation",
    interactions: Object.freeze({ destroy: () => calls.push("interactions") }),
    modeSync: Object.freeze({ destroy: () => calls.push("modeSync") }),
    ui: Object.freeze({ destroy: () => calls.push("ui") }),
    persistence: Object.freeze({}),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle: Object.freeze({
      register() { return () => calls.push("unregister-composed-render"); },
      run() {},
      destroy: () => calls.push("postRenderLifecycle"),
    }),
    render() {},
  });
}

test("composition teardown destroys persistence UI and all app handles exactly once", () => {
  const calls = [];
  const composition = mountCharacterMobileCompositionRoot(createApp(calls), {}, [
    Object.freeze({
      name: "feature",
      destroyKey: "feature",
      mount: mounted => Object.freeze({
        ...mounted,
        feature: Object.freeze({ destroy: () => calls.push("feature") }),
      }),
    }),
  ]);

  composition.compositionRoot.destroy();
  composition.compositionRoot.destroy();

  assert.deepEqual(calls, [
    "unregister-composed-render",
    "feature",
    "interactions",
    "modeSync",
    "ui",
    "postRenderLifecycle",
  ]);
});

test("feature destroy remains local and does not destroy the composition", () => {
  const calls = [];
  const composition = mountCharacterMobileCompositionRoot(createApp(calls), {}, [
    Object.freeze({
      name: "power-edit",
      destroyKey: "powerEdit",
      mount: mounted => Object.freeze({
        ...mounted,
        powerEdit: Object.freeze({ destroy: () => calls.push("powerEdit") }),
      }),
    }),
  ]);

  composition.powerEdit.destroy();
  assert.deepEqual(calls, ["powerEdit"]);

  composition.compositionRoot.destroy();
  assert.deepEqual(calls, [
    "powerEdit",
    "unregister-composed-render",
    "powerEdit",
    "interactions",
    "modeSync",
    "ui",
    "postRenderLifecycle",
  ]);
});
