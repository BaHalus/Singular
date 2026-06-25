import test from "node:test";
import assert from "node:assert/strict";

import { createPowers } from "./Powers.js";
import {
  addPower,
  addPowerMemberTrait,
  addPowerTag,
  removePower,
  removePowerMemberTrait,
  removePowerTag,
  renamePower,
  setPowerModifier,
  setPowerSource,
  setPowerTalentTrait,
  updatePowerNotes,
} from "./PowersOperations.js";

function powers() {
  return createPowers([
    {
      id: "power-fire",
      name: "Fogo",
      source: "Elemental",
      powerModifier: {
        name: "Poder do Fogo",
        valuePercent: -10,
      },
      talentTraitId: "trait-fire-talent",
      memberTraitIds: ["trait-burning-attack"],
      notes: "Original.",
      tags: ["elemental"],
    },
  ]);
}

test("adds and removes Powers without mutating the original collection", () => {
  const original = powers();
  const added = addPower(original, {
    id: "power-ice",
    name: "Gelo",
    memberTraitIds: ["trait-freezing-attack"],
  });
  const removed = removePower(added, "power-fire");

  assert.deepEqual(original.map(power => power.id), ["power-fire"]);
  assert.deepEqual(added.map(power => power.id), ["power-fire", "power-ice"]);
  assert.deepEqual(removed.map(power => power.id), ["power-ice"]);
  assert.equal(Object.isFrozen(added), true);
  assert.equal(Object.isFrozen(removed), true);
});

test("rejects duplicate Power ids when adding", () => {
  assert.throws(
    () => addPower(powers(), { id: "power-fire" }),
    /Duplicate Power id: power-fire/,
  );
});

test("renames and edits textual fields immutably", () => {
  const original = powers();
  const renamed = renamePower(original, "power-fire", "Pirocinese");
  const sourced = setPowerSource(renamed, "power-fire", "Psíquica");
  const noted = updatePowerNotes(sourced, "power-fire", "Reclassificado.");

  assert.equal(original[0].name, "Fogo");
  assert.equal(original[0].source, "Elemental");
  assert.equal(original[0].notes, "Original.");
  assert.equal(noted[0].name, "Pirocinese");
  assert.equal(noted[0].source, "Psíquica");
  assert.equal(noted[0].notes, "Reclassificado.");
});

test("sets the declared power modifier without calculating costs", () => {
  const original = powers();
  const updated = setPowerModifier(original, "power-fire", {
    name: "Poder Psíquico",
    valuePercent: -10,
    notes: "Declaração estrutural.",
  });
  const cleared = setPowerModifier(updated, "power-fire", null);

  assert.deepEqual(original[0].powerModifier, {
    name: "Poder do Fogo",
    valuePercent: -10,
    notes: "",
  });
  assert.deepEqual(updated[0].powerModifier, {
    name: "Poder Psíquico",
    valuePercent: -10,
    notes: "Declaração estrutural.",
  });
  assert.equal("points" in updated[0], false);
  assert.equal(cleared[0].powerModifier, null);
});

test("sets and clears the talent Trait reference", () => {
  const original = powers();
  const updated = setPowerTalentTrait(
    original,
    "power-fire",
    "trait-new-talent",
  );
  const cleared = setPowerTalentTrait(updated, "power-fire", null);

  assert.equal(original[0].talentTraitId, "trait-fire-talent");
  assert.equal(updated[0].talentTraitId, "trait-new-talent");
  assert.equal(cleared[0].talentTraitId, null);
});

test("adds ordered member Trait references without duplication", () => {
  const original = powers();
  const added = addPowerMemberTrait(
    original,
    "power-fire",
    "trait-control-fire",
  );
  const repeated = addPowerMemberTrait(
    added,
    "power-fire",
    "trait-control-fire",
  );

  assert.deepEqual(original[0].memberTraitIds, ["trait-burning-attack"]);
  assert.deepEqual(added[0].memberTraitIds, [
    "trait-burning-attack",
    "trait-control-fire",
  ]);
  assert.deepEqual(repeated[0].memberTraitIds, added[0].memberTraitIds);
});

test("removes member Trait references without touching other members", () => {
  const original = createPowers([
    {
      id: "power-fire",
      memberTraitIds: [
        "trait-burning-attack",
        "trait-control-fire",
      ],
    },
  ]);
  const updated = removePowerMemberTrait(
    original,
    "power-fire",
    "trait-burning-attack",
  );

  assert.deepEqual(original[0].memberTraitIds, [
    "trait-burning-attack",
    "trait-control-fire",
  ]);
  assert.deepEqual(updated[0].memberTraitIds, ["trait-control-fire"]);
});

test("adds and removes tags without duplication", () => {
  const original = powers();
  const added = addPowerTag(original, "power-fire", "combat");
  const repeated = addPowerTag(added, "power-fire", "combat");
  const removed = removePowerTag(repeated, "power-fire", "elemental");

  assert.deepEqual(original[0].tags, ["elemental"]);
  assert.deepEqual(added[0].tags, ["elemental", "combat"]);
  assert.deepEqual(repeated[0].tags, ["elemental", "combat"]);
  assert.deepEqual(removed[0].tags, ["combat"]);
});

test("validates operation inputs and delegates canonical validation", () => {
  assert.throws(
    () => renamePower(powers(), "", "Nome"),
    /Power id must be a non-empty string/,
  );
  assert.throws(
    () => setPowerSource(powers(), "power-fire", null),
    /Power source must be a string/,
  );
  assert.throws(
    () => setPowerTalentTrait(powers(), "power-fire", ""),
    /Power talentTraitId must be a non-empty string/,
  );
  assert.throws(
    () => addPowerMemberTrait(powers(), "power-fire", ""),
    /Power member Trait id must be a non-empty string/,
  );
  assert.throws(
    () => setPowerModifier(powers(), "power-fire", []),
    /powerModifier must be object or null/,
  );
});

test("operations do not create embedded Trait copies", () => {
  const updated = addPower(powers(), {
    id: "power-copy-attempt",
    memberTraitIds: ["trait-reference"],
    traits: [{ id: "trait-reference", points: 50 }],
    points: 50,
  });

  assert.equal("traits" in updated[1], false);
  assert.equal("points" in updated[1], false);
  assert.deepEqual(updated[1].memberTraitIds, ["trait-reference"]);
});
