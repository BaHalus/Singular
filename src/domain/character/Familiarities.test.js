import test from "node:test";
import assert from "node:assert/strict";

import {
  createFamiliarities,
  createFamiliarity,
  validateFamiliarities,
  serializeFamiliarities,
} from "./Familiarities.js";

test("creates empty familiarities list", () => {
  const familiarities = createFamiliarities();

  assert.deepEqual(familiarities, []);
});

test("creates familiarity with defaults", () => {
  const familiarity = createFamiliarity();

  assert.ok(familiarity.id);
  assert.deepEqual(familiarity.externalIds, {});
  assert.equal(familiarity.name, "");
  assert.equal(familiarity.importedCost, null);
  assert.equal(familiarity.notes, "");
  assert.deepEqual(familiarity.tags, []);
});

test("creates familiarity from input", () => {
  const familiarity = createFamiliarity({
    id: "fam-001",
    externalIds: { gcs: "gcs-fam-001" },
    name: "Western",
    importedCost: 0,
    notes: "Native culture.",
    tags: ["native"],
  });

  assert.equal(familiarity.id, "fam-001");
  assert.equal(familiarity.externalIds.gcs, "gcs-fam-001");
  assert.equal(familiarity.name, "Western");
  assert.equal(familiarity.importedCost, 0);
  assert.deepEqual(familiarity.tags, ["native"]);
});

test("validates valid familiarities", () => {
  const familiarities = createFamiliarities();

  assert.equal(validateFamiliarities(familiarities), true);
});

test("serializes familiarities", () => {
  const familiarities = createFamiliarities([
    {
      id: "fam-001",
      externalIds: { gcs: "gcs-fam-001" },
      name: "Western",
      importedCost: 0,
      tags: ["native"],
    },
  ]);

  const json = serializeFamiliarities(familiarities);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "fam-001");
  assert.equal(json[0].externalIds.gcs, "gcs-fam-001");
  assert.equal(json[0].name, "Western");
  assert.equal(json[0].importedCost, 0);
});

test("throws when familiarities is not array", () => {
  assert.throws(() => {
    createFamiliarities("Western");
  });
});

test("throws when familiarity externalIds is invalid", () => {
  assert.throws(() => {
    createFamiliarities([{ id: "fam-001", externalIds: "gcs-fam-001", name: "Western" }]);
  });
});

test("throws when familiarity name is invalid", () => {
  assert.throws(() => {
    createFamiliarities([{ id: "fam-001", name: 123 }]);
  });
});

test("throws when imported cost is invalid", () => {
  assert.throws(() => {
    createFamiliarities([{ id: "fam-001", name: "Western", importedCost: "0" }]);
  });
});

test("throws when familiarity tags is invalid", () => {
  assert.throws(() => {
    createFamiliarities([{ id: "fam-001", name: "Western", tags: "native" }]);
  });
});
