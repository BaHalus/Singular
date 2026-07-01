import test from "node:test";
import assert from "node:assert/strict";

import {
  mountCharacterMobileTraitEditApp,
} from "../src/ui/mobile/CharacterMobileTraitEditApp.js";

test("trait editor ignores persistence actions so canonical persistence owns save and render", async () => {
  const root = createRoot();
  let traitRenderCount = 0;
  let canonicalPersistenceRenderCount = 0;
  let persistenceSaveCount = 0;

  const app = Object.freeze({
    character: createCharacter(),
    session: Object.freeze({ id: "session-1" }),
    get html() {
      return root.innerHTML;
    },
    mode: "creation",
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() {} }),
    ui: Object.freeze({
      getState() {
        return Object.freeze({ busy: false });
      },
      render() {
        traitRenderCount += 1;
        return renderBaseSheet();
      },
    }),
    persistence: Object.freeze({
      getActiveSession() {
        return Object.freeze({ id: "session-1", character: createCharacter() });
      },
      saveActiveSession() {
        persistenceSaveCount += 1;
        return Object.freeze({ status: "saved" });
      },
    }),
    commands: Object.freeze({
      updateTrait() {
        throw new Error("trait command must not handle persistence actions");
      },
    }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
  });

  const mounted = mountCharacterMobileTraitEditApp(app, {});
  const renderCountAfterMount = traitRenderCount;

  root.addEventListener("click", event => {
    if (event?.target?.dataset?.action !== "persistence-save") return;
    app.persistence.saveActiveSession();
    canonicalPersistenceRenderCount += 1;
  });

  await root.dispatch("click", { target: { dataset: { action: "persistence-save" } } });

  assert.equal(persistenceSaveCount, 1);
  assert.equal(canonicalPersistenceRenderCount, 1);
  assert.equal(traitRenderCount, renderCountAfterMount);

  mounted.traitEdit.destroy();
});

function createCharacter() {
  return Object.freeze({
    identity: Object.freeze({ id: "character-1", name: "Test" }),
    traits: Object.freeze([]),
  });
}

function renderBaseSheet() {
  return [
    '<section class="singular-mobile-sheet__card" data-card="traits">',
    "<h2>Traços</h2>",
    '<p class="singular-mobile-sheet__empty">Base sem editor.</p>',
    "</section>",
  ].join("");
}

function createRoot() {
  const listeners = new Map();
  const attributes = new Map();

  return {
    innerHTML: "",
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    querySelector() {
      return null;
    },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
}
