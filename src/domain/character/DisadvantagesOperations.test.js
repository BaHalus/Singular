import test from "node:test";
import assert from "node:assert/strict";

import { createDisadvantages } from "./Disadvantages.js";

import {
  addDisadvantage,
  removeDisadvantage,
  renameDisadvantage,
  updateDisadvantageNotes,
  addDisadvantageTag,
  removeDisadvantageTag,
} from "./DisadvantagesOperations.js";

test("adds disadvantage without mutating original", () => {
  const disadvantages = createDisadvantages();

  const updated = addDisadvantage(disadvantages, {
    id: "disadv-001",
    externalIds: {},
    name: "Bad Temper",
    notes: "",
    tags: [],
  });

  assert.equal(disadvantages.length, 0);
  assert.equal(updated.length, 1);
});

test("removes disadvantage without mutating original", () => {
  const disadvantages = createDisadvantages([
    { id: "disadv-001", name: "Bad Temper" },
  ]);

  const updated = removeDisadvantage(disadvantages, "disadv-001");

  assert.equal(disadvantages.length, 1);
  assert.equal(updated.length, 0);
});

test("renames disadvantage without mutating original", () => {
  const disadvantages = createDisadvantages([
    { id: "disadv-001", name: "Old Name" },
  ]);

  const updated = renameDisadvantage(
    disadvantages,
    "disadv-001",
    "Bad Temper"
  );

  assert.equal(disadvantages[0].name, "Old Name");
  assert.equal(updated[0].name, "Bad Temper");
});

test("updates disadvantage notes without mutating original", () => {
  const disadvantages = createDisadvantages([
    { id: "disadv-001", name: "Bad Temper", notes: "" },
  ]);

  const updated = updateDisadvantageNotes(
    disadvantages,
    "disadv-001",
    "Self-control applies later."
  );

  assert.equal(disadvantages[0].notes, "");
  assert.equal(updated[0].notes, "Self-control applies later.");
});

test("adds disadvantage tag without mutating original", () => {
  const disadvantages = createDisadvantages([
    { id: "disadv-001", name: "Bad Temper", tags: [] },
  ]);

  const updated = addDisadvantageTag(
    disadvantages,
    "disadv-001",
    "mental"
  );

  assert.deepEqual(disadvantages[0].tags, []);
  assert.deepEqual(updated[0].tags, ["mental"]);
});

test("does not duplicate disadvantage tag", () => {
  const disadvantages = createDisadvantages([
    { id: "disadv-001", name: "Bad Temper", tags: ["mental"] },
  ]);

  const updated = addDisadvantageTag(
    disadvantages,
    "disadv-001",
    "mental"
  );

  assert.deepEqual(updated[0].tags, ["mental"]);
});

test("removes disadvantage tag without mutating original", () => {
  const disadvantages = createDisadvantages([
    { id: "disadv-001", name: "Bad Temper", tags: ["mental"] },
  ]);

  const updated = removeDisadvantageTag(
    disadvantages,
    "disadv-001",
    "mental"
  );

  assert.deepEqual(disadvantages[0].tags, ["mental"]);
  assert.deepEqual(updated[0].tags, []);
});
