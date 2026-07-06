import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEquipmentContainerOptions,
} from "../../../src/ui/mobile/CharacterMobileEquipmentContainerSelectorCompositionRoot.js";

describe("CharacterMobileEquipmentContainerSelectorCompositionRoot", () => {
  it("lists only equipment containers as selectable mobile add targets", () => {
    const options = createEquipmentContainerOptions([
      {
        id: "pack",
        kind: "container",
        name: "Mochila",
        children: [
          { id: "rope", kind: "item", name: "Corda", children: [] },
          {
            id: "pouch",
            kind: "container",
            name: "Bolsa interna",
            children: [],
          },
        ],
      },
      { id: "sword", kind: "item", name: "Espada", children: [] },
    ]);

    assert.deepEqual(options, [
      { id: "pack", label: "Mochila" },
      { id: "pouch", label: "↳ Bolsa interna" },
    ]);
  });
});
