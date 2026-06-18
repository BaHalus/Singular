import test from "node:test";
import assert from "node:assert/strict";

import { createState } from "./State.js";

import {
  addCondition,
  removeCondition,
  addEffect,
  removeEffect,
  setCombatEngaged,
} from "./StateOperations.js";

test("adds condition without mutating original", () => {
  const state = createState();

  const updated = addCondition(state, {
    name: "Stunned",
  });

  assert.equal(state.conditions.length, 0);
  assert.equal(updated.conditions.length, 1);
});

test("removes condition without mutating original", () => {
  const state = createState({
    conditions: [
      { name: "Stunned" },
      { name: "Prone" },
    ],
  });

  const updated =
    removeCondition(state, "Stunned");

  assert.equal(state.conditions.length, 2);
  assert.equal(updated.conditions.length, 1);
  assert.equal(
    updated.conditions[0].name,
    "Prone"
  );
});

test("adds effect without mutating original", () => {
  const state = createState();

  const updated = addEffect(state, {
    id: "effect-1",
    source: "Bless",
  });

  assert.equal(state.effects.length, 0);
  assert.equal(updated.effects.length, 1);
});

test("removes effect without mutating original", () => {
  const state = createState({
    effects: [
      {
        id: "effect-1",
        source: "Bless",
      },
      {
        id: "effect-2",
        source: "Haste",
      },
    ],
  });

  const updated =
    removeEffect(state, "effect-1");

  assert.equal(state.effects.length, 2);
  assert.equal(updated.effects.length, 1);
  assert.equal(
    updated.effects[0].id,
    "effect-2"
  );
});

test("sets combat engaged without mutating original", () => {
  const state = createState();

  const updated =
    setCombatEngaged(state, true);

  assert.equal(
    state.combat.engaged,
    false
  );

  assert.equal(
    updated.combat.engaged,
    true
  );
});

test("throws on invalid combat engaged value", () => {
  const state = createState();

  assert.throws(() => {
    setCombatEngaged(state, "yes");
  });
});
