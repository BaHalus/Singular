import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileApp,
  getCharacterMobileModes,
  getCharacterMobileRootSelector,
  mountCharacterMobileApp,
  renderCharacterMobileApp,
} from "./CharacterMobileApp.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-browser-alpha",
      name: "Ayla",
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

function rootFixture() {
  const attributes = new Map();
  return {
    innerHTML: "",
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
  };
}

test("renders a real canonical Character through the complete mobile pipeline", () => {
  const html = renderCharacterMobileApp(character(), { mode: "creation" });

  assert.match(html, /^<article class="singular-mobile-sheet"/);
  assert.match(html, /data-mode="creation"/);
  assert.match(html, /<strong>Ayla<\/strong>/);
  assert.match(html, /<strong>Batedora<\/strong>/);
  assert.match(html, /<dt>DX<\/dt><dd>12<\/dd>/);
  assert.match(html, /<dt>HP<\/dt><dd>9 \/ 11<\/dd>/);
});

test("mounts the mobile app into a DOM-compatible root", () => {
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
  assert.equal(root.getAttribute("data-singular-mounted"), "true");
  assert.equal(root.getAttribute("data-character-id"), "character-browser-alpha");
  assert.equal(root.getAttribute("data-mode"), "table");
});

test("bootstraps with a real default Character when none is supplied", () => {
  const root = rootFixture();
  const documentRef = {
    querySelector(selector) {
      assert.equal(selector, "[data-singular-mobile-root]");
      return root;
    },
  };

  const mounted = bootstrapCharacterMobileApp({ document: documentRef });

  assert.equal(mounted.character.identity.name, "Unnamed");
  assert.equal(mounted.mode, "creation");
  assert.match(root.innerHTML, /<strong>Unnamed<\/strong>/);
  assert.equal(root.getAttribute("data-character-id"), mounted.character.identity.id);
});

test("rejects missing roots, documents and invalid modes", () => {
  assert.throws(
    () => mountCharacterMobileApp({ root: null, character: character() }),
    /root must support innerHTML/,
  );
  assert.throws(
    () => bootstrapCharacterMobileApp({ document: {} }),
    /requires a document/,
  );
  assert.throws(
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

test("ships an executable browser page wired to the responsive stylesheet", () => {
  const page = readFileSync(
    new URL("../../../mobile.html", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("./CharacterMobileApp.css", import.meta.url),
    "utf8",
  );

  assert.match(page, /<meta name="viewport"/);
  assert.match(page, /data-singular-mobile-root/);
  assert.match(page, /CharacterMobileApp\.css/);
  assert.match(page, /bootstrapCharacterMobileApp\(\)/);
  assert.match(page, /type="module"/);

  assert.match(css, /min-width: 320px/);
  assert.match(css, /grid-template-columns: repeat\(4/);
  assert.match(css, /@media \(min-width: 42rem\)/);
  assert.match(css, /min-height: 2\.75rem/);
});
