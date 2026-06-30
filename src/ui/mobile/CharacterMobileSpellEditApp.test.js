import test from "node:test";
import assert from "node:assert/strict";

import {
  injectMobileSpellEditControls,
} from "./CharacterMobileSpellEditApp.js";

function character() {
  return {
    spells: [
      {
        id: "spell:ignite",
        name: "Acender Fogo",
        spellType: "standard",
        attribute: "IQ",
        difficulty: "H",
        points: 2,
        spellClass: "Regular",
        resistance: "",
        castingCost: "1",
        maintenanceCost: "0",
        castingTime: "1s",
        duration: "1 min",
        notes: "\nfunciona melhor em pavio seco\nsem cálculo na UI",
      },
    ],
  };
}

test("injects mobile spell inline controls with multiline notes editor only in creation mode", () => {
  const html = '<section data-card="spells"><h2>Magias</h2><dl><div data-spell-id="spell:ignite"><dt>Magia</dt><dd>Acender Fogo</dd></div></dl></section>';

  const creation = injectMobileSpellEditControls(html, character(), "creation");
  assert.match(creation, /data-role="spell-inline-editor"/);
  assert.match(creation, /data-action="spell-update"/);
  assert.match(creation, /<textarea data-role="spell-edit-notes-spell:ignite"/);
  assert.match(creation, /<textarea data-role="spell-edit-notes-spell:ignite" autocomplete="off">\n\nfunciona melhor em pavio seco\nsem cálculo na UI<\/textarea>/);

  const table = injectMobileSpellEditControls(html, character(), "table");
  assert.doesNotMatch(table, /data-role="spell-inline-editor"/);
  assert.doesNotMatch(table, /data-action="spell-update"/);
});
