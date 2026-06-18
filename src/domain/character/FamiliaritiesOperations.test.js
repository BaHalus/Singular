import test from "node:test";
import assert from "node:assert/strict";

import { createFamiliarities } from "./Familiarities.js";

import {
  addFamiliarity,
  removeFamiliarity,
  renameFamiliarity,
  setFamiliarityImportedCost,
  updateFamiliarityNotes,
  addFamiliarityTag,
  removeFamiliarityTag,
} from "./FamiliaritiesOperations.js";

test("adds familiarity without mutating original", () => {
  const familiarities = createFamiliarities();

  const updated = addFamiliarity(familiarities, {
    id: "fam-001",
    externalIds: {},
    name: "Western",
    importedCost: 0,
    notes: "",
    tags: [],
  });

  assert.equal(familiarities.length, 0);
  assert.equal(updated.length, 1);
});

test("removes familiarity without mutating original", () => {
  const familiarities = createFamiliarities([
    { id: "fam-001", name: "Western" },
  ]);

  const updated = removeFamiliarity(familiarities, "fam-001");

  assert.equal(familiarities.length, 1);
  assert.equal(updated.length, 0);
});

test("renames familiarity without mutating original", () => {
  const familiarities = createFamiliarities([
    { id: "fam-001", name: "Old Name" },
  ]);

  const updated = renameFamiliarity(familiarities, "fam-001", "Western");

  assert.equal(familiarities[0].name, "Old Name");
  assert.equal(updated[0].name, "Western");
});

test("sets familiarity imported cost without mutating original", () => {
  const familiarities = createFamiliarities([
    { id: "fam-001", name: "Western", importedCost: null },
  ]);

  const updated = setFamiliarityImportedCost(familiarities, "fam-001", 0);

  assert.equal(familiarities[0].importedCost, null);
  assert.equal(updated[0].importedCost, 0);
});

test("throws on invalid familiarity imported cost", () => {
  const familiarities = createFamiliarities();

  assert.throws(() => {
    setFamiliarityImportedCost(familiarities, "fam-001", "0");
  });
});

test("updates familiarity notes without mutating original", () => {
  const familiarities = createFamiliarities([
    { id: "fam-001", name: "Western", notes: "" },
  ]);

  const updated = updateFamiliarityNotes(familiarities, "fam-001", "Native culture.");

  assert.equal(familiarities[0].notes, "");
  assert.equal(updated[0].notes, "Native culture.");
});

test("adds familiarity tag without mutating original", () => {
  const familiarities = createFamiliarities([
    { id: "fam-001", name: "Western", tags: [] },
  ]);

  const updated = addFamiliarityTag(familiarities, "fam-001", "native");

  assert.deepEqual(familiarities[0].tags, []);
  assert.deepEqual(updated[0].tags, ["native"]);
});

test("does not duplicate familiarity tag", () => {
  const familiarities = createFamiliarities([
    { id: "fam-001", name: "Western", tags: ["native"] },
  ]);

  const updated = addFamiliarityTag(familiarities, "fam-001", "native");

  assert.deepEqual(updated[0].tags, ["native"]);
});

test("removes familiarity tag without mutating original", () => {
  const familiarities = createFamiliarities([
    { id: "fam-001", name: "Western", tags: ["native"] },
  ]);

  const updated = removeFamiliarityTag(familiarities, "fam-001", "native");

  assert.deepEqual(familiarities[0].tags, ["native"]);
  assert.deepEqual(updated[0].tags, []);
});
