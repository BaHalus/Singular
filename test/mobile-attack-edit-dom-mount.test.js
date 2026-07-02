import test from "node:test";
import assert from "node:assert/strict";

import {
  mountCharacterMobileAttackEditApp,
} from "../src/ui/mobile/CharacterMobileAttackEditApp.js";

test("attack edit mounts through explicit DOM nodes without observers or string fallback", () => {
  const root = createAttackRoot({ exposeAttackItem: true });
  const app = createAttackApp(root, { mode: "creation" });

  const mounted = mountCharacterMobileAttackEditApp(app, {
    root,
    MutationObserver() {
      throw new Error("attack edit must not use MutationObserver reinjection");
    },
  });

  assert.equal(root.attackItem.appendedHtml.length, 1);
  assert.match(root.attackItem.appendedHtml[0], /data-role="attack-inline-editor"/);
  assert.match(root.attackItem.appendedHtml[0], /data-action="attack-update"/);

  mounted.attackEdit.destroy();
});

test("attack edit remounts editors after core attack rerenders", async () => {
  const root = createAttackRoot({ exposeAttackItem: true });
  const app = createAttackApp(root, { mode: "creation" });
  const deferred = createDeferredCallbacks();
  const mounted = mountCharacterMobileAttackEditApp(app, {
    root,
    deferAttackControlInjection: deferred.defer,
  });

  root.addEventListener("click", event => {
    if (event?.target?.dataset?.action !== "attack-add") return;
    app.render();
  });

  assert.equal(root.attackItem.appendedHtml.length, 1);

  await root.dispatch("click", { target: { dataset: { action: "attack-add" } } });
  assert.equal(app.renderCount, 1);
  assert.equal(root.attackItem.appendedHtml.length, 0);

  deferred.flush();

  assert.equal(root.attackItem.appendedHtml.length, 1);
  assert.match(root.attackItem.appendedHtml[0], /data-action="attack-update"/);

  mounted.attackEdit.destroy();
});

test("attack edit default scheduling remounts after later core listeners replace html", async () => {
  const root = createAttackRoot({ exposeAttackItem: true });
  const app = createAttackApp(root, { mode: "creation" });
  const mounted = mountCharacterMobileAttackEditApp(app, { root });

  root.addEventListener("click", event => {
    if (event?.target?.dataset?.action !== "attack-add") return;
    app.render();
  });

  assert.equal(root.attackItem.appendedHtml.length, 1);

  await root.dispatch("click", { target: { dataset: { action: "attack-add" } } });
  assert.equal(app.renderCount, 1);
  assert.equal(root.attackItem.appendedHtml.length, 0);

  await drainMicrotasks();

  assert.equal(root.attackItem.appendedHtml.length, 1);
  assert.match(root.attackItem.appendedHtml[0], /data-action="attack-update"/);

  mounted.attackEdit.destroy();
});

test("attack edit update preserves creation editing and table mode blocking", async () => {
  const root = createAttackRoot({ exposeAttackItem: true });
  const app = createAttackApp(root, { mode: "creation" });
  const mounted = mountCharacterMobileAttackEditApp(app, { root });

  await root.dispatch("click", {
    target: { dataset: { action: "attack-update", attackId: "attack-1" } },
    preventDefault() {
      root.prevented = true;
    },
  });

  assert.equal(root.prevented, true);
  assert.equal(root.attributes.get("data-last-command-status"), "applied");
  assert.equal(app.renderCount, 1);
  assert.deepEqual(app.lastPatch, {
    attackId: "attack-1",
    patch: {
      name: "Espada revisada",
      category: "melee",
      skillId: "broadsword",
      damage: { value: "1d+2", type: "cut" },
      reach: "1",
      range: null,
      notes: "Ataque editado",
    },
  });

  app.mode = "table";
  await root.dispatch("click", {
    target: { dataset: { action: "attack-update", attackId: "attack-1" } },
  });

  assert.equal(root.attributes.get("data-last-command-status"), "blocked-by-mode");
  assert.equal(app.renderCount, 1);

  mounted.attackEdit.destroy();
});

test("attack edit does not rewrite root html when the explicit attack mount point is absent", () => {
  const root = createAttackRoot({ exposeAttackItem: false });
  const app = createAttackApp(root, { mode: "creation" });

  const mounted = mountCharacterMobileAttackEditApp(app, { root });

  assert.equal(root.innerHTML, renderBaseAttackSheet());

  mounted.attackEdit.destroy();
});

function createAttackApp(root, { mode }) {
  const app = {
    get character() {
      return app.session.character;
    },
    get html() {
      return root.innerHTML;
    },
    mode,
    session: Object.freeze({
      id: "session-1",
      character: Object.freeze({
        attacks: [Object.freeze({
          id: "attack-1",
          name: "Espada",
          category: "melee",
          skillId: "sword",
          damage: Object.freeze({ value: "1d", type: "cut" }),
          reach: "1",
          range: null,
          notes: "Original",
        })],
      }),
    }),
    interactions: Object.freeze({}),
    modeSync: Object.freeze({
      sync() {
        root.syncCount += 1;
      },
    }),
    ui: Object.freeze({
      getState() {
        return Object.freeze({ busy: false });
      },
    }),
    persistence: Object.freeze({
      getActiveSession() {
        return app.session;
      },
    }),
    commands: Object.freeze({
      updateAttack(input) {
        app.lastPatch = input;
        return Object.freeze({ status: "applied" });
      },
    }),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    renderCount: 0,
    lastPatch: null,
    render() {
      app.renderCount += 1;
      root.innerHTML = renderBaseAttackSheet();
    },
  };
  return app;
}

function createAttackRoot({ exposeAttackItem }) {
  const listeners = new Map();
  const attributes = new Map();
  const attackItem = createAttackItem();
  const inputs = new Map([
    ['[data-role="attack-edit-name-attack-1"]', "Espada revisada"],
    ['[data-role="attack-edit-category-attack-1"]', "melee"],
    ['[data-role="attack-edit-skill-id-attack-1"]', "broadsword"],
    ['[data-role="attack-edit-damage-value-attack-1"]', "1d+2"],
    ['[data-role="attack-edit-damage-type-attack-1"]', "cut"],
    ['[data-role="attack-edit-reach-attack-1"]', "1"],
    ['[data-role="attack-edit-range-attack-1"]', ""],
    ['[data-role="attack-edit-notes-attack-1"]', "Ataque editado"],
  ]);
  let innerHTML = renderBaseAttackSheet();

  return {
    get innerHTML() {
      return innerHTML;
    },
    set innerHTML(value) {
      innerHTML = String(value);
      attackItem.appendedHtml = [];
    },
    attributes,
    attackItem,
    syncCount: 0,
    prevented: false,
    ownerDocument: createDocument(),
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
    querySelector(selector) {
      if (selector === '[data-attack-id="attack-1"]') return exposeAttackItem ? attackItem : null;
      if (inputs.has(selector)) return { value: inputs.get(selector) };
      return null;
    },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
}

function createAttackItem() {
  return {
    appendedHtml: [],
    ownerDocument: createDocument(),
    querySelector(selector) {
      if (selector === '[data-role="attack-inline-editor"][data-attack-id="attack-1"]') {
        return this.appendedHtml.length > 0 ? {} : null;
      }
      return null;
    },
    append(...nodes) {
      this.appendedHtml.push(...nodes.map(String));
    },
  };
}

function createDocument() {
  return {
    createElement(tagName) {
      assert.equal(tagName, "template");
      return {
        content: { childNodes: [] },
        set innerHTML(value) {
          this.content.childNodes = [value];
        },
      };
    },
  };
}

function createDeferredCallbacks() {
  const callbacks = new Set();
  return {
    defer(callback) {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    flush() {
      for (const callback of Array.from(callbacks)) {
        callbacks.delete(callback);
        callback();
      }
    },
  };
}

async function drainMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

function renderBaseAttackSheet() {
  return [
    '<section class="singular-mobile-sheet__card" data-card="attacks">',
    "<h2>Ataques</h2>",
    '<dl><div data-attack-id="attack-1"><dt>Corpo a corpo</dt><dd>Espada</dd></div></dl>',
    "</section>",
  ].join("");
}
