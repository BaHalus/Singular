import test from "node:test";
import assert from "node:assert/strict";

import { createQuirks } from "./Quirks.js";

import {
  addQuirk,
  removeQuirk,
  renameQuirk,
  updateQuirkNotes,
  addQuirkTag,
  removeQuirkTag,
} from "./QuirksOperations.js";

test("adds quirk without mutating original", () => {
  const quirks = createQuirks();

  const updated = addQuirk(quirks, {
    id: "quirk-001",
    externalIds: {},
    name: "Minor Habit",
    notes: "",
    tags: [],
  });

  assert.equal(quirks.length, 0);
  assert.equal(updated.length, 1);
});

test("removes quirk without mutating original", () => {
  const quirks = createQuirks([
    { id: "quirk-001", name: "Minor Habit" },
  ]);

  const updated = removeQuirk(quirks, "quirk-001");

  assert.equal(quirks.length, 1);
  assert.equal(updated.length, 0);
});

test("renames quirk without mutating original", () => {
  const quirks = createQuirks([
    { id: "quirk-001", name: "Old Name" },
  ]);

  const updated = renameQuirk(
    quirks,
    "quirk-001",
    "Minor Habit"
  );

  assert.equal(quirks[0].name, "Old Name");
  assert.equal(updated[0].name, "Minor Habit");
});

test("updates quirk notes without mutating original", () => {
  const quirks = createQuirks([
    { id: "quirk-001", name: "Minor Habit", notes: "" },
  ]);

  const updated = updateQuirkNotes(
    quirks,
    "quirk-001",
    "Always hums while working."
  );

  assert.equal(quirks[0].notes, "");
  assert.equal(updated[0].notes, "Always hums while working.");
});

test("adds quirk tag without mutating original", () => {
  const quirks = createQuirks([
    { id: "quirk-001", name: "Minor Habit", tags: [] },
  ]);

  const updated = addQuirkTag(
    quirks,
    "quirk-001",
    "roleplay"
  );

  assert.deepEqual(quirks[0].tags, []);
  assert.deepEqual(updated[0].tags, ["roleplay"]);
});

test("does not duplicate quirk tag", () => {
  const quirks = createQuirks([
    { id: "quirk-001", name: "Minor Habit", tags: ["roleplay"] },
  ]);

  const updated = addQuirkTag(
    quirks,
    "quirk-001",
    "roleplay"
  );

  assert.deepEqual(updated[0].tags, ["roleplay"]);
});

test("removes quirk tag without mutating original", () => {
  const quirks = createQuirks([
    { id: "quirk-001", name: "Minor Habit", tags: ["roleplay"] },
  ]);

  const updated = removeQuirkTag(
    quirks,
    "quirk-001",
    "roleplay"
  );

  assert.deepEqual(quirks[0].tags, ["roleplay"]);
  assert.deepEqual(updated[0].tags, []);
});
