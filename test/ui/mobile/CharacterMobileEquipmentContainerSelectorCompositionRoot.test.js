import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEquipmentContainerOptions,
  mountCharacterMobileEquipmentContainerSelector,
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

  it("preserves the mounted mobile root for downstream composition modules", () => {
    const root = {
      addEventListener() {},
      removeEventListener() {},
      querySelector() { return null; },
      setAttribute() {},
    };
    const app = {
      root,
      character: { equipment: [] },
      mode: "creation",
      ui: { getState: () => ({ busy: false }) },
      commands: { addEquipment: () => ({ status: "applied" }) },
      postRenderLifecycle: { register: () => () => {} },
      render() {},
    };

    const mounted = mountCharacterMobileEquipmentContainerSelector(app);

    assert.equal(mounted.root, root);
    mounted.equipmentContainerSelector.destroy();
  });
});
