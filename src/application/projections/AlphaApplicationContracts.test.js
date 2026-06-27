import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createAttackReadProjection,
  validateAttackReadProjection,
} from "./AttackReadProjection.js";
import {
  createEquipmentReadProjection,
  validateEquipmentReadProjection,
} from "./EquipmentReadProjection.js";
import {
  createPowerReadProjection,
  validatePowerReadProjection,
} from "./PowerReadProjection.js";
import {
  createSpellReadProjection,
  validateSpellReadProjection,
} from "./SpellReadProjection.js";

function alphaCharacter() {
  return createCharacter({
    identity: { id: "alpha-contract-character", name: "Contrato Alpha" },
    traits: [
      { id: "trait-talent", role: "advantage", name: "Talento", points: 5 },
      { id: "trait-power-member", role: "advantage", name: "Membro", points: 5 },
    ],
    equipment: [
      {
        id: "pack",
        kind: "container",
        containerKind: "physical",
        name: "Bolsa",
        quantity: 1,
        state: "carried",
        weightKg: 1,
        cost: 60,
        children: [
          {
            id: "tool",
            name: "Ferramenta",
            quantity: 1,
            state: "stored",
            weightKg: 2.5,
            cost: 20,
          },
        ],
      },
    ],
    attacks: [
      {
        id: "attack-alpha",
        name: "Ataque Alpha",
        category: "ranged",
        source: { kind: "power", id: "power-alpha" },
        damage: { value: "1d", type: "burn", authority: "declared" },
        range: "10/20",
      },
    ],
    spells: [
      {
        id: "spell-alpha",
        name: "Magia Alpha",
        attribute: "iq",
        difficulty: "h",
        points: 1,
        colleges: ["Alpha"],
        spellClass: "Comum",
        castingCost: "1",
        maintenanceCost: "1",
        castingTime: "1 seg",
        duration: "1 min",
        reference: "M1",
      },
    ],
    powers: [
      {
        id: "power-alpha",
        name: "Poder Alpha",
        source: "Fonte Alpha",
        powerModifier: { name: "Modificador", valuePercent: 50, notes: "Declarado" },
        talentTraitId: "trait-talent",
        memberTraitIds: ["trait-power-member"],
        notes: "Declarado.",
        tags: ["alpha"],
      },
    ],
  });
}

function roundTrip(value) {
  return JSON.parse(JSON.stringify(value));
}

test("alpha application read contracts are portable and detached", () => {
  const character = alphaCharacter();
  const projections = {
    attacks: createAttackReadProjection(character),
    equipment: createEquipmentReadProjection(character),
    spells: createSpellReadProjection(character),
    powers: createPowerReadProjection(character),
  };

  assert.equal(projections.attacks.characterId, "alpha-contract-character");
  assert.equal(projections.equipment.characterId, "alpha-contract-character");
  assert.equal(projections.spells.characterId, "alpha-contract-character");
  assert.equal(projections.powers.characterId, "alpha-contract-character");
  assert.equal(projections.equipment.totals.quantity, 2);
  assert.deepEqual(projections.powers.references[0].memberTraitIds, ["trait-power-member"]);
  assert.deepEqual(projections.powers.diagnostics, []);

  const serialized = roundTrip(projections);
  validateAttackReadProjection(serialized.attacks);
  validateEquipmentReadProjection(serialized.equipment);
  validateSpellReadProjection(serialized.spells);
  validatePowerReadProjection(serialized.powers);

  serialized.powers.powers[0].name = "Mudanca externa";
  serialized.equipment.equipment[0].children[0].name = "Mudanca externa";
  assert.equal(projections.powers.powers[0].name, "Poder Alpha");
  assert.equal(projections.equipment.equipment[0].children[0].name, "Ferramenta");
});
