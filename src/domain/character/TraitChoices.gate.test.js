import test from "node:test";
import assert from "node:assert/strict";

import { createTraitChoices } from "./TraitChoices.js";

test("does not infer choice identity from labels or display names", () => {
  const choices = createTraitChoices([
    {
      key: "first-key",
      label: "Mesmo rótulo",
      value: "A",
      required: true,
    },
    {
      key: "second-key",
      label: "Mesmo rótulo",
      value: "B",
      required: true,
    },
  ]);

  assert.deepEqual(choices.map(choice => choice.key), [
    "first-key",
    "second-key",
  ]);
  assert.deepEqual(choices.map(choice => choice.value), ["A", "B"]);
});
