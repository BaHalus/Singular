import test from "node:test";
import assert from "node:assert/strict";

import { createCharacterMobilePostRenderLifecycle } from "../src/ui/mobile/CharacterMobilePostRenderLifecycle.js";

test("mobile post-render lifecycle exists", () => {
  assert.equal(typeof createCharacterMobilePostRenderLifecycle, "function");
});
