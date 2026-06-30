import test from "node:test";
import assert from "node:assert/strict";

import {
  injectMobileEquipmentEditControls,
} from "./CharacterMobileEquipmentEditApp.js";

const html = [
  '<section data-card="equipment"><h2>Equipamentos</h2><dl>',
  '<div data-equipment-id="equipment:backpack"><dt>Equipamento</dt><dd>Mochila</dd></div>',
  '<div data-equipment-id="equipment:rope"><dt>Equipamento</dt><dd>Corda</dd></div>',
  '</dl></section>',
].join("");

function character() {
  return {
    equipment: [
      {
        id: "equipment:backpack",
        name: "Mochila",
        quantity: 1,
        state: "carried",
        children: [
          {
            id: "equipment:rope",
            name: "Corda 15 m",
            quantity: 2,
            state: "stored",
          },
        ],
      },
    ],
  };
}

test("injects mobile equipment inline editors in creation mode", () => {
  const creation = injectMobileEquipmentEditControls(html, character(), "creation");

  assert.match(creation, /data-role="equipment-inline-editor"/);
  assert.match(creation, /data-action="equipment-update"/);
  assert.match(creation, /data-role="equipment-edit-name-equipment:backpack"/);
  assert.match(creation, /data-role="equipment-edit-quantity-equipment:backpack"/);
  assert.match(creation, /data-role="equipment-edit-state-equipment:backpack"/);
  assert.match(creation, /<option value="carried" selected>Carregado<\/option>/);
});

test("injects editors for nested equipment items", () => {
  const creation = injectMobileEquipmentEditControls(html, character(), "creation");

  assert.match(creation, /data-equipment-id="equipment:rope"/);
  assert.match(creation, /data-role="equipment-edit-name-equipment:rope"/);
  assert.match(creation, /value="Corda 15 m"/);
  assert.match(creation, /value="2"/);
  assert.match(creation, /<option value="stored" selected>Guardado<\/option>/);
});

test("keeps equipment structural edit controls out of table mode", () => {
  const table = injectMobileEquipmentEditControls(html, character(), "table");

  assert.doesNotMatch(table, /data-role="equipment-inline-editor"/);
  assert.doesNotMatch(table, /data-action="equipment-update"/);
  assert.match(table, /Mochila/);
  assert.match(table, /Corda/);
});

test("does not duplicate equipment editors when reinjected", () => {
  const creation = injectMobileEquipmentEditControls(html, character(), "creation");
  const reinjected = injectMobileEquipmentEditControls(creation, character(), "creation");

  const matches = reinjected.match(/data-role="equipment-inline-editor"/g) ?? [];
  assert.equal(matches.length, 2);
});
