import test from "node:test";
import assert from "node:assert/strict";

import {
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  requireEnginePlainObject,
  validateEngineDenseArray,
} from "./EnginePortableValue.js";
import {
  cloneSkillMechanicsPortableValue,
  deepFreezeSkillMechanicsValue,
} from "./skills/SkillMechanicsPortableValue.js";

test("clones detached JSON-portable engine values", () => {
  const source = {
    nested: {
      list: [1, "two", null],
    },
  };

  const cloned = cloneEnginePortableValue(source, "Engine value");

  assert.deepEqual(cloned, source);
  assert.notEqual(cloned, source);
  assert.notEqual(cloned.nested, source.nested);
  assert.notEqual(cloned.nested.list, source.nested.list);
});

test("rejects non-portable values and sparse arrays", () => {
  for (const value of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -0,
    undefined,
    1n,
    Symbol("value"),
    () => true,
  ]) {
    assert.throws(
      () => cloneEnginePortableValue(value, "Engine value"),
      /must be JSON portable/,
    );
  }

  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => validateEngineDenseArray(sparse, "Engine array"),
    /must not contain sparse entries/,
  );
});

test("rejects class instances, cycles and extra array properties", () => {
  assert.throws(
    () => requireEnginePlainObject(new Date(), "Engine object"),
    /must be an object/,
  );

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => cloneEnginePortableValue(cyclic, "Engine value"),
    /must be JSON portable/,
  );

  const extra = [1];
  extra.source = "legacy";
  assert.throws(
    () => validateEngineDenseArray(extra, "Engine array"),
    /must not contain non-index properties/,
  );
});

test("deep freezes nested engine values", () => {
  const value = { nested: { list: [{ id: "one" }] } };

  const frozen = deepFreezeEngineValue(value);

  assert.equal(frozen, value);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.nested), true);
  assert.equal(Object.isFrozen(value.nested.list), true);
  assert.equal(Object.isFrozen(value.nested.list[0]), true);
});

test("keeps Skill portability exports compatible", () => {
  const value = { nested: [1, 2] };

  assert.deepEqual(
    cloneSkillMechanicsPortableValue(value, "Skill value"),
    cloneEnginePortableValue(value, "Engine value"),
  );

  const skillFrozen = deepFreezeSkillMechanicsValue({ item: { id: "one" } });
  assert.equal(Object.isFrozen(skillFrozen), true);
  assert.equal(Object.isFrozen(skillFrozen.item), true);
});
