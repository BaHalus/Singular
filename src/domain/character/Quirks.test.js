import test from "node:test";
import assert from "node:assert/strict";

import {
  createQuirks,
  createQuirk,
  validateQuirks,
  serializeQuirks,
} from "./Quirks.js";

test("creates empty quirks list", () => {
  const quirks = createQuirks();

  assert.deepEqual(quirks, []);
});

test("creates quirk with defaults", () => {
  const quirk = createQuirk();

  assert.ok(quirk.id);
  assert.deepEqual(quirk.externalIds, {});
  assert.equal(quirk.name, "");
  assert.equal(quirk.notes, "");
  assert.deepEqual(quirk.tags, []);
});

test("creates quirk from input", () => {
  const quirk = createQuirk({
    id: "quirk-001",
    externalIds: { gcs: "gcs-quirk-001" },
    name: "Minor Habit",
    notes: "Always hums while working.",
    tags: ["roleplay"],
  });

  assert.equal(quirk.id, "quirk-001");
  assert.equal(quirk.externalIds.gcs, "gcs-quirk-001");
  assert.equal(quirk.name, "Minor Habit");
  assert.equal(quirk.notes, "Always hums while working.");
  assert.deepEqual(quirk.tags, ["roleplay"]);
});

test("creates quirks list from input", () => {
  const quirks = createQuirks([
    {
      id: "quirk-001",
      externalIds: { gcs: "gcs-quirk-001" },
      name: "Minor Habit",
      tags: ["roleplay"],
    },
  ]);

  assert.equal(quirks.length, 1);
  assert.equal(quirks[0].name, "Minor Habit");
  assert.equal(quirks[0].externalIds.gcs, "gcs-quirk-001");
});

test("validates valid quirks", () => {
  const quirks = createQuirks();

  assert.equal(validateQuirks(quirks), true);
});

test("serializes quirks", () => {
  const quirks = createQuirks([
    {
      id: "quirk-001",
      externalIds: { gcs: "gcs-quirk-001" },
      name: "Minor Habit",
      notes: "",
      tags: ["roleplay"],
    },
  ]);

  const json = serializeQuirks(quirks);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "quirk-001");
  assert.equal(json[0].externalIds.gcs, "gcs-quirk-001");
  assert.equal(json[0].name, "Minor Habit");
  assert.deepEqual(json[0].tags, ["roleplay"]);
});

test("throws when quirks is not array", () => {
  assert.throws(() => {
    createQuirks("Minor Habit");
  });
});

test("throws when quirk externalIds is invalid", () => {
  assert.throws(() => {
    createQuirks([
      { id: "quirk-001", externalIds: "gcs-quirk-001", name: "Minor Habit" },
    ]);
  });
});

test("throws when quirk name is invalid", () => {
  assert.throws(() => {
    createQuirks([{ id: "quirk-001", name: 123 }]);
  });
});

test("throws when quirk notes is invalid", () => {
  assert.throws(() => {
    createQuirks([{ id: "quirk-001", name: "Minor Habit", notes: 123 }]);
  });
});

test("throws when quirk tags is invalid", () => {
  assert.throws(() => {
    createQuirks([{ id: "quirk-001", name: "Minor Habit", tags: "roleplay" }]);
  });
});
