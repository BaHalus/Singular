import assert from "node:assert/strict";
import test from "node:test";

import {
  injectLanguageCultureCreationControls,
} from "../../../src/ui/mobile/CharacterMobileLanguageCultureApp.js";

const baseHtml = [
  '<article class="singular-mobile-sheet" data-mode="creation">',
  '<section class="singular-mobile-sheet__card" data-card="languages-culture" data-status="declared">',
  "<h2>Idiomas e Cultura</h2>",
  '<dl class="singular-mobile-sheet__languages-culture-list">',
  '<div data-entry-kind="language" data-canonical-id="lang_a"><dt>Idioma</dt><dd>Português</dd></div>',
  '<div data-entry-kind="familiarity" data-canonical-id="fam_a"><dt>Cultura</dt><dd>Brasil</dd></div>',
  "</dl>",
  "</section>",
  "</article>",
].join("");

test("injectLanguageCultureCreationControls adds creation editors and item actions", () => {
  const html = injectLanguageCultureCreationControls(
    baseHtml,
    {
      languages: [{ id: "lang_a", name: "Português" }],
      familiarities: [{ id: "fam_a", name: "Brasil" }],
    },
    "creation",
  );

  assert.match(html, /data-role="language-editor"/);
  assert.match(html, /data-action="language-add"/);
  assert.match(html, /data-action="language-remove" data-language-id="lang_a"/);
  assert.match(html, /data-role="familiarity-editor"/);
  assert.match(html, /data-action="familiarity-add"/);
  assert.match(html, /data-action="familiarity-remove" data-familiarity-id="fam_a"/);
});

test("injectLanguageCultureCreationControls does not add structural controls in table mode", () => {
  const html = injectLanguageCultureCreationControls(
    baseHtml,
    {
      languages: [{ id: "lang_a", name: "Português" }],
      familiarities: [{ id: "fam_a", name: "Brasil" }],
    },
    "table",
  );

  assert.equal(html, baseHtml);
  assert.doesNotMatch(html, /data-action="language-add"/);
  assert.doesNotMatch(html, /data-action="familiarity-add"/);
});

test("injectLanguageCultureCreationControls leaves unrelated html unchanged", () => {
  const html = '<section data-card="traits"><h2>Traços</h2></section>';
  assert.equal(
    injectLanguageCultureCreationControls(html, { languages: [], familiarities: [] }, "creation"),
    html,
  );
});
