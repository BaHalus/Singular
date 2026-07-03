import test from "node:test";
import assert from "node:assert/strict";

import { injectMobileLanguageCultureEditControls } from "../src/ui/mobile/CharacterMobileLanguageCultureEditApp.js";

test("language culture legacy injection disambiguates equal canonical ids by entry kind", () => {
  const html = [
    "<dl>",
    '<dd data-entry-kind="language" data-canonical-id="shared:id">Idioma compartilhado</dd>',
    '<dd data-entry-kind="familiarity" data-canonical-id="shared:id">Cultura compartilhada</dd>',
    "</dl>",
  ].join("");
  const character = Object.freeze({
    languages: Object.freeze([
      Object.freeze({
        id: "shared:id",
        name: "Idioma compartilhado",
        spokenLevel: "accented",
        writtenLevel: "native",
        isNative: false,
        tags: Object.freeze([]),
        notes: "",
      }),
    ]),
    familiarities: Object.freeze([
      Object.freeze({
        id: "shared:id",
        name: "Cultura compartilhada",
        isNative: false,
        tags: Object.freeze([]),
        notes: "",
      }),
    ]),
  });

  const rendered = injectMobileLanguageCultureEditControls(html, character, "creation");
  const languageRow = readRow(rendered, "language", "shared:id");
  const familiarityRow = readRow(rendered, "familiarity", "shared:id");

  assert.match(languageRow, /data-role="language-inline-editor"/);
  assert.doesNotMatch(languageRow, /data-role="familiarity-inline-editor"/);
  assert.match(familiarityRow, /data-role="familiarity-inline-editor"/);
  assert.doesNotMatch(familiarityRow, /data-role="language-inline-editor"/);
});

function readRow(html, entryKind, canonicalId) {
  const marker = `data-entry-kind="${entryKind}" data-canonical-id="${canonicalId}"`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1);
  const end = html.indexOf("</dd>", start);
  assert.notEqual(end, -1);
  return html.slice(start, end);
}
