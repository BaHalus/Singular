import test from "node:test";
import assert from "node:assert/strict";

import {
  createPerks,
  createPerk,
  validatePerks,
  serializePerks,
} from "./Perks.js";

test("creates empty perks list", () => {
  const perks = createPerks();

  assert.deepEqual(perks, []);
});

test("creates perk with defaults", () => {
  const perk = createPerk();

  assert.ok(perk.id);
  assert.deepEqual(perk.externalIds, {});
  assert.equal(perk.name, "");
  assert.equal(perk.notes, "");
  assert.deepEqual(perk.tags, []);
});

test("creates perk from input", () => {
  const perk = createPerk({
    id: "perk-001",
    externalIds: {
      gcs: "gcs-perk-001",
    },
    name: "Accessory",
    notes: "Built-in small tool.",
    tags: ["utility"],
  });

  assert.equal(perk.id, "perk-001");
  assert.equal(perk.externalIds.gcs, "gcs-perk-001");
  assert.equal(perk.name, "Accessory");
  assert.equal(perk.notes, "Built-in small tool.");
  assert.deepEqual(perk.tags, ["utility"]);
});

test("creates perks list from input", () => {
  const perks = createPerks([
    {
      id: "perk-001",
      externalIds: {
        gcs: "gcs-perk-001",
      },
      name: "Accessory",
      tags: ["utility"],
    },
  ]);

  assert.equal(perks.length, 1);
  assert.equal(perks[0].name, "Accessory");
  assert.equal(perks[0].externalIds.gcs, "gcs-perk-001");
});

test("validates valid perks", () => {
  const perks = createPerks();

  assert.equal(validatePerks(perks), true);
});

test("serializes perks", () => {
  const perks = createPerks([
    {
      id: "perk-001",
      externalIds: {
        gcs: "gcs-perk-001",
      },
      name: "Accessory",
      notes: "",
      tags: ["utility"],
    },
  ]);

  const json = serializePerks(perks);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "perk-001");
  assert.equal(json[0].externalIds.gcs, "gcs-perk-001");
  assert.equal(json[0].name, "Accessory");
  assert.deepEqual(json[0].tags, ["utility"]);
});

test("throws when perks is not array", () => {
  assert.throws(() => {
    createPerks("Accessory");
  });
});

test("throws when perk externalIds is invalid", () => {
  assert.throws(() => {
    createPerks([
      {
        id: "perk-001",
        externalIds: "gcs-perk-001",
        name: "Accessory",
      },
    ]);
  });
});

test("throws when perk name is invalid", () => {
  assert.throws(() => {
    createPerks([
      {
        id: "perk-001",
        name: 123,
      },
    ]);
  });
});

test("throws when perk notes is invalid", () => {
  assert.throws(() => {
    createPerks([
      {
        id: "perk-001",
        name: "Accessory",
        notes: 123,
      },
    ]);
  });
});

test("throws when perk tags is invalid", () => {
  assert.throws(() => {
    createPerks([
      {
        id: "perk-001",
        name: "Accessory",
        tags: "utility",
      },
    ]);
  });
});
