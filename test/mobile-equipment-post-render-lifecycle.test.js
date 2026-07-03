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
  mountCharacterMobileEquipmentEditApp,
} from "../src/ui/mobile/CharacterMobileEquipmentEditApp.js";

test("A3 equipment controls remount through canonical post-render lifecycle without duplication", () => {
  const equipment = [Object.freeze({
    id: "rope",
    name: "Corda",
    quantity: 1,
    state: "carried",
    weightKg: 2.5,
    cost: 10,
    notes: "15 m",
  })];
  const root = createEquipmentRoot();
  const character = createCharacter({
    identity: { id: "character-1", name: "Test" },
    equipment,
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
      render() { return renderEquipmentSheet(); },
      getState() { return Object.freeze({ busy: false }); },
    }),
    persistence: Object.freeze({ getActiveSession() { return session; } }),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle,
    render(options = {}) {
      baseRenderCount += 1;
      root.innerHTML = renderEquipmentSheet();
      if (!options.skipPostRenderLifecycle) {
        postRenderLifecycle.run({ root, character: session.character, session, mode });
      }
      return root.innerHTML;
    },
  });

  const mounted = mountCharacterMobileCompositionRoot(app, { root }, [
    Object.freeze({
      name: "equipment-edit",
      destroyKey: "equipmentEdit",
      mount: mountCharacterMobileEquipmentEditApp,
    }),
  ]);

  assert.equal(countEquipmentEditors(root.innerHTML), 1);

  mounted.render();
  mounted.render();

  assert.equal(baseRenderCount, 2);
  assert.equal(countEquipmentEditors(root.innerHTML), 1);
  assert.match(root.innerHTML, /data-action="equipment-update"/);

  mode = "table";
  mounted.render();

  assert.equal(countEquipmentEditors(root.innerHTML), 0);

  mode = "creation";
  mounted.render();

  assert.equal(countEquipmentEditors(root.innerHTML), 1);
  assert.ok(modeSyncCount >= 4);

  mounted.compositionRoot.destroy();
  postRenderLifecycle.run({ root, character, session, mode: "creation" });

  assert.equal(countEquipmentEditors(root.innerHTML), 1);
});

function renderEquipmentSheet() {
  return [
    '<section class="singular-mobile-sheet__card" data-card="equipment">',
    "<h2>Equipamentos</h2>",
    '<dl class="singular-mobile-sheet__equipment-list">',
    '<div data-equipment-id="rope"><dt>Item</dt><dd>Corda</dd></div>',
    "</dl>",
    "</section>",
  ].join("");
}

function countEquipmentEditors(html) {
  return (html.match(/data-role="equipment-inline-editor"/g) ?? []).length;
}

function createEquipmentRoot() {
  const listeners = new Map();
  const attributes = new Map();
  const root = {
    innerHTML: renderEquipmentSheet(),
    ownerDocument: null,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector(selector) {
      if (selector === '[data-equipment-id="rope"]') return createEquipmentItemNode(root);
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

function createEquipmentItemNode(root) {
  return {
    ownerDocument: root.ownerDocument,
    querySelector(selector) {
      if (selector === "dd") return createDefinitionNode(root);
      if (selector.includes('data-role="equipment-inline-editor"')) {
        return root.innerHTML.includes('data-role="equipment-inline-editor"') ? Object.freeze({}) : null;
      }
      return null;
    },
  };
}

function createDefinitionNode(root) {
  return {
    append(...nodes) {
      const markerIndex = root.innerHTML.indexOf('data-equipment-id="rope"');
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
