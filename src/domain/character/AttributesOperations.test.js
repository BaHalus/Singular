import test from "node:test";
import assert from "node:assert/strict";

import { createAttributes } from "./Attributes.js";

import {
  setAttributeBase,
  setAttributeOverride,
  clearAttributeOverride,
} from "./AttributesOperations.js";

test("sets attribute base without mutating original", () => {
  const attributes = createAttributes();

  const updated =
    setAttributeBase(attributes, "ST", 12);

  assert.equal(attributes.ST.base, 10);
  assert.equal(updated.ST.base, 12);
});

test("sets attribute override without mutating original", () => {
  const attributes = createAttributes();

  const updated =
    setAttributeOverride(attributes, "DX", 14);

  assert.equal(attributes.DX.override, null);
  assert.equal(updated.DX.override, 14);
});

test("clears attribute override without mutating original", () => {
  const attributes = createAttributes({
    IQ: {
      base: 10,
      override: 13,
    },
  });

  const updated =
    clearAttributeOverride(attributes, "IQ");

  assert.equal(attributes.IQ.override, 13);
  assert.equal(updated.IQ.override, null);
});

test("throws on invalid attribute key", () => {
  const attributes = createAttributes();

  assert.throws(() => {
    setAttributeBase(attributes, "CHA", 10);
  });
});

test("throws on invalid base value", () => {
  const attributes = createAttributes();

  assert.throws(() => {
    setAttributeBase(attributes, "HT", "10");
  });
});

test("throws on invalid override value", () => {
  const attributes = createAttributes();

  assert.throws(() => {
    setAttributeOverride(attributes, "ST", "12");
  });
});
