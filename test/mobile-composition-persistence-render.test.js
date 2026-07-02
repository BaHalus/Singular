import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../src/domain/character/Character.js";
import { createApplicationSession } from "../src/application/session/ApplicationSession.js";
import {
  mountCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "../src/ui/mobile/CharacterMobilePostRenderLifecycle.js";
import {
  mountCharacterMobileTraitEditApp,
} from "../src/ui/mobile/CharacterMobileTraitEditApp.js";

test("composition root restores composed trait controls through canonical post-render lifecycle", async () => {
  const root = createRoot();
  const character = createCharacter({ identity: { id: "character-1", name: "Test" } });
  const session = createApplicationSession({ id: "session-1", character });
  const postRenderLifecycle = createCharacterMobilePostRenderLifecycle();
  let basePersistenceRenderCount = 0;

  const app = Object.freeze({
    get character() { return character; },
    get session() { return session; },
    get html() { return root.innerHTML; },
    get mode() { return "creation"; },
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() {}, destroy() {} }),
    ui: Object.freeze({
      render() { return renderBaseSheet(); },
      getState() { return Object.freeze({ busy: false }); },
    }),
    persistence: Object.freeze({ getActiveSession() { return session; } }),
    commands: Object.freeze({ updateTrait() { return null; } }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle,
    render() {
      basePersistenceRenderCount += 1;
      root.innerHTML = renderBaseSheet();
      postRenderLifecycle.run({ root, character: session.character, session, mode: "creation" });
    },
  });

  root.addEventListener("click", event => {
    if (event?.target?.dataset?.action === "persistence-save") app.render();
  });

  const mounted = mountCharacterMobileCompositionRoot(app, { root, MutationObserver: null }, [
    Object.freeze({
      name: "trait-edit",
      destroyKey: "traitEdit",
      mount: mountCharacterMobileTraitEditApp,
    }),
  ]);

  assert.match(root.innerHTML, /data-role="trait-editor"/);
  await root.dispatch("click", { target: { dataset: { action: "persistence-save" } } });
  assert.equal(basePersistenceRenderCount, 1);
  assert.match(root.innerHTML, /data-role="trait-editor"/);
  assert.match(root.innerHTML, /data-action="trait-add"/);

  mounted.compositionRoot.destroy();
});

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
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector() { return null; },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) await listener(event);
    },
  };
}
