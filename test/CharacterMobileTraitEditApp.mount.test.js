import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../src/domain/character/Character.js";
import { mountCharacterMobileTraitEditApp } from "../src/ui/mobile/CharacterMobileTraitEditApp.js";

test("trait edit mount detaches only its own listener without observer", () => {
  const listeners = new Map();
  let observerConstructCalls = 0;
  let disconnectCalls = 0;
  let observeCalls = 0;
  let previousDestroyCalls = 0;
  let modeSyncCalls = 0;
  let renderCalls = 0;

  const root = createTraitRoot(listeners);

  const MutationObserver = function MutationObserver() {
    observerConstructCalls += 1;
    return {
      observe() { observeCalls += 1; },
      disconnect() { disconnectCalls += 1; },
    };
  };

  const character = createCharacter({
    identity: Object.freeze({
      id: "character-1",
      name: "Personagem de teste",
      concept: "Regressão S4 Traços",
      playerId: null,
      campaignId: null,
    }),
  });
  const session = Object.freeze({ id: "session-1", character });
  const app = {
    character,
    session,
    mode: "creation",
    interactions: Object.freeze({}),
    modeSync: Object.freeze({ sync() { modeSyncCalls += 1; } }),
    ui: Object.freeze({
      getState: () => Object.freeze({ busy: false }),
      render: () => {
        renderCalls += 1;
        return renderBaseTraitSection();
      },
    }),
    persistence: Object.freeze({ getActiveSession: () => session }),
    commands: Object.freeze({ updateTrait: () => Object.freeze({ status: "no-op" }) }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    secondaryNotes: Object.freeze({ destroy() { previousDestroyCalls += 1; } }),
  };

  const mounted = mountCharacterMobileTraitEditApp(app, { root, MutationObserver });

  assert.equal(listeners.has("click"), true);
  assert.equal(observerConstructCalls, 0);
  assert.equal(observeCalls, 0);
  assert.equal(modeSyncCalls, 1);
  assert.equal(renderCalls, 0);
  assert.equal(mounted.character, app.character);
  assert.equal(mounted.session, app.session);
  assert.match(mounted.html, /data-role="trait-editor"/);

  mounted.traitEdit.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(disconnectCalls, 0);
  assert.equal(previousDestroyCalls, 0);
});

function renderBaseTraitSection() {
  return [
    "<main data-singular-mobile-root>",
    '<section class="singular-mobile-sheet__card" data-card="traits">',
    "<h2>Traços</h2>",
    "</section>",
    "</main>",
  ].join("");
}

function createTraitRoot(listeners) {
  const root = {
    innerHTML: renderBaseTraitSection(),
    ownerDocument: null,
    querySelector(selector) {
      if (selector !== '[data-card="traits"]') return null;
      return createTraitSection(root);
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    setAttribute() {},
  };
  root.ownerDocument = {
    createElement(tagName) {
      assert.equal(tagName, "template");
      return createTemplateElement();
    },
  };
  return root;
}

function createTraitSection(root) {
  return {
    ownerDocument: root.ownerDocument,
    querySelector(selector) {
      if (selector !== "h2") return null;
      return createHeaderNode(root);
    },
    append(...nodes) {
      const sectionEnd = root.innerHTML.indexOf("</section>");
      assert.notEqual(sectionEnd, -1);
      root.innerHTML = `${root.innerHTML.slice(0, sectionEnd)}${nodes.map(String).join("")}${root.innerHTML.slice(sectionEnd)}`;
    },
  };
}

function createHeaderNode(root) {
  return {
    get nextSibling() {
      const headerEnd = root.innerHTML.indexOf("</h2>") + "</h2>".length;
      const sectionEnd = root.innerHTML.indexOf("</section>");
      if (headerEnd < "</h2>".length || headerEnd >= sectionEnd) return null;
      return {
        remove() {
          root.innerHTML = `${root.innerHTML.slice(0, headerEnd)}${root.innerHTML.slice(sectionEnd)}`;
        },
      };
    },
  };
}

function createTemplateElement() {
  return {
    content: { childNodes: [] },
    set innerHTML(value) { this.content.childNodes = [value]; },
  };
}
