import test from "node:test";
import assert from "node:assert/strict";

import {
  injectMobileAttackEditControls,
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

test("injects mobile attack inline editor in creation mode", () => {
  const creation = injectMobileAttackEditControls(html, character(), "creation");

  assert.match(creation, /data-role="attack-inline-editor"/);
  assert.match(creation, /data-action="attack-update"/);
  assert.match(creation, /data-role="attack-edit-name-attack:sword"/);
  assert.match(creation, /data-role="attack-edit-damage-value-attack:sword"/);
  assert.match(creation, /usar com escudo/);
});

test("renders attack notes as textareas for multiline input", () => {
  const source = character();
  source.attacks[0].notes = `Linha 1
Linha 2 com & < > "aspas"`;

  const creation = injectMobileAttackEditControls(html, source, "creation");

  assert.ok(creation.includes(
    `<textarea data-role="attack-edit-notes-attack:sword" autocomplete="off">
Linha 1
Linha 2 com &amp; &lt; &gt; "aspas"</textarea>`,
  ));
  assert.doesNotMatch(creation, /data-role="attack-edit-notes-attack:sword" value=/);
});

test("preserves leading blank lines in attack note textareas", () => {
  const source = character();
  source.attacks[0].notes = `
Linha inicial de ataque`;

  const creation = injectMobileAttackEditControls(html, source, "creation");

  assert.ok(creation.includes(
    `<textarea data-role="attack-edit-notes-attack:sword" autocomplete="off">

Linha inicial de ataque</textarea>`,
  ));
});

test("keeps attack structural edit controls out of table mode", () => {
  const table = injectMobileAttackEditControls(html, character(), "table");

  assert.doesNotMatch(table, /data-role="attack-inline-editor"/);
  assert.doesNotMatch(table, /data-action="attack-update"/);
  assert.match(table, /Espada longa/);
});
