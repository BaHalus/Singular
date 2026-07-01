import test from "node:test";
import assert from "node:assert/strict";

import {
  CHARACTER_MOBILE_COMPOSITION_MODULES,
  bootstrapCharacterMobileCompositionRoot,
  mountCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";

test("mobile composition root declares the canonical independent module order", () => {
  assert.deepEqual(
    CHARACTER_MOBILE_COMPOSITION_MODULES.map(({ name }) => name),
    [
      "language-culture",
      "secondary-notes",
      "trait-edit",
      "skill-technique-edit",
      "language-culture-edit",
      "attack-edit",
      "equipment-edit",
      "spell-edit",
      "power-edit",
    ],
  );

  for (const module of CHARACTER_MOBILE_COMPOSITION_MODULES) {
    assert.equal(typeof module.mount, "function", `${module.name} deve expor mount independente`);
    assert.equal(typeof module.destroyKey, "string", `${module.name} deve declarar destroyKey`);
    assert.equal("bootstrap" in module, false, `${module.name} não deve expor bootstrap no caminho canônico`);
  }
});

test("mobile composition root exposes a single executable bootstrap and explicit mount root", () => {
  assert.equal(typeof bootstrapCharacterMobileCompositionRoot, "function");
  assert.equal(typeof mountCharacterMobileCompositionRoot, "function");
});

test("mobile composition root destroys feature modules in reverse order before app handles", () => {
  const calls = [];
  const app = Object.freeze({
    character: { name: "Test" },
    session: { id: "session" },
    html: { root: {} },
    mode: "creation",
    interactions: Object.freeze({ destroy: () => calls.push("interactions") }),
    modeSync: Object.freeze({ destroy: () => calls.push("modeSync") }),
    ui: Object.freeze({}),
    persistence: Object.freeze({}),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    render: () => calls.push("render"),
  });

  const modules = [
    Object.freeze({
      name: "first",
      destroyKey: "firstHandle",
      mount: mounted => Object.freeze({
        ...mounted,
        firstHandle: Object.freeze({ destroy: () => calls.push("first") }),
      }),
    }),
    Object.freeze({
      name: "second",
      destroyKey: "secondHandle",
      mount: mounted => Object.freeze({
        ...mounted,
        secondHandle: Object.freeze({ destroy: () => calls.push("second") }),
      }),
    }),
  ];

  const composition = mountCharacterMobileCompositionRoot(app, {}, modules);

  composition.compositionRoot.destroy();
  composition.compositionRoot.destroy();

  assert.deepEqual(calls, ["second", "first", "interactions", "modeSync"]);
});

test("mobile composition root preserves live app surface and fails on invalid module handles", () => {
  let currentCharacter = { name: "Original" };
  const app = Object.freeze({
    get character() {
      return currentCharacter;
    },
    session: { id: "session" },
    html: { root: {} },
    mode: "creation",
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ destroy() {} }),
    ui: Object.freeze({}),
    persistence: Object.freeze({}),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    render() {},
  });

  const composition = mountCharacterMobileCompositionRoot(app, {}, [
    Object.freeze({
      name: "valid",
      destroyKey: "validHandle",
      mount: mounted => Object.freeze({
        ...mounted,
        validHandle: Object.freeze({ destroy() {} }),
      }),
    }),
  ]);

  assert.equal(composition.character.name, "Original");
  currentCharacter = { name: "Updated" };
  assert.equal(composition.character.name, "Updated");

  assert.throws(
    () => mountCharacterMobileCompositionRoot(app, {}, [
      Object.freeze({
        name: "invalid",
        destroyKey: "invalidHandle",
        mount: mounted => Object.freeze({
          ...mounted,
          invalidHandle: Object.freeze({}),
        }),
      }),
    ]),
    /Mobile composition module invalid did not expose invalidHandle\.destroy/,
  );
});

test("mobile composition root exposes the final composed render handle", () => {
  let rendered = false;
  const app = Object.freeze({
    character: { name: "Base" },
    session: { id: "session" },
    html: "base-html",
    mode: "creation",
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ destroy() {} }),
    ui: Object.freeze({}),
    persistence: Object.freeze({}),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
  });

  const composition = mountCharacterMobileCompositionRoot(app, {}, [
    Object.freeze({
      name: "render-provider",
      destroyKey: "renderProvider",
      mount: mounted => Object.freeze({
        ...mounted,
        html: "composed-html",
        render() {
          rendered = true;
        },
        renderProvider: Object.freeze({ destroy() {} }),
      }),
    }),
  ]);

  assert.equal(composition.html, "composed-html");
  assert.equal(typeof composition.render, "function");
  composition.render();
  assert.equal(rendered, true);
});
