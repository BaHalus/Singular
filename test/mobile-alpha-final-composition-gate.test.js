import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../src/domain/character/Character.js";
import { createApplicationSession } from "../src/application/session/ApplicationSession.js";
import { renderCharacterMobileApp } from "../src/ui/mobile/CharacterMobileApp.js";
import {
  mountCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "../src/ui/mobile/CharacterMobilePostRenderLifecycle.js";

test("A8 final alpha mobile composition gate stays idempotent across render, remount and mode changes", () => {
  const character = createAlphaCharacter();
  const session = createApplicationSession({ id: "session-a8-final", character });
  const root = createRoot();
  let postRenderLifecycle = createCharacterMobilePostRenderLifecycle();
  let mode = "creation";
  let baseRenderCount = 0;
  let modeSyncCount = 0;

  const app = Object.freeze({
    get character() { return session.character; },
    get session() { return session; },
    get html() { return root.innerHTML; },
    get mode() { return mode; },
    interactions: Object.freeze({ destroy() {} }),
    modeSync: Object.freeze({ sync() { modeSyncCount += 1; }, destroy() {} }),
    ui: Object.freeze({
      render({ mode: renderMode } = {}) {
        return renderCharacterMobileApp(session.character, { mode: renderMode ?? mode });
      },
      getState() { return Object.freeze({ busy: false }); },
    }),
    persistence: Object.freeze({ getActiveSession() { return session; } }),
    commands: Object.freeze(createNoOpCommands()),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    get postRenderLifecycle() { return postRenderLifecycle; },
    render(options = {}) {
      baseRenderCount += 1;
      const renderMode = options.mode ?? mode;
      root.innerHTML = renderCharacterMobileApp(session.character, { mode: renderMode });
      root.setAttribute("data-mode", renderMode);
      if (!options.skipPostRenderLifecycle) {
        postRenderLifecycle.run({ root, character: session.character, session, mode: renderMode });
      }
      return root.innerHTML;
    },
  });

  const mounted = mountCharacterMobileCompositionRoot(app, { root });
  const initialClickListeners = root.listenerCount("click");

  assert.ok(initialClickListeners > 0);
  assertCreationSurface(root.innerHTML);

  mounted.render();
  mounted.render();

  assert.ok(baseRenderCount >= 2);
  assert.equal(root.listenerCount("click"), initialClickListeners);
  assertCreationSurface(root.innerHTML);

  mode = "table";
  mounted.render();

  assert.equal(root.listenerCount("click"), initialClickListeners);
  assertTableSurface(root.innerHTML);

  mode = "creation";
  mounted.render();

  assert.equal(root.listenerCount("click"), initialClickListeners);
  assertCreationSurface(root.innerHTML);
  assert.ok(modeSyncCount >= 4);

  mounted.compositionRoot.destroy();
  assert.equal(root.listenerCount("click"), 0);
  postRenderLifecycle.run({ root, character: session.character, session, mode: "creation" });
  assertCreationSurface(root.innerHTML);
  assert.equal(root.listenerCount("click"), 0);

  postRenderLifecycle = createCharacterMobilePostRenderLifecycle();
  const remounted = mountCharacterMobileCompositionRoot(app, { root });
  const remountClickListeners = root.listenerCount("click");

  assert.equal(remountClickListeners, initialClickListeners);
  assertCreationSurface(root.innerHTML);

  remounted.render();
  remounted.render();

  assert.equal(root.listenerCount("click"), remountClickListeners);
  assertCreationSurface(root.innerHTML);

  remounted.compositionRoot.destroy();
  assert.equal(root.listenerCount("click"), 0);
});

function createAlphaCharacter() {
  return createCharacter({
    identity: {
      id: "character-a8-final",
      name: "A8 Final",
      concept: "Alpha mobile composition gate",
      playerId: "player-a8",
      campaignId: "campaign-alpha",
    },
    secondaryCharacteristics: {
      HP: { base: 10, override: 12 },
      FP: { base: 10, override: null },
      Will: { base: 10, override: 11 },
      Per: { base: 10, override: null },
      BasicSpeed: { base: 5, override: null },
      BasicMove: { base: 5, override: 6 },
    },
    pools: {
      HP: { current: 12, maximum: 12 },
      FP: { current: 10, maximum: 10 },
    },
    notes: {
      general: "A8 operational final note",
      structured: [Object.freeze({
        id: "note-a8",
        title: "Mesa",
        text: "Checar composição final.",
        category: "sessão",
        reference: "A8",
        tags: ["alpha", "mobile"],
      })],
    },
    metadata: {
      createdAt: "2026-07-04T07:40:00.000Z",
      updatedAt: "2026-07-04T07:40:00.000Z",
      source: "test",
    },
  });
}

function assertCreationSurface(html) {
  assertSingle(html, 'data-role="language-editor"');
  assertSingle(html, 'data-role="familiarity-editor"');
  assertSingle(html, 'data-role="trait-editor"');
  assertSingle(html, 'data-role="skill-editor"');
  assertSingle(html, 'data-role="technique-editor"');
  assertSingle(html, 'data-role="attack-editor"');
  assertSingle(html, 'data-role="equipment-editor"');
  assertSingle(html, 'data-role="spell-editor"');
  assertSingle(html, 'data-role="power-editor"');
  assertSingle(html, 'data-role="general-notes-editor"');
  assertSingle(html, 'data-role="structured-note-editor"');
  assertSingle(html, 'data-role="structured-note-inline-editor"');
  assert.equal(count(html, 'data-action="secondary-base-set"'), 6);
  assert.equal(count(html, 'data-card="notes"'), 1);
  assert.equal(count(html, 'data-card="languages-culture"'), 1);
  assert.equal(count(html, 'data-card="secondary-characteristics"'), 1);
  assert.equal(count(html, 'data-card="traits"'), 1);
  assert.equal(count(html, 'data-card="skills-techniques"'), 1);
  assert.equal(count(html, 'data-card="attacks"'), 1);
  assert.equal(count(html, 'data-card="equipment"'), 1);
  assert.equal(count(html, 'data-card="spells"'), 1);
  assert.equal(count(html, 'data-card="powers"'), 1);
}

function assertTableSurface(html) {
  for (const role of [
    "language-editor",
    "familiarity-editor",
    "trait-editor",
    "skill-editor",
    "technique-editor",
    "attack-editor",
    "equipment-editor",
    "spell-editor",
    "power-editor",
    "general-notes-editor",
    "structured-note-editor",
    "structured-note-inline-editor",
  ]) {
    assert.equal(count(html, `data-role="${role}"`), 0);
  }
  assert.equal(count(html, 'data-action="secondary-base-set"'), 0);
  assert.equal(count(html, 'data-card="notes"'), 1);
  assert.match(html, /A8 operational final note/);
}

function createRoot() {
  const listeners = new Map();
  const attributes = new Map();
  return {
    innerHTML: "",
    ownerDocument: createDocument(),
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    listenerCount(type) { return listeners.get(type)?.size ?? 0; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

function createDocument() {
  return {
    createElement(tagName) {
      if (tagName !== "template") return null;
      return {
        content: { childNodes: [] },
        set innerHTML(value) { this.content.childNodes = [String(value)]; },
      };
    },
  };
}

function createNoOpCommands() {
  const names = [
    "addLanguage",
    "removeLanguage",
    "reorderLanguage",
    "addFamiliarity",
    "removeFamiliarity",
    "reorderFamiliarity",
    "updateSecondaryCharacteristic",
    "clearSecondaryCharacteristicOverride",
    "setPoolMaximum",
    "saveGeneralNotes",
    "addStructuredNote",
    "updateStructuredNote",
    "removeStructuredNote",
    "reorderStructuredNote",
    "addTrait",
    "updateTrait",
    "removeTrait",
    "reorderTrait",
    "addSkill",
    "updateSkill",
    "removeSkill",
    "reorderSkill",
    "addTechnique",
    "updateTechnique",
    "removeTechnique",
    "reorderTechnique",
    "addAttack",
    "updateAttack",
    "removeAttack",
    "reorderAttack",
    "addEquipment",
    "updateEquipment",
    "removeEquipment",
    "reorderEquipment",
    "setEquipmentState",
    "addSpell",
    "updateSpell",
    "removeSpell",
    "reorderSpell",
    "addPower",
    "renamePower",
    "removePower",
  ];
  return Object.fromEntries(names.map(name => [name, noOpCommand]));
}

function noOpCommand() {
  return Object.freeze({ status: "no-op" });
}

function assertSingle(html, needle) {
  assert.equal(count(html, needle), 1, `${needle} should appear exactly once`);
}

function count(html, needle) {
  return html.split(needle).length - 1;
}
