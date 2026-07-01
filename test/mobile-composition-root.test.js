import test from "node:test";
import assert from "node:assert/strict";

import {
  CHARACTER_MOBILE_COMPOSITION_MODULES,
  bootstrapCharacterMobileCompositionRoot,
  mountCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";

test("mobile composition root declares the canonical independent module order", () => {
  assert.deepEqual(
    CHARACTER_MOBILE_COMPOSITION_MODULES.map(({ name }) => name),
    [
      "language-culture",
      "secondary-notes",
      "trait-edit",
      "skill-technique-edit",
      "language-culture-edit",
      "attack-edit",
      "equipment-edit",
      "spell-edit",
      "power-edit",
    ],
  );

  for (const module of CHARACTER_MOBILE_COMPOSITION_MODULES) {
    assert.equal(typeof module.mount, "function", `${module.name} deve expor mount independente`);
    assert.equal(typeof module.destroyKey, "string", `${module.name} deve declarar destroyKey`);
    assert.equal("bootstrap" in module, false, `${module.name} não deve expor bootstrap no caminho canônico`);
  }
});

test("mobile composition root exposes a single executable bootstrap and explicit mount root", () => {
  assert.equal(typeof bootstrapCharacterMobileCompositionRoot, "function");
  assert.equal(typeof mountCharacterMobileCompositionRoot, "function");
});
