import test from "node:test";
import assert from "node:assert/strict";

import {
  createPools,
  validatePools,
  serializePools,
} from "./Pools.js";

test("creates default pools", () => {
  const pools = createPools();

  assert.equal(pools.HP.current, null);
  assert.equal(pools.HP.maximum, null);
  assert.equal(pools.FP.current, null);
  assert.equal(pools.FP.maximum, null);
});

test("creates pools from numeric values", () => {
  const pools = createPools({
    HP: 10,
    FP: 12,
  });

  assert.equal(pools.HP.current, 10);
  assert.equal(pools.HP.maximum, 10);
  assert.equal(pools.FP.current, 12);
  assert.equal(pools.FP.maximum, 12);
});

test("creates pools from structured values", () => {
  const pools = createPools({
    HP: {
      current: 8,
      maximum: 10,
    },
  });

  assert.equal(pools.HP.current, 8);
  assert.equal(pools.HP.maximum, 10);
});

test("creates optional EnergyReserve", () => {
  const pools = createPools({
    EnergyReserve: {
      current: 5,
      maximum: 10,
    },
  });

  assert.equal(pools.EnergyReserve.current, 5);
  assert.equal(pools.EnergyReserve.maximum, 10);
});

test("validates valid pools", () => {
  const pools = createPools();

  assert.equal(validatePools(pools), true);
});

test("serializes pools", () => {
  const pools = createPools({
    HP: 10,
    FP: 12,
    EnergyReserve: 6,
  });

  const json = serializePools(pools);

  assert.ok(json.HP);
  assert.ok(json.FP);
  assert.ok(json.EnergyReserve);
});

test("throws when HP current is invalid", () => {
  assert.throws(() => {
    createPools({
      HP: {
        current: "10",
        maximum: 10,
      },
    });
  });
});

test("throws when FP maximum is invalid", () => {
  assert.throws(() => {
    createPools({
      FP: {
        current: 10,
        maximum: "12",
      },
    });
  });
});
