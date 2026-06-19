import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";

test("imports rich GCS spells into character", () => {
  const source = {
    id: "char-001",
    profile: { name: "Mage Hero" },
    spells: [
      {
        type: "spell",
        id: "spell-001",
        name: "Bola de Ácido",
        reference: "M191",
        difficulty: "iq/h",
        college: ["Água"],
        power_source: "Arcana",
        spell_class: "Projétil",
        casting_cost: "1-Aptidão Mágica",
        maintenance_cost: "-",
        casting_time: "1-3 seg",
        duration: "Instantânea",
        points: 1,
        weapons: [{ type: "ranged_weapon", range: "20/40" }],
        prereqs: {
          type: "prereq_list",
          all: true,
          prereqs: [],
        },
        categories: ["Água"],
        calc: {
          level: 14,
          rsl: "IQ+1",
        },
      },
    ],
  };

  const snapshot = createSnapshotFromGcs(source);

  assert.equal(snapshot.spells.length, 1);
  assert.equal(snapshot.spellContainers.length, 0);
  assert.equal(snapshot.unknownSpellNodes.length, 0);

  const character = importCharacter(source);

  assert.equal(character.spells.length, 1);

  const spell = character.spells[0];

  assert.equal(spell.id, "spell-001");
  assert.equal(spell.externalIds.gcs, "spell-001");
  assert.equal(spell.name, "Bola de Ácido");
  assert.equal(spell.attribute, "IQ");
  assert.equal(spell.difficulty, "H");
  assert.equal(spell.points, 1);
  assert.equal(spell.importedLevel, 14);
  assert.equal(spell.importedRelativeLevelText, "IQ+1");
  assert.deepEqual(spell.colleges, ["Água"]);
  assert.equal(spell.spellClass, "Projétil");
  assert.equal(spell.castingCost, "1-Aptidão Mágica");
  assert.equal(spell.castingTime, "1-3 seg");
  assert.equal(spell.duration, "Instantânea");
  assert.equal(spell.weapons.length, 1);
});

test("imports nested spell containers and preserves ancestry", () => {
  const snapshot = createSnapshotFromGcs({
    id: "char-001",
    profile: { name: "Nested Mage" },
    spells: [
      {
        type: "spell_container",
        id: "container-001",
        name: "Mágicas de Ar",
        children: [
          {
            type: "spell",
            id: "spell-001",
            name: "Jato de Ar",
            difficulty: "iq/h",
            college: ["Ar"],
            power_source: "Arcana",
            spell_class: "Comum",
            casting_cost: "1-3",
            maintenance_cost: "Mesmo",
            casting_time: "1 seg",
            duration: "1 seg",
            points: 1,
          },
        ],
      },
    ],
  });

  assert.equal(snapshot.spellContainers.length, 1);
  assert.equal(snapshot.spells.length, 1);
  assert.deepEqual(snapshot.spells[0].importMeta.containerIds, ["container-001"]);
});

test("imports ritual magic spell", () => {
  const character = importCharacter({
    id: "char-001",
    profile: { name: "Ritual Mage" },
    spells: [
      {
        type: "ritual_magic_spell",
        id: "spell-001",
        name: "Ritual de Proteção",
        difficulty: "iq/h",
        college: ["Proteção e Aviso"],
        power_source: "Arcana",
        spell_class: "Comum",
        casting_cost: "3",
        maintenance_cost: "1",
        casting_time: "10 min",
        duration: "1 h",
        base_skill: "Magia Ritualística",
        points: 0,
      },
    ],
  });

  assert.equal(character.spells.length, 1);
  assert.equal(character.spells[0].spellType, "ritualMagic");
  assert.equal(character.spells[0].baseSkill, "Magia Ritualística");
});

test("preserves unknown spell nodes in snapshot", () => {
  const snapshot = createSnapshotFromGcs({
    id: "char-001",
    profile: { name: "Unknown Mage" },
    spells: [
      {
        type: "unknown_magic_node",
        id: "unknown-001",
        name: "Mágica Desconhecida",
      },
    ],
  });

  assert.deepEqual(snapshot.spells, []);
  assert.equal(snapshot.unknownSpellNodes.length, 1);
  assert.equal(snapshot.unknownSpellNodes[0].id, "unknown-001");
});
