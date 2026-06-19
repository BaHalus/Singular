import test from "node:test";
import assert from "node:assert/strict";

import { importTraits } from "./TraitsImporter.js";

test("imports trait roles into character trait buckets", () => {
  const result = importTraits({
    rows: [
      {
        id: "adv-001",
        name: "Reflexos em Combate",
        base_points: 15,
        tags: ["Vantagem"],
      },
      {
        id: "perk-001",
        name: "Acessório",
        base_points: 1,
        tags: ["Qualidade"],
      },
      {
        id: "disadv-001",
        name: "Mau Humor",
        base_points: -10,
        tags: ["Desvantagem"],
      },
      {
        id: "quirk-001",
        name: "Hábito Menor",
        base_points: -1,
        tags: ["Peculiaridade"],
      },
    ],
  });

  assert.equal(result.advantages.length, 1);
  assert.equal(result.perks.length, 1);
  assert.equal(result.disadvantages.length, 1);
  assert.equal(result.quirks.length, 1);

  assert.equal(result.advantages[0].name, "Reflexos em Combate");
  assert.equal(result.perks[0].name, "Acessório");
  assert.equal(result.disadvantages[0].name, "Mau Humor");
  assert.equal(result.quirks[0].name, "Hábito Menor");
});

test("preserves rich trait data", () => {
  const raw = {
    id: "adv-001",
    name: "Ataque Inato",
    base_points: 20,
    tags: ["Vantagem"],
    modifiers: [{ name: "Poder", cost: -10 }],
    features: [{ type: "skill_bonus", amount: 1 }],
    weapons: [{ type: "ranged_weapon" }],
    prereqs: { type: "trait_prereq" },
  };

  const result = importTraits([raw]);
  const trait = result.advantages[0];

  assert.deepEqual(trait.modifiers, raw.modifiers);
  assert.deepEqual(trait.features, raw.features);
  assert.deepEqual(trait.weapons, raw.weapons);
  assert.deepEqual(trait.prereqs, raw.prereqs);
  assert.equal(trait.raw, raw);
});

test("imports children of semantic containers", () => {
  const result = importTraits({
    rows: [
      {
        id: "race-001",
        type: "trait_container",
        name: "Raça",
        children: [
          {
            id: "adv-001",
            name: "Visão Noturna",
            base_points: 1,
            tags: ["Vantagem"],
          },
        ],
      },
    ],
  });

  assert.equal(result.containers.length, 1);
  assert.equal(result.containers[0].containerType, "race");
  assert.equal(result.advantages.length, 1);
  assert.deepEqual(result.advantages[0].importMeta.containerIds, ["race-001"]);
});

test("preserves unknown nodes", () => {
  const result = importTraits({
    rows: [
      {
        id: "unknown-001",
        name: "Sem classificação",
      },
    ],
  });

  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.unknownNodes[0].id, "unknown-001");
  assert.equal(result.unknownNodes[0].nodeKind, "unknown");
});

test("accepts already normalized trait tree", () => {
  const result = importTraits([
    {
      id: "adv-001",
      externalIds: { gcs: "adv-001" },
      nodeKind: "trait",
      containerType: null,
      name: "Reflexos em Combate",
      points: 15,
      levels: null,
      role: "advantage",
      modifiers: [],
      features: [],
      weapons: [],
      prereqs: null,
      tags: ["Vantagem"],
      children: [],
      raw: { id: "adv-001" },
    },
  ]);

  assert.equal(result.advantages.length, 1);
  assert.equal(result.advantages[0].externalIds.gcs, "adv-001");
});

test("adds import tags", () => {
  const result = importTraits({
    rows: [
      {
        id: "adv-001",
        name: "Reflexos em Combate",
        base_points: 15,
        tags: ["Vantagem"],
      },
    ],
  });

  assert.ok(result.advantages[0].tags.includes("import:gcs"));
  assert.ok(result.advantages[0].tags.includes("node:trait"));
  assert.ok(result.advantages[0].tags.includes("role:advantage"));
});
