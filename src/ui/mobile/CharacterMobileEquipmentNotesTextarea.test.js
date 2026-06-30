import test from "node:test";
import assert from "node:assert/strict";

import { injectMobileEquipmentEditControls } from "./CharacterMobileEquipmentEditApp.js";

const html = [
  '<section data-card="equipment"><h2>Equipamentos</h2><dl>',
  '<div data-equipment-id="equipment:journal"><dt>Equipamento</dt><dd>Diário</dd></div>',
  '</dl></section>',
].join("");

test("preserves leading newlines in equipment note textareas", () => {
  const rendered = injectMobileEquipmentEditControls(
    html,
    {
      equipment: [{
        id: "equipment:journal",
        name: "Diário",
        quantity: 1,
        weightKg: 0.1,
        cost: 5,
        state: "carried",
        notes: `
Primeira linha depois de branco`,
      }],
    },
    "creation",
  );

  assert.ok(rendered.includes(
    `<textarea data-role="equipment-edit-notes-equipment:journal" autocomplete="off">

Primeira linha depois de branco</textarea>`,
  ));
});

test("keeps equipment note text in textarea content instead of value attributes", () => {
  const rendered = injectMobileEquipmentEditControls(
    html,
    {
      equipment: [{
        id: "equipment:journal",
        name: "Diário",
        quantity: 1,
        notes: `Linha 1
Linha 2 com & < >`,
      }],
    },
    "creation",
  );

  assert.ok(rendered.includes(
    `<textarea data-role="equipment-edit-notes-equipment:journal" autocomplete="off">
Linha 1
Linha 2 com &amp; &lt; &gt;</textarea>`,
  ));
  assert.doesNotMatch(rendered, /data-role="equipment-edit-notes-equipment:journal" value=/);
});
