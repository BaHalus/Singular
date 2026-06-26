import test from "node:test";
import assert from "node:assert/strict";

import { createPools } from "./Pools.js";
import {
  addPool,
  adjustPoolCurrent,
  removePool,
  resetPoolCurrentToMaximum,
  setPoolCurrent,
  setPoolMaximum,
  validateOperationalPools,
} from "./PoolsOperations.js";

test("sets pool current without mutating original", () => {
  const pools = createPools({ HP: 10, FP: 12 });
  const updated = setPoolCurrent(pools, "HP", -3);

  assert.equal(pools.HP.current, 10);
  assert.equal(updated.HP.current, -3);
  assert.equal(updated.HP.maximum, 10);
  assert.notEqual(updated, pools);
  assert.notEqual(updated.HP, pools.HP);
});

test("sets pool maximum without mutating original", () => {
  const pools = createPools({
    HP: { current: 12, maximum: 12 },
    FP: 10,
  });
  const updated = setPoolMaximum(pools, "HP", 8);

  assert.equal(pools.HP.maximum, 12);
  assert.equal(updated.HP.current, 12);
  assert.equal(updated.HP.maximum, 8);
});

test("adjusts current without applying mechanical limits", () => {
  const pools = createPools({
    HP: { current: 8, maximum: 10 },
    FP: 12,
  });
  const updated = adjustPoolCurrent(pools, "HP", 5);

  assert.equal(pools.HP.current, 8);
  assert.equal(updated.HP.current, 13);
  assert.equal(updated.HP.maximum, 10);
});

test("resets current to a known maximum", () => {
  const pools = createPools({
    HP: { current: 2, maximum: 11 },
    FP: 10,
  });
  const updated = resetPoolCurrentToMaximum(pools, "HP");

  assert.equal(updated.HP.current, 11);
  assert.equal(updated.HP.maximum, 11);
  assert.equal(pools.HP.current, 2);
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

test("operates on optional and imported pool keys", () => {
  let pools = addPool(createPools({ HP: 10, FP: 10 }), "EnergyReserve", {
    current: 4,
    maximum: 7,
  });
  pools = addPool(pools, "DivineFavorReserve", {
    current: 2,
    maximum: 3,
  });

  const energy = adjustPoolCurrent(pools, "EnergyReserve", -2);
  const favor = setPoolCurrent(energy, "DivineFavorReserve", 1);

  assert.equal(favor.EnergyReserve.current, 2);
  assert.equal(favor.DivineFavorReserve.current, 1);
  assert.equal(favor.DivineFavorReserve.maximum, 3);
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

test("does not remove required HP or FP pools", () => {
  const pools = createPools();

  assert.throws(() => removePool(pools, "HP"), /Cannot remove required pool/);
  assert.throws(() => removePool(pools, "FP"), /Cannot remove required pool/);
});

test("accepts null as an explicit unknown current or maximum", () => {
  const pools = createPools({ HP: 10, FP: 10 });
  const unknownCurrent = setPoolCurrent(pools, "HP", null);
  const unknownMaximum = setPoolMaximum(unknownCurrent, "HP", null);

  assert.equal(unknownMaximum.HP.current, null);
  assert.equal(unknownMaximum.HP.maximum, null);
});

test("rejects missing pools and invalid keys", () => {
  const pools = createPools();

  assert.throws(
    () => setPoolCurrent(pools, "EnergyReserve", 5),
    /Missing pool/,
  );
  assert.throws(
    () => addPool(pools, "", { current: 1, maximum: 1 }),
    /non-empty string/,
  );
});

test("rejects duplicate or malformed optional pools", () => {
  const pools = createPools({ EnergyReserve: 5 });

  assert.throws(
    () => addPool(pools, "EnergyReserve", { current: 1, maximum: 1 }),
    /already exists/,
  );
  assert.throws(
    () => addPool(pools, "Mana", []),
    /Invalid pool definition/,
  );
});

test("rejects adjustment and reset when source values are unknown", () => {
  const pools = createPools();

  assert.throws(
    () => adjustPoolCurrent(pools, "HP", -1),
    /unknown current value/,
  );
  assert.throws(
    () => resetPoolCurrentToMaximum(pools, "FP"),
    /unknown maximum value/,
  );
});

test("rejects non-finite values and non-finite adjustment results", () => {
  const pools = createPools({ HP: 10, FP: 10 });

  assert.throws(
    () => setPoolCurrent(pools, "HP", Number.NaN),
    /Invalid current value/,
  );
  assert.throws(
    () => setPoolMaximum(pools, "FP", Infinity),
    /Invalid maximum value/,
  );
  assert.throws(
    () => adjustPoolCurrent(pools, "HP", Infinity),
    /Invalid current adjustment/,
  );

  const large = createPools({
    HP: { current: Number.MAX_VALUE, maximum: Number.MAX_VALUE },
    FP: 10,
  });
  assert.throws(
    () => adjustPoolCurrent(large, "HP", Number.MAX_VALUE),
    /not finite/,
  );
});

test("validates all pool values before an operation", () => {
  const invalid = createPools({
    HP: { current: Number.NaN, maximum: 10 },
    FP: 10,
  });

  assert.throws(
    () => validateOperationalPools(invalid),
    /Invalid current value/,
  );
  assert.throws(
    () => setPoolCurrent(invalid, "FP", 8),
    /Invalid current value/,
  );
});

test("normalizes negative zero without mutating unrelated pools", () => {
  const pools = createPools({ HP: 10, FP: 10 });
  const updated = setPoolCurrent(pools, "FP", -0);

  assert.equal(updated.FP.current, 0);
  assert.equal(Object.is(updated.FP.current, -0), false);
  assert.equal(updated.HP, pools.HP);
});
