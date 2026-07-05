import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import {
  createBrowserLocalSessionRepository,
} from "../../infrastructure/persistence/browser/BrowserLocalPersistence.js";
import {
  bootstrapCharacterMobileApp,
  getCharacterMobileModes,
  getCharacterMobileRootSelector,
  mountCharacterMobileApp,
  renderCharacterMobileApp,
} from "./CharacterMobileApp.js";

function character(id = "character-browser-alpha", name = "Ayla") {
  return createCharacter({
    identity: {
      id,
      name,
      concept: "Batedora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: 11,
      DX: 12,
      IQ: 10,
      HT: 11,
    },
    pools: {
      HP: { current: 9, maximum: 11 },
      FP: { current: 8, maximum: 11 },
    },
    metadata: {
      createdAt: "2026-06-26T18:00:00.000Z",
      updatedAt: "2026-06-26T18:00:00.000Z",
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
    clock: { now: () => "2026-06-26T19:00:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:mobile-${sequence}`;
      },
    },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  const inputValues = new Map();
  return {
    innerHTML: "",
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
}

function click(targetDataset) {
  return {
    target: { dataset: targetDataset, parentElement: null },
    preventDefault() {},
  };
}

test("renders a real canonical Character through the complete mobile pipeline", () => {
  const html = renderCharacterMobileApp(character(), { mode: "creation" });

  assert.match(html, /^<article class="singular-mobile-sheet"/);
  assert.match(html, /data-mode="creation"/);
  assert.match(html, /<strong>Ayla<\/strong>/);
  assert.match(html, /<strong>Batedora<\/strong>/);
  assert.match(html, /data-role="character-summary-editor"/);
  assert.match(html, /<dt>DX<\/dt><dd>12<\/dd>/);
  assert.match(html, /<dt>PV<\/dt><dd>9 \/ 11<\/dd>/);
  assert.match(html, /data-pool-key="HP" data-pool-adjust="-1"/);
});

test("preserves the static canonical Character mount", () => {
  const root = rootFixture();
  const canonicalCharacter = character();

  const mounted = mountCharacterMobileApp({
    root,
    character: canonicalCharacter,
    mode: "table",
  });

  assert.equal(mounted.character, canonicalCharacter);
  assert.equal(mounted.mode, "table");
  assert.equal(mounted.html, root.innerHTML);
  assert.match(root.innerHTML, /data-mode="table"/);
  assert.doesNotMatch(root.innerHTML, /data-role="character-summary-editor"/);
  assert.equal(root.getAttribute("data-singular-mounted"), "true");
  assert.equal(root.getAttribute("data-character-id"), "character-browser-alpha");
  assert.equal(root.getAttribute("data-mode"), "table");
});

test("bootstraps the executable page with a canonical session and persistence actions", async () => {
  const root = rootFixture();
  const storage = createMemoryStorage();
  const documentRef = {
    querySelector(selector) {
      assert.equal(selector, "[data-singular-mobile-root]");
      return root;
    },
  };

  const mounted = await bootstrapCharacterMobileApp({
    document: documentRef,
    storage,
    namespace: "test.mobile.app",
    runtime: runtime(),
  });

  assert.equal(mounted.character.identity.name, "Unnamed");
  assert.equal(mounted.mode, "creation");
  assert.match(root.innerHTML, /<strong>Unnamed<\/strong>/);
  assert.match(root.innerHTML, /data-role="character-summary-editor"/);
  assert.match(root.innerHTML, /data-action="persistence-save"/);
  assert.match(root.innerHTML, /data-pool-key="HP" data-pool-adjust="-1"/);
  assert.equal(root.getAttribute("data-session-id"), mounted.session.id);

  await root.dispatch("click", {
    target: {
      dataset: { action: "persistence-save" },
      parentElement: null,
    },
  });
  assert.deepEqual(await mounted.repositories.session.listIds(), [mounted.session.id]);
});

test("adjusts PV through App Core, rerenders and saves only after manual save", async () => {
  const root = rootFixture();
  const storage = createMemoryStorage();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-pool-mobile",
    storage,
    namespace: "test.mobile.pool-controls",
    runtime: runtime(),
    mode: "table",
  });
  let prevented = false;

  await root.dispatch("click", {
    target: {
      dataset: { poolKey: "HP", poolAdjust: "-1" },
      parentElement: null,
    },
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.pools.HP.current, 8);
  assert.equal(mounted.session.history.length, 1);
  assert.equal(mounted.session.history[0].commandType, "pool.current.adjust");
  assert.equal(root.getAttribute("data-last-command-status"), "applied");
  assert.match(root.innerHTML, /<dt>PV<\/dt><dd>8 \/ 11<\/dd>/);
  assert.deepEqual(await mounted.repositories.session.listIds(), []);

  await root.dispatch("click", {
    target: {
      dataset: { action: "persistence-save" },
      parentElement: null,
    },
  });
  mounted.modeSync.sync();
  const saved = await mounted.repositories.session.load("session-pool-mobile");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.pools.HP.current, 8);
  assert.equal(mounted.mode, "table");
  assert.equal(root.getAttribute("data-mode"), "table");
});

test("table quick header edits only current PV and PF through canonical pool commands and survives remount", async () => {
  const storage = createMemoryStorage();
  const firstRoot = rootFixture();
  const mounted = await bootstrapCharacterMobileApp({
    root: firstRoot,
    character: character(),
    sessionId: "session-table-quick-header-pools",
    storage,
    namespace: "test.mobile.table-quick-header-pools",
    runtime: runtime(),
    mode: "table",
  });

  assert.equal(mounted.mode, "table");
  assert.match(firstRoot.innerHTML, /data-mode="table"/);
  assert.match(firstRoot.innerHTML, /data-pool-key="HP" data-pool-adjust="-1"/);
  assert.match(firstRoot.innerHTML, /data-pool-key="FP" data-pool-adjust="-1"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="character-summary-editor"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-role="equipment-editor"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-action="equipment-add"/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-attribute-key="ST"/);

  await firstRoot.dispatch("click", click({ poolKey: "HP", poolAdjust: "-1" }));
  await firstRoot.dispatch("click", click({ poolKey: "FP", poolAdjust: "-1" }));

  assert.equal(firstRoot.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.session.history.length, 2);
  assert.deepEqual(mounted.session.history.map(entry => entry.commandType), [
    "pool.current.adjust",
    "pool.current.adjust",
  ]);
  assert.equal(mounted.character.pools.HP.current, 8);
  assert.equal(mounted.character.pools.HP.maximum, 11);
  assert.equal(mounted.character.pools.FP.current, 7);
  assert.equal(mounted.character.pools.FP.maximum, 11);
  assert.equal(mounted.character.attributes.ST.base, 11);
  assert.equal(mounted.character.attributes.DX.base, 12);
  assert.match(firstRoot.innerHTML, /<dt>PV<\/dt><dd>8 \/ 11<\/dd>/);
  assert.match(firstRoot.innerHTML, /<dt>PF<\/dt><dd>7 \/ 11<\/dd>/);
  assert.doesNotMatch(firstRoot.innerHTML, /data-attribute-key="ST"/);

  await firstRoot.dispatch("click", click({ action: "persistence-save" }));
  const saved = await mounted.repositories.session.load("session-table-quick-header-pools");

  assert.equal(saved.revision, 2);
  assert.equal(saved.character.pools.HP.current, 8);
  assert.equal(saved.character.pools.HP.maximum, 11);
  assert.equal(saved.character.pools.FP.current, 7);
  assert.equal(saved.character.pools.FP.maximum, 11);
  assert.equal(saved.character.attributes.ST.base, 11);
  assert.equal(saved.character.attributes.DX.base, 12);

  mounted.interactions.destroy();

  const remountRoot = rootFixture();
  const remounted = await bootstrapCharacterMobileApp({
    root: remountRoot,
    storage,
    namespace: "test.mobile.table-quick-header-pools",
    runtime: runtime(),
    mode: "table",
  });

  assert.equal(remounted.mode, "table");
  assert.equal(remounted.session.id, "session-table-quick-header-pools");
  assert.equal(remounted.session.revision, 2);
  assert.equal(remounted.character.pools.HP.current, 8);
  assert.equal(remounted.character.pools.HP.maximum, 11);
  assert.equal(remounted.character.pools.FP.current, 7);
  assert.equal(remounted.character.pools.FP.maximum, 11);
  assert.equal(remounted.character.attributes.ST.base, 11);
  assert.equal(remountRoot.getAttribute("data-mode"), "table");
  assert.match(remountRoot.innerHTML, /<dt>PV<\/dt><dd>8 \/ 11<\/dd>/);
  assert.match(remountRoot.innerHTML, /<dt>PF<\/dt><dd>7 \/ 11<\/dd>/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-role="character-summary-editor"/);
  assert.doesNotMatch(remountRoot.innerHTML, /data-attribute-key="ST"/);
});

test("edits character summary in creation mode and blocks it in table mode", async () => {
  const root = rootFixture();
  const storage = createMemoryStorage();
  const mounted = await bootstrapCharacterMobileApp({
    root,
    character: character(),
    sessionId: "session-summary-mobile",
    storage,
    namespace: "test.mobile.character-summary",
    runtime: runtime(),
    mode: "creation",
  });

  root.setInput('[data-role="character-name"]', "Ayla do Norte");
  root.setInput('[data-role="character-concept"]', "Batedora veterana");
  await root.dispatch("click", {
    target: {
      dataset: { action: "character-summary-save" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 1);
  assert.equal(mounted.character.identity.name, "Ayla do Norte");
  assert.equal(mounted.character.identity.concept, "Batedora veterana");
  assert.equal(mounted.session.history[0].commandType, "character.summary.set");
  assert.deepEqual(await mounted.repositories.session.listIds(), []);
  assert.match(root.innerHTML, /<strong>Ayla do Norte<\/strong>/);

  await root.dispatch("click", {
    target: {
      dataset: { action: "mode-table" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.mode, "table");
  assert.equal(root.getAttribute("data-mode"), "table");
  assert.equal(root.getAttribute("data-last-mode-status"), "applied");
  assert.doesNotMatch(root.innerHTML, /data-role="character-summary-editor"/);

  await root.dispatch("click", {
    target: {
      dataset: { action: "character-summary-save" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 1);
  assert.equal(root.getAttribute("data-last-command-status"), "blocked-by-mode");

  await root.dispatch("click", {
    target: {
      dataset: { poolKey: "HP", poolAdjust: "-1" },
      parentElement: null,
    },
    preventDefault() {},
  });

  assert.equal(mounted.session.revision, 2);
  assert.equal(mounted.character.pools.HP.current, 8);

  await root.dispatch("click", {
    target: {
      dataset: { action: "persistence-save" },
      parentElement: null,
    },
  });
  mounted.modeSync.sync();
  const saved = await mounted.repositories.session.load("session-summary-mobile");

  assert.equal(saved.character.identity.name, "Ayla do Norte");
  assert.equal(saved.character.identity.concept, "Batedora veterana");
  assert.equal(saved.character.pools.HP.current, 8);
  assert.equal(root.getAttribute("data-mode"), "table");
});

test("restores the last valid session with an injected root and no document", async () => {
  const root = rootFixture();
  const storage = createMemoryStorage();
  const namespace = "test.mobile.restore";
  const restoredSession = createApplicationSession({
    id: "session-restored",
    character: character("character-restored", "Restaurada"),
    revision: 3,
    dirty: true,
  });
  const repository = createBrowserLocalSessionRepository({ storage, namespace });
  await repository.save(restoredSession);

  const mounted = await bootstrapCharacterMobileApp({
    root,
    storage,
    namespace,
    runtime: runtime(),
  });

  assert.equal(mounted.session.id, "session-restored");
  assert.equal(mounted.character.identity.name, "Restaurada");
  assert.match(root.innerHTML, /<strong>Restaurada<\/strong>/);
  assert.equal(root.getAttribute("data-session-id"), "session-restored");
});

test("rejects missing roots, documents and invalid modes", async () => {
  assert.throws(
    () => mountCharacterMobileApp({ root: null, character: character() }),
    /root must support innerHTML/,
  );
  await assert.rejects(
    () => bootstrapCharacterMobileApp({ document: {} }),
    /requires a document/,
  );
  await assert.rejects(
    () => bootstrapCharacterMobileApp({
      document: { querySelector: () => null },
    }),
    /root was not found/,
  );
  assert.throws(
    () => renderCharacterMobileApp(character(), { mode: "print" }),
    /mode is invalid/,
  );
});

test("exposes detached supported modes and the canonical root selector", () => {
  const modes = getCharacterMobileModes();
  assert.deepEqual(modes, ["creation", "table"]);
  modes.push("print");
  assert.deepEqual(getCharacterMobileModes(), ["creation", "table"]);
  assert.equal(getCharacterMobileRootSelector(), "[data-singular-mobile-root]");
});
