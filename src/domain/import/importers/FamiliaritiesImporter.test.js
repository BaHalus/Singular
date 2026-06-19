import test from "node:test";
import assert from "node:assert/strict";

import { importFamiliarities } from "./FamiliaritiesImporter.js";

test("imports cultural familiarity trait", () => {
  const raw = {
    id: "fam-001",
    name: "Familiaridade Cultural (Elfos)",
    reference: "B23",
    local_notes: "Conhece os costumes élficos.",
    tags: ["Mental", "Vantagem"],
    modifiers: [
      {
        id: "mod-native",
        name: "Nativa",
        cost_adj: "-1",
        disabled: true,
      },
    ],
    base_points: 1,
    calc: { points: 1 },
  };

  const result = importFamiliarities([
    {
      id: "fam-001",
      externalIds: { gcs: "fam-001" },
      specialKind: "familiarity",
      name: raw.name,
      points: 1,
      modifiers: raw.modifiers,
      prereqs: null,
      tags: raw.tags,
      importMeta: { source: "gcs", containerIds: ["culture-001"] },
      raw,
    },
  ]);

  assert.equal(result.familiarities.length, 1);
  assert.equal(result.unknownNodes.length, 0);

  const familiarity = result.familiarities[0];

  assert.equal(familiarity.id, "fam-001");
  assert.equal(familiarity.externalIds.gcs, "fam-001");
  assert.equal(familiarity.name, "Elfos");
  assert.equal(familiarity.isNative, false);
  assert.equal(familiarity.importedCost, 1);
  assert.equal(familiarity.reference, "B23");
  assert.equal(familiarity.notes, "Conhece os costumes élficos.");
  assert.deepEqual(familiarity.importMeta.containerIds, ["culture-001"]);
  assert.equal(familiarity.raw, raw);
});

test("imports native cultural familiarity", () => {
  const result = importFamiliarities([
    {
      id: "fam-001",
      name: "Familiaridade Cultural: Ocidental",
      modifiers: [
        {
          name: "Nativa",
          cost_adj: "-1",
        },
      ],
      calc: { points: 0 },
      tags: ["Mental", "Vantagem"],
    },
  ]);

  const familiarity = result.familiarities[0];

  assert.equal(familiarity.name, "Ocidental");
  assert.equal(familiarity.isNative, true);
  assert.equal(familiarity.importedCost, 0);
  assert.ok(familiarity.tags.includes("native"));
});

test("imports direct familiarity data", () => {
  const result = importFamiliarities({
    cultural_familiarities: [
      {
        id: "fam-001",
        culture_name: "Mercantil",
        imported_cost: "1",
        native: false,
      },
    ],
  });

  const familiarity = result.familiarities[0];

  assert.equal(familiarity.name, "Mercantil");
  assert.equal(familiarity.importedCost, 1);
  assert.equal(familiarity.isNative, false);
});

test("preserves unnamed familiarity nodes separately", () => {
  const result = importFamiliarities([
    {
      id: "unknown-001",
      name: "",
    },
  ]);

  assert.deepEqual(result.familiarities, []);
  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.unknownNodes[0].id, "unknown-001");
});

test("rejects invalid familiarity source and fields", () => {
  assert.throws(() => {
    importFamiliarities("familiarities");
  });

  assert.throws(() => {
    importFamiliarities(["familiarity"]);
  });

  assert.throws(() => {
    importFamiliarities([
      {
        id: "fam-001",
        name: "Familiaridade Cultural (Elfos)",
        modifiers: "Nativa",
      },
    ]);
  });
});
