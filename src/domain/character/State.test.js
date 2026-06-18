import test from "node:test";
import assert from "node:assert/strict";

import {
  createState,
  validateState,
  serializeState,
} from "./State.js";

test("creates default state", () => {
  const state = createState();

  assert.deepEqual(state.conditions, []);
  assert.deepEqual(state.effects, []);
  assert.equal(state.combat.engaged, false);
});

test("creates state from input", () => {
  const state = createState({
    conditions: [{ name: "Stunned" }],
    effects: [{ source: "Bless" }],
    combat: {
      engaged: true,
    },
  });

  assert.equal(state.conditions.length, 1);
  assert.equal(state.effects.length, 1);
  assert.equal(state.combat.engaged, true);
});

test("validates valid state", () => {
  const state = createState();

  assert.equal(validateState(state), true);
});

test("serializes state", () => {
  const state = createState({
    conditions: [{ name: "Prone" }],
    effects: [{ source: "Haste" }],
    combat: {
      engaged: true,
    },
  });

  const json = serializeState(state);

  assert.equal(json.conditions.length, 1);
  assert.equal(json.effects.length, 1);
  assert.equal(json.combat.engaged, true);
});

test("throws when conditions is not array", () => {
  assert.throws(() => {
    createState({
      conditions: "Stunned",
    });
  });
});

test("throws when effects is not array", () => {
  assert.throws(() => {
    createState({
      effects: "Bless",
    });
  });
});

test("throws when combat.engaged is not boolean", () => {
  assert.throws(() => {
    createState({
      combat: {
        engaged: "yes",
      },
    });
  });
});
