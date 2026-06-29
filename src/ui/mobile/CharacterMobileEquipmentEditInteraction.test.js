import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { injectMobileEquipmentEditControls } from "./CharacterMobileEquipmentEditApp.js";

test("injects mobile equipment edit controls only in creation mode", () => {
  const character = createCharacter({
    identity: { id: "c", name: "Teste", concept: "Alpha", playerId: "p", campaignId: "g" },
    equipment: [{ id: "eq1", kind: "item", name: "Corda", quantity: 1, weightKg: 1, cost: 10, state: "carried" }],
    metadata: { createdAt: "2026-06-28T23:31:00.000Z", updatedAt: "2026-06-28T23:31:00.000Z", source: "test" },
  });
  const html = '<section data-card="equipment"><h2>Equipamentos</h2><dl><div data-equipment-id="eq1"><dt>Item</dt><dd>Corda</dd></div></dl></section>';

  const creation = injectMobileEquipmentEditControls(html, character, "creation");
  assert.match(creation, /data-action="equipment-update"/);
  assert.match(creation, /data-role="equipment-inline-editor"/);

  const table = injectMobileEquipmentEditControls(html, character, "table");
  assert.doesNotMatch(table, /data-action="equipment-update"/);
});
