import test from "node:test";
import assert from "node:assert/strict";

import { importTraits } from "./TraitsImporter.js";
import { importPowers } from "./PowersImporter.js";

function importFromTree(rows) {
  return importPowers(importTraits({ rows }));
}

test("imports a Power from explicit GCS container ancestry", () => {
  const result = importFromTree([
    {
      id: "power-fire",
      type: "trait_container",
      container_type: "power",
      name: "Poder do Fogo",
      tags: ["Elemental"],
      power_source: "Fogo",
      power_modifier: {
        name: "Poder do Fogo",
        value_percent: "-10",
        notes: "Fonte elemental.",
      },
      children: [
        {
          id: "trait-burning-attack",
          name: "Ataque Ardente",
          base_points: 20,
          tags: ["Vantagem"],
        },
        {
          id: "trait-control-fire",
          name: "Controle do Fogo",
          base_points: 20,
          tags: ["Vantagem"],
        },
      ],
    },
  ]);

  assert.deepEqual(result.unresolvedLinks, []);
  assert.equal(result.powers.length, 1);
  assert.deepEqual(result.powers[0], {
    id: "power-fire",
    externalIds: { gcs: "power-fire" },
    name: "Poder do Fogo",
    source: "Fogo",
    powerModifier: {
      name: "Poder do Fogo",
      valuePercent: -10,
      notes: "Fonte elemental.",
    },
    talentTraitId: null,
    memberTraitIds: [
      "trait-burning-attack",
      "trait-control-fire",
    ],
    notes: "",
    tags: ["Elemental", "import:gcs", "node:power"],
    importMeta: {
      source: "gcs",
      containerIds: [],
      sourceType: "trait_container",
    },
    raw: {
      id: "power-fire",
      type: "trait_container",
      container_type: "power",
      name: "Poder do Fogo",
      tags: ["Elemental"],
      power_source: "Fogo",
      power_modifier: {
        name: "Poder do Fogo",
        value_percent: "-10",
        notes: "Fonte elemental.",
      },
      children: [
        {
          id: "trait-burning-attack",
          name: "Ataque Ardente",
          base_points: 20,
          tags: ["Vantagem"],
        },
        {
          id: "trait-control-fire",
          name: "Controle do Fogo",
          base_points: 20,
          tags: ["Vantagem"],
        },
      ],
    },
  });
});

test("uses the nearest Power ancestor for nested containers", () => {
  const result = importFromTree([
    {
      id: "power-parent",
      type: "trait_container",
      container_type: "power",
      name: "Poder Pai",
      children: [
        {
          id: "trait-parent",
          name: "Habilidade Pai",
          base_points: 10,
        },
        {
          id: "power-child",
          type: "trait_container",
          container_type: "power",
          name: "Poder Filho",
          children: [
            {
              id: "trait-child",
              name: "Habilidade Filha",
              base_points: 10,
            },
          ],
        },
      ],
    },
  ]);

  const parent = result.powers.find(power => power.id === "power-parent");
  const child = result.powers.find(power => power.id === "power-child");

  assert.deepEqual(parent.memberTraitIds, ["trait-parent"]);
  assert.deepEqual(child.memberTraitIds, ["trait-child"]);
});

test("resolves only an explicit talent Trait id", () => {
  const result = importFromTree([
    {
      id: "power-fire",
      type: "trait_container",
      container_type: "power",
      talent_trait_id: "trait-fire-talent",
      children: [
        {
          id: "trait-fire-talent",
          name: "Talento do Fogo",
          base_points: 5,
        },
        {
          id: "trait-burning-attack",
          name: "Ataque Ardente",
          base_points: 20,
        },
      ],
    },
  ]);

  assert.equal(result.powers[0].talentTraitId, "trait-fire-talent");
  assert.deepEqual(
    result.powers[0].memberTraitIds,
    ["trait-burning-attack"],
  );
  assert.deepEqual(result.unresolvedLinks, []);
});

test("does not infer talent references from names", () => {
  const result = importFromTree([
    {
      id: "power-fire",
      type: "trait_container",
      container_type: "power",
      children: [
        {
          id: "trait-fire-talent",
          name: "Talento do Fogo",
          base_points: 5,
        },
      ],
    },
  ]);

  assert.equal(result.powers[0].talentTraitId, null);
  assert.deepEqual(
    result.powers[0].memberTraitIds,
    ["trait-fire-talent"],
  );
});

test("preserves unresolved explicit talent references for diagnostics", () => {
  const result = importFromTree([
    {
      id: "power-fire",
      type: "trait_container",
      container_type: "power",
      talent_id: "missing-talent",
      children: [],
    },
  ]);

  assert.equal(result.powers[0].talentTraitId, null);
  assert.deepEqual(result.unresolvedLinks, [
    {
      powerId: "power-fire",
      kind: "talent-trait",
      externalTraitId: "missing-talent",
    },
  ]);
});

test("returns no Powers when imported Traits contain no power containers", () => {
  const result = importFromTree([
    {
      id: "group-general",
      type: "trait_container",
      container_type: "group",
      children: [
        {
          id: "trait-general",
          name: "Reflexos em Combate",
          base_points: 15,
        },
      ],
    },
  ]);

  assert.deepEqual(result, {
    powers: [],
    unresolvedLinks: [],
  });
});

test("rejects malformed imported Trait collections", () => {
  assert.throws(
    () => importPowers(null),
    /Imported Traits must be an object/,
  );
  assert.throws(
    () => importPowers({ containers: "power" }),
    /Imported Trait containers must be an array/,
  );
  assert.throws(
    () => importPowers({ advantages: "trait" }),
    /Imported advantages must be an array/,
  );
});
