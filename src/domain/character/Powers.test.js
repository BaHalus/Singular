import test from "node:test";
import assert from "node:assert/strict";

import {
  createPower,
  createPowers,
  serializePower,
  serializePowers,
  validatePower,
  validatePowers,
} from "./Powers.js";

test("creates the canonical empty Powers collection", () => {
  const powers = createPowers();

  assert.deepEqual(powers, []);
  assert.equal(validatePowers(powers), true);
  assert.equal(Object.isFrozen(powers), true);
});

test("creates a canonical Power without duplicating Traits", () => {
  const source = {
    id: "power-fire",
    externalIds: { gcs: "gcs-power-fire" },
    name: "Poder do Fogo",
    source: "Fogo",
    powerModifier: {
      name: "Poder do Fogo",
      valuePercent: -10,
      notes: "Fonte elemental.",
    },
    talentTraitId: "trait-fire-talent",
    memberTraitIds: [
      "trait-burning-attack",
      "trait-control-fire",
    ],
    notes: "Agrupamento canônico.",
    tags: ["elemental", "power"],
    importMeta: {
      source: "gcs",
      containerIds: ["container-fire"],
    },
    raw: {
      original: true,
      nested: ["preserved"],
    },
    points: 50,
    traits: [{ id: "duplicated-trait" }],
  };

  const power = createPower(source);

  source.externalIds.gcs = "mutated";
  source.memberTraitIds.push("trait-mutated");
  source.powerModifier.valuePercent = -20;
  source.importMeta.containerIds.push("mutated");
  source.raw.nested.push("mutated");

  assert.deepEqual(power, {
    id: "power-fire",
    externalIds: { gcs: "gcs-power-fire" },
    name: "Poder do Fogo",
    source: "Fogo",
    powerModifier: {
      name: "Poder do Fogo",
      valuePercent: -10,
      notes: "Fonte elemental.",
    },
    talentTraitId: "trait-fire-talent",
    memberTraitIds: [
      "trait-burning-attack",
      "trait-control-fire",
    ],
    notes: "Agrupamento canônico.",
    tags: ["elemental", "power"],
    importMeta: {
      source: "gcs",
      containerIds: ["container-fire"],
    },
    raw: {
      original: true,
      nested: ["preserved"],
    },
  });
  assert.equal("points" in power, false);
  assert.equal("traits" in power, false);
  assert.equal(validatePower(power), true);
  assert.equal(Object.isFrozen(power), true);
  assert.equal(Object.isFrozen(power.memberTraitIds), true);
  assert.equal(Object.isFrozen(power.powerModifier), true);
});

test("applies safe structural defaults", () => {
  const power = createPower({ id: "power-empty" });

  assert.deepEqual(power, {
    id: "power-empty",
    externalIds: {},
    name: "",
    source: "",
    powerModifier: null,
    talentTraitId: null,
    memberTraitIds: [],
    notes: "",
    tags: [],
    importMeta: null,
    raw: null,
  });
});

test("serializes detached Power snapshots", () => {
  const powers = createPowers([
    {
      id: "power-psionic",
      name: "Telepatia",
      source: "Psíquica",
      powerModifier: {
        name: "Psíquico",
        valuePercent: -10,
      },
      memberTraitIds: ["trait-mind-reading"],
      raw: { imported: true },
    },
  ]);

  const serializedCollection = serializePowers(powers);
  const serializedPower = serializePower(powers[0]);

  serializedCollection[0].memberTraitIds.push("copy-only");
  serializedPower.raw.imported = false;

  assert.deepEqual(powers[0].memberTraitIds, ["trait-mind-reading"]);
  assert.deepEqual(powers[0].raw, { imported: true });
  assert.equal(serializedPower.powerModifier.notes, "");
});

test("rejects invalid collection and Power shapes", () => {
  assert.throws(
    () => createPowers("power-fire"),
    /Powers must be an array/,
  );
  assert.throws(
    () => createPower([]),
    /Power must be an object/,
  );
  assert.throws(
    () => createPower({ id: " " }),
    /Power id must be a non-empty string/,
  );
  assert.throws(
    () => createPower({ id: "power", memberTraitIds: "trait" }),
    /memberTraitIds must be an array/,
  );
  assert.throws(
    () => createPower({ id: "power", talentTraitId: "" }),
    /talentTraitId must be a non-empty string/,
  );
  assert.throws(
    () => createPower({ id: "power", tags: [1] }),
    /Power tags\[0\] must be a string/,
  );
});

test("rejects duplicate Power and member Trait ids", () => {
  assert.throws(
    () => createPowers([
      { id: "power-duplicate" },
      { id: "power-duplicate" },
    ]),
    /Duplicate Power id: power-duplicate/,
  );

  assert.throws(
    () => createPower({
      id: "power-fire",
      memberTraitIds: ["trait-fire", "trait-fire"],
    }),
    /memberTraitIds must not contain duplicates/,
  );
});

test("validates power modifier without applying it mechanically", () => {
  const power = createPower({
    id: "power-divine",
    powerModifier: {
      name: "Divino",
      valuePercent: -10,
    },
  });

  assert.deepEqual(power.powerModifier, {
    name: "Divino",
    valuePercent: -10,
    notes: "",
  });
  assert.equal("calculatedPoints" in power.powerModifier, false);

  assert.throws(
    () => createPower({ id: "power", powerModifier: [] }),
    /powerModifier must be object or null/,
  );
  assert.throws(
    () => createPower({
      id: "power",
      powerModifier: { valuePercent: Number.NaN },
    }),
    /valuePercent must be a finite number or null/,
  );
});

test("rejects cyclic preserved values", () => {
  const raw = {};
  raw.self = raw;

  assert.throws(
    () => createPower({ id: "power-cycle", raw }),
    /Power values must not contain cycles/,
  );
});
