import test from "node:test";
import assert from "node:assert/strict";

import {
  createDisadvantages,
  createDisadvantage,
  validateDisadvantages,
  serializeDisadvantages,
} from "./Disadvantages.js";

test("creates empty disadvantages list", () => {
  const disadvantages = createDisadvantages();

  assert.deepEqual(disadvantages, []);
});

test("creates disadvantage with defaults", () => {
  const disadvantage = createDisadvantage();

  assert.ok(disadvantage.id);
  assert.deepEqual(disadvantage.externalIds, {});
  assert.equal(disadvantage.name, "");
  assert.equal(disadvantage.notes, "");
  assert.deepEqual(disadvantage.tags, []);
});

test("creates disadvantage from input", () => {
  const disadvantage = createDisadvantage({
    id: "disadv-001",
    externalIds: { gcs: "gcs-disadv-001" },
    name: "Bad Temper",
    notes: "Self-control applies later in Rules.",
    tags: ["mental"],
  });

  assert.equal(disadvantage.id, "disadv-001");
  assert.equal(disadvantage.externalIds.gcs, "gcs-disadv-001");
  assert.equal(disadvantage.name, "Bad Temper");
  assert.equal(disadvantage.notes, "Self-control applies later in Rules.");
  assert.deepEqual(disadvantage.tags, ["mental"]);
});

test("creates disadvantages list from input", () => {
  const disadvantages = createDisadvantages([
    {
      id: "disadv-001",
      externalIds: { gcs: "gcs-disadv-001" },
      name: "Bad Temper",
      tags: ["mental"],
    },
  ]);

  assert.equal(disadvantages.length, 1);
  assert.equal(disadvantages[0].name, "Bad Temper");
  assert.equal(disadvantages[0].externalIds.gcs, "gcs-disadv-001");
});

test("validates valid disadvantages", () => {
  const disadvantages = createDisadvantages();

  assert.equal(validateDisadvantages(disadvantages), true);
});

test("serializes disadvantages", () => {
  const disadvantages = createDisadvantages([
    {
      id: "disadv-001",
      externalIds: { gcs: "gcs-disadv-001" },
      name: "Bad Temper",
      notes: "",
      tags: ["mental"],
    },
  ]);

  const json = serializeDisadvantages(disadvantages);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "disadv-001");
  assert.equal(json[0].externalIds.gcs, "gcs-disadv-001");
  assert.equal(json[0].name, "Bad Temper");
  assert.deepEqual(json[0].tags, ["mental"]);
});

test("throws when disadvantages is not array", () => {
  assert.throws(() => {
    createDisadvantages("Bad Temper");
  });
});

test("throws when disadvantage externalIds is invalid", () => {
  assert.throws(() => {
    createDisadvantages([
      { id: "disadv-001", externalIds: "gcs-disadv-001", name: "Bad Temper" },
    ]);
  });
});

test("throws when disadvantage name is invalid", () => {
  assert.throws(() => {
    createDisadvantages([{ id: "disadv-001", name: 123 }]);
  });
});

test("throws when disadvantage notes is invalid", () => {
  assert.throws(() => {
    createDisadvantages([{ id: "disadv-001", name: "Bad Temper", notes: 123 }]);
  });
});

test("throws when disadvantage tags is invalid", () => {
  assert.throws(() => {
    createDisadvantages([{ id: "disadv-001", name: "Bad Temper", tags: "mental" }]);
  });
});
