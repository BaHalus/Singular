import test from "node:test";
import assert from "node:assert/strict";

import { createAdvantages } from "./Advantages.js";

import {
  addAdvantage,
  removeAdvantage,
  renameAdvantage,
  updateAdvantageNotes,
  addAdvantageTag,
  removeAdvantageTag,
} from "./AdvantagesOperations.js";

test("adds advantage without mutating original", () => {
  const advantages = createAdvantages();

  const updated = addAdvantage(advantages, {
    id: "adv-001",
    name: "Combat Reflexes",
    notes: "",
    tags: [],
  });

  assert.equal(advantages.length, 0);
  assert.equal(updated.length, 1);
});

test("removes advantage without mutating original", () => {
  const advantages = createAdvantages([
    { id: "adv-001", name: "Combat Reflexes" },
  ]);

  const updated = removeAdvantage(advantages, "adv-001");

  assert.equal(advantages.length, 1);
  assert.equal(updated.length, 0);
});

test("renames advantage without mutating original", () => {
  const advantages = createAdvantages([
    { id: "adv-001", name: "Old Name" },
  ]);

  const updated = renameAdvantage(
    advantages,
    "adv-001",
    "Combat Reflexes"
  );

  assert.equal(advantages[0].name, "Old Name");
  assert.equal(updated[0].name, "Combat Reflexes");
});

test("updates advantage notes without mutating original", () => {
  const advantages = createAdvantages([
    { id: "adv-001", name: "Combat Reflexes", notes: "" },
  ]);

  const updated = updateAdvantageNotes(
    advantages,
    "adv-001",
    "Fast reactions."
  );

  assert.equal(advantages[0].notes, "");
  assert.equal(updated[0].notes, "Fast reactions.");
});

test("adds advantage tag without mutating original", () => {
  const advantages = createAdvantages([
    { id: "adv-001", name: "Combat Reflexes", tags: [] },
  ]);

  const updated = addAdvantageTag(
    advantages,
    "adv-001",
    "combat"
  );

  assert.deepEqual(advantages[0].tags, []);
  assert.deepEqual(updated[0].tags, ["combat"]);
});

test("does not duplicate advantage tag", () => {
  const advantages = createAdvantages([
    { id: "adv-001", name: "Combat Reflexes", tags: ["combat"] },
  ]);

  const updated = addAdvantageTag(
    advantages,
    "adv-001",
    "combat"
  );

  assert.deepEqual(updated[0].tags, ["combat"]);
});

test("removes advantage tag without mutating original", () => {
  const advantages = createAdvantages([
    { id: "adv-001", name: "Combat Reflexes", tags: ["combat"] },
  ]);

  const updated = removeAdvantageTag(
    advantages,
    "adv-001",
    "combat"
  );

  assert.deepEqual(advantages[0].tags, ["combat"]);
  assert.deepEqual(updated[0].tags, []);
});
