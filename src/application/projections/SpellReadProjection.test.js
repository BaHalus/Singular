import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createSpellReadProjection,
  getSpellReadProjectionSchemaVersion,
  serializeSpellReadProjection,
  validateSpellReadProjection,
} from "./SpellReadProjection.js";

function character() {
  return createCharacter({
    identity: { id: "character-spell-projection", name: "Arquimago" },
    spells: [
      {
        id: "acid-ball",
        name: "Bola de Ácido",
        attribute: "iq",
        difficulty: "h",
        points: 1,
        colleges: ["Água"],
        powerSource: "Arcana",
        spellClass: "Projétil",
        resistance: "",
        castingCost: "1-Aptidão Mágica",
        maintenanceCost: "-",
        castingTime: "1-3 seg",
        duration: "Instantânea",
        reference: "M191",
        weapons: [{ type: "ranged_weapon", damage: { base: "1d" } }],
      },
      {
        id: "alarm",
        name: "Alarme",
        attribute: "iq",
        difficulty: "h",
        points: 1,
        colleges: ["Reconhecimento"],
        spellClass: "Comum",
        castingCost: "1",
        maintenanceCost: "-",
        castingTime: "1 seg",
        duration: "1 semana",
        reference: "M100",
      },
    ],
  });
}

test("creates a portable spell projection from canonical fields", () => {
  const projection = createSpellReadProjection(character());

  assert.equal(projection.schemaVersion, 1);
  assert.equal(getSpellReadProjectionSchemaVersion(), 1);
  assert.equal(projection.characterId, "character-spell-projection");
  assert.deepEqual(projection.spells.map(spell => spell.id), ["acid-ball", "alarm"]);
  assert.equal(projection.spells[0].castingCost, "1-Aptidão Mágica");
  assert.equal(projection.spells[0].duration, "Instantânea");
  assert.equal(projection.spells[0].resistance, "");
  assert.deepEqual(projection.spells[0].colleges, ["Água"]);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.spells[0].weapons[0]), true);
});

test("serializes as a detached portable value", () => {
  const projection = createSpellReadProjection(character());
  const serialized = serializeSpellReadProjection(projection);

  assert.notEqual(serialized, projection);
  assert.notEqual(serialized.spells, projection.spells);
  serialized.spells[0].name = "Alterado fora da projeção";
  assert.equal(projection.spells[0].name, "Bola de Ácido");
});

test("rejects malformed spell projection values", () => {
  const projection = serializeSpellReadProjection(createSpellReadProjection(character()));

  assert.throws(() => {
    validateSpellReadProjection({ ...projection, extra: true });
  }, /unsupported properties/);

  assert.throws(() => {
    validateSpellReadProjection({ ...projection, schemaVersion: 2 });
  }, /schemaVersion/);

  assert.throws(() => {
    validateSpellReadProjection({ ...projection, spells: [{ id: "broken" }] });
  }, /externalIds must be object/);
});
