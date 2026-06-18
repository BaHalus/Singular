import test from "node:test";
import assert from "node:assert/strict";

import { createPerks } from "./Perks.js";

import {
  addPerk,
  removePerk,
  renamePerk,
  updatePerkNotes,
  addPerkTag,
  removePerkTag,
} from "./PerksOperations.js";

test("adds perk without mutating original", () => {
  const perks = createPerks();

  const updated = addPerk(perks, {
    id: "perk-001",
    externalIds: {},
    name: "Accessory",
    notes: "",
    tags: [],
  });

  assert.equal(perks.length, 0);
  assert.equal(updated.length, 1);
});

test("removes perk without mutating original", () => {
  const perks = createPerks([
    { id: "perk-001", name: "Accessory" },
  ]);

  const updated = removePerk(perks, "perk-001");

  assert.equal(perks.length, 1);
  assert.equal(updated.length, 0);
});

test("renames perk without mutating original", () => {
  const perks = createPerks([
    { id: "perk-001", name: "Old Name" },
  ]);

  const updated = renamePerk(
    perks,
    "perk-001",
    "Accessory"
  );

  assert.equal(perks[0].name, "Old Name");
  assert.equal(updated[0].name, "Accessory");
});

test("updates perk notes without mutating original", () => {
  const perks = createPerks([
    { id: "perk-001", name: "Accessory", notes: "" },
  ]);

  const updated = updatePerkNotes(
    perks,
    "perk-001",
    "Built-in small tool."
  );

  assert.equal(perks[0].notes, "");
  assert.equal(updated[0].notes, "Built-in small tool.");
});

test("adds perk tag without mutating original", () => {
  const perks = createPerks([
    { id: "perk-001", name: "Accessory", tags: [] },
  ]);

  const updated = addPerkTag(
    perks,
    "perk-001",
    "utility"
  );

  assert.deepEqual(perks[0].tags, []);
  assert.deepEqual(updated[0].tags, ["utility"]);
});

test("does not duplicate perk tag", () => {
  const perks = createPerks([
    { id: "perk-001", name: "Accessory", tags: ["utility"] },
  ]);

  const updated = addPerkTag(
    perks,
    "perk-001",
    "utility"
  );

  assert.deepEqual(updated[0].tags, ["utility"]);
});

test("removes perk tag without mutating original", () => {
  const perks = createPerks([
    { id: "perk-001", name: "Accessory", tags: ["utility"] },
  ]);

  const updated = removePerkTag(
    perks,
    "perk-001",
    "utility"
  );

  assert.deepEqual(perks[0].tags, ["utility"]);
  assert.deepEqual(updated[0].tags, []);
});
