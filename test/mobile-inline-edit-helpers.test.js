import test from "node:test";
import assert from "node:assert/strict";

import {
  appendInlineEditorToDefinitionListItem,
  requirePlainObject,
  resolveMobileRoot,
  splitTextList,
} from "../src/ui/mobile/MobileInlineEditHelpers.js";

// Keep the migrated editor modules parseable under node --test after helper extraction.
await import("../src/ui/mobile/CharacterMobileAttackEditApp.js");
await import("../src/ui/mobile/CharacterMobileSpellEditApp.js");
await import("../src/ui/mobile/CharacterMobilePowerEditApp.js");

test("appendInlineEditorToDefinitionListItem inserts before the matching dd close once", () => {
  const html = '<dl><dt>Ataque</dt><dd data-attack-id="atk-1">Corte</dd></dl>';
  const result = appendInlineEditorToDefinitionListItem(html, {
    entityId: "atk-1",
    markerAttribute: "data-attack-id",
    editorRole: "attack-inline-editor",
    renderEditor: () => '<div data-role="attack-inline-editor" data-attack-id="atk-1">editor</div>',
  });

  assert.equal(
    result,
    '<dl><dt>Ataque</dt><dd data-attack-id="atk-1">Corte<div data-role="attack-inline-editor" data-attack-id="atk-1">editor</div></dd></dl>',
  );

  const repeated = appendInlineEditorToDefinitionListItem(result, {
    entityId: "atk-1",
    markerAttribute: "data-attack-id",
    editorRole: "attack-inline-editor",
    renderEditor: () => '<div data-role="attack-inline-editor" data-attack-id="atk-1">editor</div>',
  });

  assert.equal(repeated, result);
});

test("appendInlineEditorToDefinitionListItem preserves html without target marker", () => {
  const html = '<dl><dt>Ataque</dt><dd data-attack-id="atk-1">Corte</dd></dl>';
  const result = appendInlineEditorToDefinitionListItem(html, {
    entityId: "atk-2",
    markerAttribute: "data-attack-id",
    editorRole: "attack-inline-editor",
    renderEditor: () => "ignored",
  });

  assert.equal(result, html);
});

test("resolveMobileRoot returns the configured mobile root", () => {
  const root = { nodeType: 1 };
  const documentRef = {
    querySelector(selector) {
      assert.equal(selector, "[data-singular-mobile-root]");
      return root;
    },
  };

  assert.equal(resolveMobileRoot(documentRef, "missing"), root);
  assert.throws(() => resolveMobileRoot({ querySelector: () => null }, "missing"), /missing/);
});

test("requirePlainObject rejects non plain bootstrap options", () => {
  assert.doesNotThrow(() => requirePlainObject({}, "Options"));
  assert.doesNotThrow(() => requirePlainObject(Object.create(null), "Options"));
  assert.throws(() => requirePlainObject([], "Options"), /Options must be a plain object/);
});

test("splitTextList normalizes comma-separated text", () => {
  assert.deepEqual(splitTextList("a, b,, c "), ["a", "b", "c"]);
  assert.deepEqual(splitTextList(["a"]), ["a"]);
  assert.deepEqual(splitTextList(null), []);
});
