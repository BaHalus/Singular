import test from "node:test";
import assert from "node:assert/strict";

import { injectMobileSecondaryNotesControls } from "./CharacterMobileSecondaryNotesApp.js";

test("renders structured note text as textareas for multiline mobile editing", () => {
  const rendered = injectMobileSecondaryNotesControls(
    '<main><section class="singular-mobile-sheet__card" data-card="secondary-characteristics"><h2>Secundários</h2></section></main>',
    {
      secondaryCharacteristics: {},
      pools: {},
      notes: {
        general: "Diário de campanha.",
        structured: [{
          id: "note:multiline",
          title: "Pista",
          text: `Linha 1
Linha 2 com & < > "aspas"`,
          category: "investigação",
          reference: "sessão 3",
          tags: ["pista"],
        }],
      },
    },
    "creation",
  );

  assert.match(rendered, /<textarea data-role="note-text" autocomplete="off"><\/textarea>/);
  assert.ok(rendered.includes(
    `<textarea data-role="note-edit-text-note:multiline" autocomplete="off">Linha 1
Linha 2 com &amp; &lt; &gt; "aspas"</textarea>`,
  ));
  assert.doesNotMatch(rendered, /data-role="note-edit-text-note:multiline" value=/);
});
