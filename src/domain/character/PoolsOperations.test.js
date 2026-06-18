import test from "node:test";
import assert from "node:assert/strict";

import { createPools } from "./Pools.js";

import {
  setPoolCurrent,
  setPoolMaximum,
  addPool,
  removePool,
} from "./PoolsOperations.js";

test("sets pool current without mutating original", () => {
  const pools = createPools();

  const updated = setPoolCurrent(pools, "HP", 8);

  assert.equal(pools.HP.current, null);
  assert.equal(updated.HP.current, 8);
});

test("sets pool maximum without mutating original", () => {
  const pools = createPools();

  const updated = setPoolMaximum(pools, "FP", 12);

  assert.equal(pools.FP.maximum, null);
  assert.equal(updated.FP.maximum, 12);
});

test("adds optional pool without mutating original", () => {
  const pools = createPools();

  const updated = addPool(pools, "EnergyReserve", {
    current: 5,
    maximum: 10,
  });

  assert.equal(pools.EnergyReserve, undefined);
  assert.equal(updated.EnergyReserve.current, 5);
  assert.equal(updated.EnergyReserve.maximum, 10);
});

test("removes optional pool without mutating original", () => {
  const pools = createPools({
    EnergyReserve: {
      current: 5,
      maximum: 10,
    },
  });

  const updated = removePool(pools, "EnergyReserve");

  assert.ok(pools.EnergyReserve);
  assert.equal(updated.EnergyReserve, undefined);
});

test("does not remove required HP pool", () => {
  const pools = createPools();

  assert.throws(() => {
    removePool(pools, "HP");
  });
});

test("does not remove required FP pool", () => {
  const pools = createPools();

  assert.throws(() => {
    removePool(pools, "FP");
  });
});

test("throws when setting unknown pool current", () => {
  const pools = createPools();

  assert.throws(() => {
    setPoolCurrent(pools, "EnergyReserve", 5);
  });
});

test("throws on invalid current value", () => {
  const pools = createPools();

  assert.throws(() => {
    setPoolCurrent(pools, "HP", "8");
  });
});

test("throws on invalid maximum value", () => {
  const pools = createPools();

  assert.throws(() => {
    setPoolMaximum(pools, "FP", "12");
  });
});
