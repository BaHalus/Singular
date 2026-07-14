import test from "node:test";
import assert from "node:assert/strict";

import {
  createAdvantages,
  serializeAdvantages,
} from "./Advantages.js";

import { createPerks } from "./Perks.js";
import { createDisadvantages } from "./Disadvantages.js";
import { createQuirks } from "./Quirks.js";
import {
  createTraitRecord,
  serializeTraitRecord,
} from "./TraitFields.js";

test("preserves rich GCS trait fields in advantages", () => {
  const raw = { id: "adv-001", name: "Ataque Inato" };

  const advantages = createAdvantages([
    {
      id: "adv-001",
      externalIds: { gcs: "gcs-adv-001" },
      name: "Ataque Inato",
      notes: "Imported attack advantage.",
      tags: ["Vantagem", "import:gcs"],
      points: 20,
      levels: 2,
      modifiers: [{ name: "Poder", cost: -10 }],
      features: [{ type: "skill_bonus", amount: 1 }],
      weapons: [{ type: "ranged_weapon" }],
      prereqs: { type: "trait_prereq" },
      importMeta: { source: "gcs", containerIds: ["power-001"] },
      power: { groupId: "power-fire", source: "Fogo" },
      alternateGroupId: "aa-fire",
      isPrimaryAlternative: true,
      raw,
    },
  ]);

  const advantage = advantages[0];

  assert.equal(advantage.points, 20);
  assert.equal(advantage.levels, 2);
  assert.deepEqual(advantage.modifiers, [{ name: "Poder", cost: -10 }]);
  assert.deepEqual(advantage.features, [{ type: "skill_bonus", amount: 1 }]);
  assert.deepEqual(advantage.weapons, [{ type: "ranged_weapon" }]);
  assert.deepEqual(advantage.prereqs, { type: "trait_prereq" });
  assert.deepEqual(advantage.importMeta, { source: "gcs", containerIds: ["power-001"] });
  assert.deepEqual(advantage.power, { groupId: "power-fire", source: "Fogo" });
  assert.equal(advantage.alternateGroupId, "aa-fire");
  assert.equal(advantage.isPrimaryAlternative, true);
  assert.equal(advantage.raw, raw);
});

test("serializes rich GCS trait fields", () => {
  const advantages = createAdvantages([
    {
      id: "adv-001",
      name: "Ataque Inato",
      points: 20,
      modifiers: [{ name: "Poder", cost: -10 }],
      features: [{ type: "skill_bonus", amount: 1 }],
      weapons: [{ type: "ranged_weapon" }],
      importMeta: { source: "gcs" },
      raw: { id: "adv-001" },
    },
  ]);

  const json = serializeAdvantages(advantages);

  assert.equal(json[0].points, 20);
  assert.deepEqual(json[0].modifiers, [{ name: "Poder", cost: -10 }]);
  assert.deepEqual(json[0].features, [{ type: "skill_bonus", amount: 1 }]);
  assert.deepEqual(json[0].weapons, [{ type: "ranged_weapon" }]);
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { id: "adv-001" });
});

test("all trait buckets accept rich fields", () => {
  const input = {
    id: "trait-001",
    name: "Imported Trait",
    points: 1,
    modifiers: [],
    features: [],
    weapons: [],
    importMeta: { source: "gcs" },
    raw: { id: "trait-001" },
  };

  assert.equal(createPerks([input])[0].points, 1);
  assert.equal(createDisadvantages([{ ...input, points: -10 }])[0].points, -10);
  assert.equal(createQuirks([{ ...input, points: -1 }])[0].points, -1);
});

test("rejects invalid rich trait fields", () => {
  assert.throws(() => {
    createAdvantages([
      {
        id: "adv-001",
        name: "Invalid",
        modifiers: "bad",
      },
    ]);
  });

  assert.throws(() => {
    createAdvantages([
      {
        id: "adv-001",
        name: "Invalid",
        importMeta: [],
      },
    ]);
  });
});

test("rejects cyclic rich fields instead of creating cyclic snapshots", () => {
  const raw = { source: "gcs" };
  raw.self = raw;
  const trait = createTraitRecord(
    { id: "trait-cycle", name: "Cycle", raw },
    () => "unused",
  );

  assert.throws(
    () => serializeTraitRecord(trait, "Trait"),
    /Trait raw\.self must not contain cycles/,
  );
});

test("rejects unsupported rich field object types instead of erasing them", () => {
  const trait = createTraitRecord(
    { id: "trait-date", name: "Date", raw: new Date("2026-07-14T00:00:00Z") },
    () => "unused",
  );

  assert.throws(
    () => serializeTraitRecord(trait, "Trait"),
    /Trait raw must be JSON portable/,
  );
});

test("rejects sparse rich field arrays instead of silently normalizing them", () => {
  const sparse = [];
  sparse[1] = "gcs-id";
  const trait = createTraitRecord(
    {
      id: "trait-sparse",
      name: "Sparse",
      externalIds: { aliases: sparse },
    },
    () => "unused",
  );

  assert.throws(
    () => serializeTraitRecord(trait, "Trait"),
    /Trait externalIds\.aliases must be a dense JSON array/,
  );
});
