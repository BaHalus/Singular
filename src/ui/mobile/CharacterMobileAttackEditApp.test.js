import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileAttackEditApp,
  mountCharacterMobileAttackEditApp,
} from "./CharacterMobileAttackEditApp.js";

const html = '<section data-card="attacks"><h2>Ataques</h2><dl><div data-attack-id="attack:sword"><dt>Ataque</dt><dd>Espada longa</dd></div></dl></section>';

function character() {
  return {
    attacks: [
      {
        id: "attack:sword",
        name: "Espada longa",
        category: "melee",
        skillId: "skill:broadsword",
        damage: {
          value: "1d+2",
          type: "cut",
        },
        reach: "1",
        range: null,
        notes: "usar com escudo",
      },
    ],
  };
}

function fullCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-attack-edit",
      name: "Aldric",
      concept: "Guarda de muralha",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: { ST: 12, DX: 11, IQ: 10, HT: 10 },
    ...character(),
    metadata: {
      createdAt: "2026-06-30T11:40:00.000Z",
      updatedAt: "2026-06-30T11:40:00.000Z",
      source: "test",
    },
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-30T11:41:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:attack-edit-mobile-${sequence}`;
      },
    },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  const inputValues = new Map();
  const root = {
    innerHTML: "",
    ownerDocument: createDocumentFixture(),
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter(entry => entry !== listener));
    },
    querySelector(selector) {
      const attackId = readAttackIdSelector(selector);
      if (attackId !== null && root.innerHTML.includes(`data-attack-id="${attackId}"`)) {
        return createAttackItemFixture(root, attackId);
      }
      return { value: inputValues.get(selector) ?? "" };
    },
    querySelectorAll() {
      return [];
    },
    setInput(selector, value) {
      inputValues.set(selector, value);
    },
    async dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        await listener(event);
      }
    },
  };
  return root;
}

function createDocumentFixture() {
  return {
    createElement(tagName) {
      if (tagName !== "template") return null;
      return {
        content: { childNodes: [] },
        set innerHTML(value) {
          this.content.childNodes = [String(value)];
        },
      };
    },
  };
}

function createAttackItemFixture(root, attackId) {
  return {
    ownerDocument: root.ownerDocument,
    querySelector(selector) {
      return selector.includes('data-role="attack-inline-editor"') && root.innerHTML.includes(`data-role="attack-inline-editor" data-attack-id="${attackId}"`)
        ? {}
        : null;
    },
    append(...nodes) {
      root.innerHTML = `${root.innerHTML}${nodes.join("")}`;
    },
  };
}

function readAttackIdSelector(selector) {
  const match = /^\[data-attack-id="(.+)"\]$/.exec(selector);
  return match === null ? null : match[1];
}

function click(action, dataset = {}) {
  return {
    target: { dataset: { action, ...dataset }, parentElement: null },
    preventDefault() {},
  };
}

function countAttackEditors(root) {
  return (root.innerHTML.match(/data-role="attack-inline-editor"/g) ?? []).length;
}

function postRenderLifecycleFixture() {
  const entries = [];
  return {
    register(enhancer) {
      const entry = { enhancer, active: true };
      entries.push(entry);
      return () => {
        if (!entry.active) return false;
        entry.active = false;
        const index = entries.indexOf(entry);
        if (index >= 0) entries.splice(index, 1);
        return index >= 0;
      };
    },
    run(context) {
      let executed = 0;
      for (const entry of [...entries]) {
        if (!entry.active || !entries.includes(entry)) continue;
        entry.enhancer(context);
        executed += 1;
      }
      return Object.freeze({ executed });
    },
    get size() {
      return entries.length;
    },
  };
}

function createMountedAttackApp({ mode = "creation", session = null, render = null } = {}) {
  const root = rootFixture();
  const activeSession = session ?? Object.freeze({
    id: "session-mobile-attack-remount",
    character: character(),
  });
  const postRenderLifecycle = postRenderLifecycleFixture();
  const syncCalls = [];
  const renderCalls = [];
  const app = Object.freeze({
    get character() { return activeSession.character; },
    session: activeSession,
    get html() { return root.innerHTML; },
    mode,
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync: () => syncCalls.push("sync") }),
    ui: Object.freeze({ getState: () => Object.freeze({ busy: false }) }),
    persistence: Object.freeze({ getActiveSession: () => activeSession }),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle,
    render(renderOptions = {}) {
      renderCalls.push(renderOptions);
      if (render !== null) {
        render(root, renderOptions);
      } else {
        root.innerHTML = html;
      }
    },
  });
  root.innerHTML = html;
  const mounted = mountCharacterMobileAttackEditApp(app, { root });
  return { root, mounted, syncCalls, renderCalls, activeSession, postRenderLifecycle };
}

test("mounts mobile attack inline editor through the post-render lifecycle in creation mode", () => {
  const { root } = createMountedAttackApp();

  assert.match(root.innerHTML, /data-role="attack-inline-editor"/);
  assert.match(root.innerHTML, /data-action="attack-update"/);
  assert.match(root.innerHTML, /data-role="attack-edit-name-attack:sword"/);
  assert.match(root.innerHTML, /data-role="attack-edit-damage-value-attack:sword"/);
  assert.match(root.innerHTML, /usar com escudo/);
});

test("renders attack notes as textareas for multiline DOM input", () => {
  const source = character();
  source.attacks[0].notes = `Linha 1
Linha 2 com & < > "aspas"`;
  const session = Object.freeze({ id: "session-mobile-attack-notes", character: source });
  const { root } = createMountedAttackApp({ session });

  assert.ok(root.innerHTML.includes(
    `<textarea data-role="attack-edit-notes-attack:sword" autocomplete="off">
Linha 1
Linha 2 com &amp; &lt; &gt; "aspas"</textarea>`,
  ));
  assert.doesNotMatch(root.innerHTML, /data-role="attack-edit-notes-attack:sword" value=/);
});

test("preserves leading blank lines in attack note textareas", () => {
  const source = character();
  source.attacks[0].notes = `
Linha inicial de ataque`;
  const session = Object.freeze({ id: "session-mobile-attack-leading-notes", character: source });
  const { root } = createMountedAttackApp({ session });

  assert.ok(root.innerHTML.includes(
    `<textarea data-role="attack-edit-notes-attack:sword" autocomplete="off">

Linha inicial de ataque</textarea>`,
  ));
});

test("edits existing mobile attacks through canonical update commands", async () => {
  const root = rootFixture();
  const mounted = await bootstrapCharacterMobileAttackEditApp({
    root,
    character: fullCharacter(),
    sessionId: "session-mobile-attack-edit",
    storage: createMemoryStorage(),
    namespace: "test.mobile.attack-edit",
    runtime: runtime(),
    mode: "creation",
  });

  assert.match(root.innerHTML, /data-action="attack-update"/);

  root.setInput('[data-role="attack-edit-name-attack:sword"]', "Arco defensivo");
  root.setInput('[data-role="attack-edit-category-attack:sword"]', "ranged");
  root.setInput('[data-role="attack-edit-skill-id-attack:sword"]', "skill:bow");
  root.setInput('[data-role="attack-edit-damage-value-attack:sword"]', "1d+1");
  root.setInput('[data-role="attack-edit-damage-type-attack:sword"]', "imp");
  root.setInput('[data-role="attack-edit-reach-attack:sword"]', "");
  root.setInput('[data-role="attack-edit-range-attack:sword"]', "100/200");
  root.setInput('[data-role="attack-edit-notes-attack:sword"]', "Manter distância.\nLinha 2");
  await root.dispatch("click", click("attack-update", { attackId: "attack:sword" }));

  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "attack.update");
  assert.equal(mounted.character.attacks[0].name, "Arco defensivo");
  assert.equal(mounted.character.attacks[0].category, "ranged");
  assert.equal(mounted.character.attacks[0].skillId, "skill:bow");
  assert.deepEqual(mounted.character.attacks[0].damage, { value: "1d+1", type: "imp", authority: "declared" });
  assert.equal(mounted.character.attacks[0].reach, null);
  assert.equal(mounted.character.attacks[0].range, "100/200");
  assert.equal(mounted.character.attacks[0].notes, "Manter distância.\nLinha 2");

  await root.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-mobile-attack-edit");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.attacks[0].name, "Arco defensivo");
  assert.equal(saved.character.attacks[0].category, "ranged");
  assert.equal(saved.character.attacks[0].skillId, "skill:bow");
  assert.deepEqual(saved.character.attacks[0].damage, { value: "1d+1", type: "imp", authority: "declared" });
  assert.equal(saved.character.attacks[0].reach, null);
  assert.equal(saved.character.attacks[0].range, "100/200");
  assert.equal(saved.character.attacks[0].notes, "Manter distância.\nLinha 2");
});

test("mounts attack editors with session fallback when persistence has no active session reader", () => {
  const root = rootFixture();
  const activeSession = Object.freeze({
    id: "session-mobile-attack-session-fallback",
    character: character(),
  });
  const app = Object.freeze({
    get character() { return activeSession.character; },
    session: activeSession,
    get html() { return root.innerHTML; },
    mode: "creation",
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() {} }),
    ui: Object.freeze({ getState: () => Object.freeze({ busy: false }) }),
    persistence: Object.freeze({}),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle: postRenderLifecycleFixture(),
    render() {
      root.innerHTML = html;
    },
  });

  root.innerHTML = html;
  mountCharacterMobileAttackEditApp(app, { root });

  assert.equal(countAttackEditors(root), 1);
});

test("remounts attack editors after delegated renders without duplicating controls", () => {
  const { root, mounted, renderCalls, syncCalls } = createMountedAttackApp();

  assert.equal(countAttackEditors(root), 1);
  mounted.render();
  assert.equal(countAttackEditors(root), 1);
  mounted.render();
  assert.equal(countAttackEditors(root), 1);
  assert.deepEqual(renderCalls, [
    { skipPostRenderLifecycle: true },
    { skipPostRenderLifecycle: true },
  ]);
  assert.equal(syncCalls.length, 3);
});

const rerenderSources = Object.freeze([
  ["attack", "attack-update"],
  ["trait", "trait-update"],
  ["skill/technique", "skill-technique-update"],
  ["language/culture", "language-culture-update"],
  ["equipment", "equipment-update"],
  ["persistence", "persistence-save"],
  ["mode", "mode-switch"],
]);

for (const [label, source] of rerenderSources) {
  test(`remounts attack editors after ${label} rerenders through the canonical lifecycle`, () => {
    const { root, mounted } = createMountedAttackApp();

    root.innerHTML = html;
    assert.equal(countAttackEditors(root), 0);
    mounted.render({ source });

    assert.equal(countAttackEditors(root), 1);
  });
}

test("does not mount attack editors outside creation mode", () => {
  const { root, syncCalls } = createMountedAttackApp({ mode: "table" });

  assert.equal(countAttackEditors(root), 0);
  assert.equal(syncCalls.length, 1);
});

test("unregisters the attack post-render enhancer during destroy", () => {
  const { root, mounted, activeSession, postRenderLifecycle } = createMountedAttackApp();

  assert.equal(postRenderLifecycle.size, 1);
  mounted.attackEdit.destroy();
  assert.equal(postRenderLifecycle.size, 0);

  root.innerHTML = html;
  postRenderLifecycle.run({
    root,
    character: activeSession.character,
    session: activeSession,
    mode: "creation",
  });

  assert.equal(countAttackEditors(root), 0);
});
