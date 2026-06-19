import test from "node:test";
import assert from "node:assert/strict";

import {
  createSpells,
  serializeSpells,
} from "./Spells.js";

test("creates and preserves rich spell fields", () => {
  const raw = { id: "spell-001", name: "Bola de Ácido" };

  const spells = createSpells([
    {
      id: "spell-001",
      externalIds: { gcs: "gcs-spell-001" },
      spellType: "standard",
      name: "Bola de Ácido",
      techLevel: null,
      attribute: "IQ",
      difficulty: "H",
      points: 1,
      importedLevel: 14,
      importedRelativeLevel: 1,
      importedRelativeLevelText: "IQ+1",
      colleges: ["Água"],
      powerSource: "Arcana",
      spellClass: "Projétil",
      resistance: "",
      castingCost: "1-Aptidão Mágica",
      maintenanceCost: "-",
      castingTime: "1-3 seg",
      duration: "Instantânea",
      item: "",
      baseSkill: "",
      prereqCount: 2,
      reference: "M191",
      notes: "",
      tags: ["import:gcs"],
      categories: ["Água"],
      weapons: [{ type: "ranged_weapon" }],
      features: [],
      modifiers: [],
      prereqs: { type: "prereq_list", all: true, prereqs: [] },
      study: [],
      thirdParty: { source: "translated" },
      calc: { level: 14, rsl: "IQ+1" },
      importMeta: { source: "gcs", containerIds: [] },
      raw,
    },
  ]);

  const spell = spells[0];

  assert.equal(spell.name, "Bola de Ácido");
  assert.equal(spell.attribute, "IQ");
  assert.equal(spell.difficulty, "H");
  assert.deepEqual(spell.colleges, ["Água"]);
  assert.equal(spell.spellClass, "Projétil");
  assert.equal(spell.castingCost, "1-Aptidão Mágica");
  assert.equal(spell.importedRelativeLevelText, "IQ+1");
  assert.equal(spell.weapons.length, 1);
  assert.deepEqual(spell.thirdParty, { source: "translated" });
  assert.equal(spell.raw, raw);
});

test("serializes rich spell fields", () => {
  const spells = createSpells([
    {
      id: "spell-001",
      name: "Acelerar Tempo",
      attribute: "IQ",
      difficulty: "VH",
      points: 1,
      colleges: ["Portal"],
      powerSource: "Arcana",
      spellClass: "Área",
      resistance: "Especial",
      castingCost: "Varia",
      maintenanceCost: "Varia",
      castingTime: "2 seg",
      duration: "1 min",
      reference: "M86",
      importMeta: { source: "gcs" },
      raw: { id: "spell-001" },
    },
  ]);

  const json = serializeSpells(spells);

  assert.equal(json[0].spellClass, "Área");
  assert.equal(json[0].resistance, "Especial");
  assert.equal(json[0].castingCost, "Varia");
  assert.equal(json[0].maintenanceCost, "Varia");
  assert.deepEqual(json[0].colleges, ["Portal"]);
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { id: "spell-001" });
});

test("supports ritual magic spells", () => {
  const spells = createSpells([
    {
      id: "spell-001",
      spellType: "ritualMagic",
      name: "Ritual de Proteção",
      attribute: "IQ",
      difficulty: "H",
      points: 0,
      baseSkill: "Magia Ritualística",
      colleges: ["Proteção e Aviso"],
    },
  ]);

  assert.equal(spells[0].spellType, "ritualMagic");
  assert.equal(spells[0].baseSkill, "Magia Ritualística");
});

test("rejects invalid rich spell fields", () => {
  assert.throws(() => {
    createSpells([
      {
        id: "spell-001",
        name: "Mágica Inválida",
        points: -1,
      },
    ]);
  });

  assert.throws(() => {
    createSpells([
      {
        id: "spell-001",
        name: "Mágica Inválida",
        colleges: "Água",
      },
    ]);
  });

  assert.throws(() => {
    createSpells([
      {
        id: "spell-001",
        name: "Mágica Inválida",
        spellType: "unknown",
      },
    ]);
  });
});
