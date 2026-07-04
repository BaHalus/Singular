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
  mountCharacterMobileSpellEditApp,
} from "../src/ui/mobile/CharacterMobileSpellEditApp.js";

test("A4 spell controls remount through canonical post-render lifecycle without duplication", () => {
  const spells = [Object.freeze({
    id: "ignite",
    name: "Ignite Fire",
    spellType: "standard",
    attribute: "IQ",
    difficulty: "H",
    points: 1,
    spellClass: "Regular",
    resistance: "",
    castingCost: "1",
    maintenanceCost: "0",
    castingTime: "1 s",
    duration: "1 min",
    notes: "Operational A4 spell surface",
  })];
  const root = createSpellRoot();
  const character = createCharacter({
    identity: { id: "character-1", name: "Test" },
    spells,
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
      render() { return renderSpellSheet(); },
      getState() { return Object.freeze({ busy: false }); },
    }),
    persistence: Object.freeze({ getActiveSession() { return session; } }),
    commands: Object.freeze({ updateSpell() { return Object.freeze({ status: "no-op" }); } }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle,
    render(options = {}) {
      baseRenderCount += 1;
      root.innerHTML = renderSpellSheet();
      if (!options.skipPostRenderLifecycle) {
        postRenderLifecycle.run({ root, character: session.character, session, mode });
      }
      return root.innerHTML;
    },
  });

  const mounted = mountCharacterMobileCompositionRoot(app, { root }, [
    Object.freeze({
      name: "spell-edit",
      destroyKey: "spellEdit",
      mount: mountCharacterMobileSpellEditApp,
    }),
  ]);

  assert.equal(countSpellEditors(root.innerHTML), 1);

  mounted.render();
  mounted.render();

  assert.equal(baseRenderCount, 4);
  assert.equal(countSpellEditors(root.innerHTML), 1);
  assert.match(root.innerHTML, /data-action="spell-update"/);

  mode = "table";
  mounted.render();

  assert.equal(countSpellEditors(root.innerHTML), 0);

  mode = "creation";
  mounted.render();

  assert.equal(countSpellEditors(root.innerHTML), 1);
  assert.ok(modeSyncCount >= 4);

  mounted.compositionRoot.destroy();
  postRenderLifecycle.run({ root, character, session, mode: "creation" });

  assert.equal(countSpellEditors(root.innerHTML), 1);
});

function renderSpellSheet() {
  return [
    '<section class="singular-mobile-sheet__card" data-card="spells">',
    "<h2>Magias</h2>",
    '<dl class="singular-mobile-sheet__spell-list">',
    '<div data-spell-id="ignite"><dt>Magia</dt><dd>Ignite Fire</dd></div>',
    "</dl>",
    "</section>",
  ].join("");
}

function countSpellEditors(html) {
  return (html.match(/data-role="spell-inline-editor"/g) ?? []).length;
}

function createSpellRoot() {
  const listeners = new Map();
  const attributes = new Map();
  const root = {
    innerHTML: renderSpellSheet(),
    ownerDocument: null,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector(selector) {
      if (selector === '[data-spell-id="ignite"]') return createSpellItemNode(root);
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

function createSpellItemNode(root) {
  return {
    ownerDocument: root.ownerDocument,
    querySelector(selector) {
      if (selector === "dd") return createDefinitionNode(root);
      if (selector.includes('data-role="spell-inline-editor"')) {
        return root.innerHTML.includes('data-role="spell-inline-editor"') ? Object.freeze({}) : null;
      }
      return null;
    },
  };
}

function createDefinitionNode(root) {
  return {
    append(...nodes) {
      const markerIndex = root.innerHTML.indexOf('data-spell-id="ignite"');
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
