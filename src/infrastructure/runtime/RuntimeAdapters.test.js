import test from "node:test";
import assert from "node:assert/strict";

import { readClock, generateId } from "../../application/ports/RuntimePorts.js";
import { createFixedClock } from "./FixedClock.js";
import { createSequentialIdGenerator } from "./SequentialIdGenerator.js";

test("fixed clock always returns the configured timestamp", () => {
  const clock = createFixedClock("2026-06-22T16:00:00.000Z");

  assert.equal(readClock(clock), "2026-06-22T16:00:00.000Z");
  assert.equal(readClock(clock), "2026-06-22T16:00:00.000Z");
  assert.equal(Object.isFrozen(clock), true);
});

test("fixed clock accepts Date and rejects invalid values", () => {
  const clock = createFixedClock(new Date("2026-06-22T16:00:00.000Z"));
  assert.equal(readClock(clock), "2026-06-22T16:00:00.000Z");
  assert.throws(() => createFixedClock("invalid"), /valid timestamp or Date/);
});

test("sequential generator creates deterministic prefixed ids", () => {
  const generator = createSequentialIdGenerator({
    initialValue: 7,
    width: 3,
  });

  assert.equal(generateId(generator, "command"), "command:008");
  assert.equal(generateId(generator, "transition"), "transition:009");
  assert.equal(Object.isFrozen(generator), true);
});

test("sequential generator supports custom separator", () => {
  const generator = createSequentialIdGenerator({ separator: "-" });
  assert.equal(generateId(generator, "session"), "session-1");
});

test("sequential generator rejects invalid configuration and exhaustion", () => {
  assert.throws(
    () => createSequentialIdGenerator({ initialValue: -1 }),
    /non-negative safe integer/,
  );
  assert.throws(
    () => createSequentialIdGenerator({ width: 1.5 }),
    /width must be a non-negative safe integer/,
  );
  assert.throws(
    () => createSequentialIdGenerator({ separator: null }),
    /separator must be a string/,
  );

  const exhausted = createSequentialIdGenerator({
    initialValue: Number.MAX_SAFE_INTEGER,
  });
  assert.throws(() => generateId(exhausted, "id"), /exhausted/);
});
