import test from "node:test";
import assert from "node:assert/strict";

import {
  createAttributes,
  validateAttributes,
  serializeAttributes,
} from "./Attributes.js";

test("creates default attributes", () => {
  const attributes = createAttributes();

  assert.equal(attributes.ST.base, 10);
  assert.equal(attributes.DX.base, 10);
  assert.equal(attributes.IQ.base, 10);
  assert.equal(attributes.HT.base, 10);
});

test("creates attributes from numeric values", () => {
  const attributes = createAttributes({
    ST: 12,
    DX: 13,
    IQ: 11,
    HT: 9,
  });

  assert.equal(attributes.ST.base, 12);
  assert.equal(attributes.DX.base, 13);
  assert.equal(attributes.IQ.base, 11);
  assert.equal(attributes.HT.base, 9);
});

test("creates attributes from structured values", () => {
  const attributes = createAttributes({
    ST: {
      base: 14,
      override: 16,
    },
  });

  assert.equal(attributes.ST.base, 14);
  assert.equal(attributes.ST.override, 16);
});

test("validates valid attributes", () => {
  const attributes = createAttributes();

  assert.equal(
    validateAttributes(attributes),
    true
  );
});

test("serializes attributes", () => {
  const attributes = createAttributes();

  const json =
    serializeAttributes(attributes);

  assert.ok(json);

  assert.ok(json.ST);
  assert.ok(json.DX);
  assert.ok(json.IQ);
  assert.ok(json.HT);
});

test("throws when ST base is invalid", () => {
  assert.throws(() => {
    createAttributes({
      ST: {
        base: "10",
      },
    });
  });
});

test("throws when override is invalid", () => {
  assert.throws(() => {
    createAttributes({
      ST: {
        base: 10,
        override: "abc",
      },
    });
  });
});
