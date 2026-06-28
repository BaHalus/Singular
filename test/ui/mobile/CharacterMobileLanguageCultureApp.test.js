import assert from "node:assert/strict";
import test from "node:test";

import { injectLanguageCultureCreationControls } from "../../../src/ui/mobile/CharacterMobileLanguageCultureApp.js";

const baseHtml = `<article><section data-card="languages-culture"><h2>Idiomas e Cultura</h2><dl><div data-entry-kind="language" data-canonical-id="lang_a"><dt>Idioma</dt><dd>Português</dd></div><div data-entry-kind="familiarity" data-canonical-id="fam_a"><dt>Cultura</dt><dd>Brasil</dd></div></dl></section></article>`;

test("adds creation editors and actions", () => {
  const html = injectLanguageCultureCreationControls(baseHtml, {
    languages: [{ id: "lang_a", name: "Português" }],
    familiarities: [{ id: "fam_a", name: "Brasil" }],
  }, "creation");

  for (const fragment of [
    "language-editor",
    "language-add",
    "language-remove",
    "lang_a",
    "familiarity-editor",
    "familiarity-add",
    "familiarity-remove",
    "fam_a",
  ]) {
    assert.ok(html.includes(fragment), fragment);
  }
});

test("keeps table mode unchanged", () => {
  const html = injectLanguageCultureCreationControls(baseHtml, {
    languages: [{ id: "lang_a", name: "Português" }],
    familiarities: [{ id: "fam_a", name: "Brasil" }],
  }, "table");

  assert.equal(html, baseHtml);
});

test("keeps unrelated html unchanged", () => {
  const html = `<section data-card="traits"><h2>Traços</h2></section>`;
  assert.equal(injectLanguageCultureCreationControls(html, { languages: [], familiarities: [] }, "creation"), html);
});
