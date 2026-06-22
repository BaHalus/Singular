import test from "node:test";
import assert from "node:assert/strict";

import {
  generateId,
  readClock,
  validateApplicationRuntime,
  validateClock,
  validateIdGenerator,
} from "./RuntimePorts.js";

function runtime() {
  return {
    clock: {
      now: () => "2026-06-22T15:00:00.000Z",
    },
    idGenerator: {
      next: prefix => `${prefix}:001`,
    },
  };
}

test("validates and reads deterministic runtime ports", () => {
  const value = runtime();

  assert.equal(validateClock(value.clock), true);
  assert.equal(validateIdGenerator(value.idGenerator), true);
  assert.equal(validateApplicationRuntime(value), true);
  assert.equal(readClock(value.clock), "2026-06-22T15:00:00.000Z");
  assert.equal(generateId(value.idGenerator, "transition"), "transition:001");
});

test("normalizes Date values returned by clocks", () => {
  const clock = {
    now: () => new Date("2026-06-22T15:00:00.000Z"),
  };

  assert.equal(readClock(clock), "2026-06-22T15:00:00.000Z");
});

test("rejects malformed ports and invalid runtime results", () => {
  assert.throws(() => validateClock(null), /Clock must be a plain object/);
  assert.throws(() => validateClock({}), /Clock now must be a function/);
  assert.throws(
    () => readClock({ now: () => "invalid" }),
    /valid timestamp or Date/,
  );
  assert.throws(
    () => validateIdGenerator({ next: null }),
    /next must be a function/,
  );
  assert.throws(
    () => generateId({ next: () => "" }, "command"),
    /Generated ID must be a non-empty string/,
  );
  assert.throws(
    () => generateId({ next: prefix => prefix }, " "),
    /ID prefix must be a non-empty string/,
  );
  assert.throws(
    () => validateApplicationRuntime({ clock: runtime().clock }),
    /Id generator must be a plain object/,
  );
});
