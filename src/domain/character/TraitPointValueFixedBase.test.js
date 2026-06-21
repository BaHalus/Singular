import test from "node:test";
import assert from "node:assert/strict";
import { createTraitPointValue } from "./TraitPointValue.js";

test("fixed basePoints infer total mode", () => {
  const value = createTraitPointValue({ basePoints: 10 });
  assert.equal(value.mode, "total");
  assert.equal(value.complete, true);
});
