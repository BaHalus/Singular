import test from "node:test";
import assert from "node:assert/strict";

import {
  CHARACTER_MOBILE_COMPOSITION_MODULES,
  bootstrapCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";

test("mobile composition root declares the canonical module order", () => {
  assert.deepEqual(
    CHARACTER_MOBILE_COMPOSITION_MODULES.map(({ name }) => name),
    [
      "base",
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
    assert.equal(typeof module.bootstrap, "function", `${module.name} deve expor bootstrap`);
  }
});

test("mobile composition root exposes a single executable bootstrap", () => {
  assert.equal(typeof bootstrapCharacterMobileCompositionRoot, "function");
});
