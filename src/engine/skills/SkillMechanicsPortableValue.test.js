import test from "node:test";
import assert from "node:assert/strict";

import {
  cloneSkillMechanicsPortableValue,
  deepFreezeSkillMechanicsValue,
  validateSkillMechanicsDenseArray,
} from "./SkillMechanicsPortableValue.js";

test("clones a detached portable value", () => {
  const source = {
    text: "ok",
    number: 3,
    boolean: true,
    nested: {
      list: [1, 2, null],
    },
  };

  const cloned = cloneSkillMechanicsPortableValue(source, "value");

  assert.deepEqual(cloned, source);
  assert.notEqual(cloned, source);
  assert.notEqual(cloned.nested, source.nested);
  assert.notEqual(cloned.nested.list, source.nested.list);
});

test("rejects values whose JSON representation changes", () => {
  for (const value of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -0,
    undefined,
    1n,
    Symbol("value"),
    () => true,
  ]) {
    assert.throws(
      () => cloneSkillMechanicsPortableValue(value, "value"),
      /must be JSON portable/,
    );
  }
});

test("rejects sparse arrays and extra array properties", () => {
  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => validateSkillMechanicsDenseArray(sparse, "array"),
    /must not contain sparse entries/,
  );

  const extra = [1];
  extra.source = "legacy";
  assert.throws(
    () => validateSkillMechanicsDenseArray(extra, "array"),
    /must not contain non-index properties/,
  );

  const symbolic = [1];
  symbolic[Symbol("source")] = "legacy";
  assert.throws(
    () => validateSkillMechanicsDenseArray(symbolic, "array"),
    /must not contain non-index properties/,
  );
});

test("rejects symbolic and non-enumerable object properties", () => {
  const symbolic = { value: 1 };
  symbolic[Symbol("source")] = "legacy";
  assert.throws(
    () => cloneSkillMechanicsPortableValue(symbolic, "value"),
    /must be JSON portable/,
  );

  const hidden = { value: 1 };
  Object.defineProperty(hidden, "hidden", {
    value: 2,
    enumerable: false,
  });
  assert.throws(
    () => cloneSkillMechanicsPortableValue(hidden, "value"),
    /must be JSON portable/,
  );
});

test("rejects cycles and class instances", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => cloneSkillMechanicsPortableValue(cyclic, "value"),
    /must be JSON portable/,
  );

  assert.throws(
    () => cloneSkillMechanicsPortableValue(new Date(), "value"),
    /must be JSON portable/,
  );
});

test("deep freezes nested portable structures", () => {
  const value = {
    nested: {
      list: [{ id: "item" }],
    },
  };

  const frozen = deepFreezeSkillMechanicsValue(value);

  assert.equal(frozen, value);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.nested), true);
  assert.equal(Object.isFrozen(value.nested.list), true);
  assert.equal(Object.isFrozen(value.nested.list[0]), true);
});
