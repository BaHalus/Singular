import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createPowerReadProjection,
  getPowerReadProjectionSchemaVersion,
  serializePowerReadProjection,
  validatePowerReadProjection,
} from "./PowerReadProjection.js";

function character() {
  return createCharacter({
    identity: { id: "character-power-projection", name: "Super" },
    traits: [
      { id: "trait-flight", role: "advantage", name: "Voo", points: 40 },
      { id: "trait-fireball", role: "advantage", name: "Bola de Fogo", points: 5 },
      { id: "trait-talent", role: "advantage", name: "Talento Pirocinético", points: 5 },
    ],
    powers: [
      {
        id: "pyrokinesis",
        name: "Pirocinese",
        source: "Psíquica",
        powerModifier: { name: "Psíquico", valuePercent: -10, notes: "Antipsi afeta" },
        talentTraitId: "trait-talent",
        memberTraitIds: ["trait-fireball"],
        notes: "Poder de fogo",
        tags: ["psíquico", "fogo"],
      },
      {
        id: "utility-power",
        name: "Utilitário",
        memberTraitIds: [],
      },
    ],
  });
}

test("creates a portable power projection with references and diagnostics", () => {
  const projection = createPowerReadProjection(character());

  assert.equal(projection.schemaVersion, 1);
  assert.equal(getPowerReadProjectionSchemaVersion(), 1);
  assert.equal(projection.characterId, "character-power-projection");
  assert.deepEqual(projection.powers.map(power => power.id), ["pyrokinesis", "utility-power"]);
  assert.deepEqual(projection.references, [
    {
      powerId: "pyrokinesis",
      talentTraitId: "trait-talent",
      memberTraitIds: ["trait-fireball"],
    },
    {
      powerId: "utility-power",
      talentTraitId: null,
      memberTraitIds: [],
    },
  ]);
  assert.deepEqual(projection.diagnostics.map(item => item.code), [
    "power.source.empty",
    "power.memberTraits.empty",
  ]);
  assert.equal(projection.diagnostics[0].powerId, "utility-power");
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.references[0].memberTraitIds), true);
});

test("serializes as a detached portable value", () => {
  const projection = createPowerReadProjection(character());
  const serialized = serializePowerReadProjection(projection);

  assert.notEqual(serialized, projection);
  assert.notEqual(serialized.powers, projection.powers);
  assert.notEqual(serialized.references, projection.references);
  serialized.powers[0].name = "Alterado fora da projeção";
  serialized.references[0].memberTraitIds.push("trait-other");
  assert.equal(projection.powers[0].name, "Pirocinese");
  assert.deepEqual(projection.references[0].memberTraitIds, ["trait-fireball"]);
});

test("rejects malformed power projection values", () => {
  const projection = serializePowerReadProjection(createPowerReadProjection(character()));

  assert.throws(() => {
    validatePowerReadProjection({ ...projection, extra: true });
  }, /unsupported properties/);

  assert.throws(() => {
    validatePowerReadProjection({ ...projection, schemaVersion: 2 });
  }, /schemaVersion/);

  assert.throws(() => {
    validatePowerReadProjection({
      ...projection,
      references: [{ ...projection.references[0], powerId: "wrong" }, projection.references[1]],
    });
  }, /preserve power order/);

  assert.throws(() => {
    validatePowerReadProjection({
      ...projection,
      diagnostics: [{ ...projection.diagnostics[0], powerId: "missing-power" }],
    });
  }, /missing power/);
});
