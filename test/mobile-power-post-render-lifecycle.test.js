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
  mountCharacterMobilePowerEditApp,
} from "../src/ui/mobile/CharacterMobilePowerEditApp.js";

test("A5 power controls remount through canonical post-render lifecycle without duplication", () => {
  const powers = [Object.freeze({
    id: "divine-favor",
    name: "Divine Favor",
    source: "divine",
    powerModifier: Object.freeze({ name: "Pacto", valuePercent: -10, notes: "A5 regression" }),
    talentTraitId: null,
    memberTraitIds: [],
    tags: ["a5"],
    notes: "Operational A5 power surface",
  })];
  const root = createPowerRoot();
  const character = createCharacter({
    identity: { id: "character-1", name: "Test" },
    powers,
  });
  const session = createApplicationSession({ id: "session-1", character });
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
      render() { return renderPowerSheet(); },
      getState() { return Object.freeze({ busy: false }); },
    }),
    persistence: Object.freeze({ getActiveSession() { return session; } }),
    commands: Object.freeze({ renamePower() { return Object.freeze({ status: "no-op" }); } }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle,
    render(options = {}) {
      baseRenderCount += 1;
      root.innerHTML = renderPowerSheet();
      if (!options.skipPostRenderLifecycle) {
        postRenderLifecycle.run({ root, character: session.character, session, mode });
      }
      return root.innerHTML;
    },
  });

  const mounted = mountCharacterMobileCompositionRoot(app, { root }, [
    Object.freeze({
      name: "power-edit",
      destroyKey: "powerEdit",
      mount: mountCharacterMobilePowerEditApp,
    }),
  ]);

  assert.equal(countPowerEditors(root.innerHTML), 1);

  mounted.render();
  mounted.render();

  assert.equal(baseRenderCount, 4);
  assert.equal(countPowerEditors(root.innerHTML), 1);
  assert.match(root.innerHTML, /data-action="power-update"/);

  mode = "table";
  mounted.render();

  assert.equal(countPowerEditors(root.innerHTML), 0);

  mode = "creation";
  mounted.render();

  assert.equal(countPowerEditors(root.innerHTML), 1);
  assert.ok(modeSyncCount >= 4);

  mounted.compositionRoot.destroy();
  postRenderLifecycle.run({ root, character, session, mode: "creation" });

  assert.equal(countPowerEditors(root.innerHTML), 1);
});

function renderPowerSheet() {
  return [
    '<section class="singular-mobile-sheet__card" data-card="powers">',
    "<h2>Poderes</h2>",
    '<dl class="singular-mobile-sheet__power-list">',
    '<div data-power-id="divine-favor"><dt>Poder</dt><dd>Divine Favor</dd></div>',
    "</dl>",
    "</section>",
  ].join("");
}

function countPowerEditors(html) {
  return (html.match(/data-role="power-inline-editor"/g) ?? []).length;
}

function createPowerRoot() {
  const listeners = new Map();
  const attributes = new Map();
  const root = {
    innerHTML: renderPowerSheet(),
    ownerDocument: null,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector(selector) {
      if (selector === '[data-power-id="divine-favor"]') return createPowerItemNode(root);
      return null;
    },
  };
  root.ownerDocument = {
    createElement(tagName) {
      assert.equal(tagName, "template");
      return createTemplateElement();
    },
  };
  return root;
}

function createPowerItemNode(root) {
  return {
    ownerDocument: root.ownerDocument,
    querySelector(selector) {
      if (selector === "dd") return createDefinitionNode(root);
      if (selector.includes('data-role="power-inline-editor"')) {
        return root.innerHTML.includes('data-role="power-inline-editor"') ? Object.freeze({}) : null;
      }
      return null;
    },
  };
}

function createDefinitionNode(root) {
  return {
    append(...nodes) {
      const markerIndex = root.innerHTML.indexOf('data-power-id="divine-favor"');
      const ddEnd = root.innerHTML.indexOf("</dd>", markerIndex);
      assert.notEqual(ddEnd, -1);
      root.innerHTML = `${root.innerHTML.slice(0, ddEnd)}${nodes.map(String).join("")}${root.innerHTML.slice(ddEnd)}`;
    },
  };
}

function createTemplateElement() {
  return {
    content: { childNodes: [] },
    set innerHTML(value) { this.content.childNodes = [value]; },
  };
}
