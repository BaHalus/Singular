import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../src/domain/character/Character.js";
import { createApplicationSession } from "../src/application/session/ApplicationSession.js";
import {
  mountCharacterMobileTraitEditApp,
} from "../src/ui/mobile/CharacterMobileTraitEditApp.js";

test("trait edit mount does not own persistence actions", async () => {
  const root = createRoot();
  const character = createCharacter({
    identity: { id: "character-1", name: "Test" },
  });
  const session = createApplicationSession({
    id: "session-1",
    character,
  });
  let saveCalls = 0;
  let renderCalls = 0;

  mountCharacterMobileTraitEditApp({
    get character() {
      return character;
    },
    get session() {
      return session;
    },
    get html() {
      return root.innerHTML;
    },
    get mode() {
      return "creation";
    },
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() {} }),
    ui: Object.freeze({
      render() {
        renderCalls += 1;
        root.innerHTML = '<section data-card="traits"><h2>Traços</h2><p>Base</p></section>';
        return root.innerHTML;
      },
      getState() {
        return { busy: false };
      },
      async save() {
        saveCalls += 1;
        return { status: "saved" };
      },
    }),
    persistence: Object.freeze({
      getActiveSession() {
        return session;
      },
    }),
    commands: Object.freeze({
      updateTrait() {
        return { status: "applied" };
      },
    }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
  }, { root, MutationObserver: null });

  assert.equal(renderCalls, 0);
  await root.dispatch("click", { target: { dataset: { action: "save" } } });

  assert.equal(saveCalls, 0);
  assert.equal(renderCalls, 0);
  assert.equal(root.getAttribute("data-last-persistence-status"), null);
});

function createRoot() {
  const listeners = new Map();
  const attributes = new Map();
  const section = createSection();

  return {
    innerHTML: '<section data-card="traits"><h2>Traços</h2><p>Base</p></section>',
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
    querySelector(selector) {
      return selector === '[data-card="traits"]' ? section : null;
    },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
}

function createSection() {
  const header = { nextSibling: createSibling() };
  const section = {
    ownerDocument: createDocument(),
    querySelector(selector) {
      return selector === "h2" ? header : null;
    },
    append(...nodes) {
      this.appendedNodes = nodes;
    },
  };
  return section;
}

function createSibling() {
  return {
    remove() {},
  };
}

function createDocument() {
  return {
    createElement(tagName) {
      if (tagName !== "template") return null;
      return {
        content: { childNodes: [{}] },
        set innerHTML(value) {
          this.rendered = value;
        },
      };
    },
  };
}
