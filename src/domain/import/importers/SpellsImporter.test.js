import test from "node:test";
import assert from "node:assert/strict";

import { importSpells } from "./SpellsImporter.js";

test("imports spell list row using the real GCS library schema", () => {
  const raw = {
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
    weapons: [
      {
        type: "ranged_weapon",
        range: "20/40",
      },
    ],
    prereqs: {
      type: "prereq_list",
      all: true,
      prereqs: [],
    },
    categories: ["Água"],
  };

  const result = importSpells({
    type: "spell_list",
    version: 2,
    rows: [raw],
  });

  assert.equal(result.spells.length, 1);
  assert.equal(result.containers.length, 0);
  assert.equal(result.unknownNodes.length, 0);

  const spell = result.spells[0];

  assert.equal(spell.id, "spell-001");
  assert.equal(spell.externalIds.gcs, "spell-001");
  assert.equal(spell.spellType, "standard");
  assert.equal(spell.name, "Bola de Ácido");
  assert.equal(spell.attribute, "IQ");
  assert.equal(spell.difficulty, "H");
  assert.equal(spell.points, 1);
  assert.deepEqual(spell.colleges, ["Água"]);
  assert.equal(spell.powerSource, "Arcana");
  assert.equal(spell.spellClass, "Projétil");
  assert.equal(spell.castingCost, "1-Aptidão Mágica");
  assert.equal(spell.maintenanceCost, "-");
  assert.equal(spell.castingTime, "1-3 seg");
  assert.equal(spell.duration, "Instantânea");
  assert.equal(spell.reference, "M191");
  assert.equal(spell.weapons.length, 1);
  assert.deepEqual(spell.prereqs, raw.prereqs);
  assert.deepEqual(spell.categories, ["Água"]);
  assert.equal(spell.raw, raw);
});

test("preserves resistance and variable textual costs", () => {
  const result = importSpells([
    {
      type: "spell",
      id: "spell-001",
      name: "Acelerar Tempo",
      difficulty: "iq/vh",
      college: ["Portal"],
      power_source: "Arcana",
      spell_class: "Área",
      resist: "Especial",
      casting_cost: "Varia",
      maintenance_cost: "Varia",
      casting_time: "2 seg",
      duration: "1 min",
      points: 1,
    },
  ]);

  const spell = result.spells[0];

  assert.equal(spell.difficulty, "VH");
  assert.equal(spell.resistance, "Especial");
  assert.equal(spell.castingCost, "Varia");
  assert.equal(spell.maintenanceCost, "Varia");
});

test("imports calculated level and relative level text from character data", () => {
  const result = importSpells([
    {
      type: "spell",
      id: "spell-001",
      name: "Alarme",
      difficulty: "iq/h",
      college: ["Reconhecimento"],
      points: 2,
      calc: {
        level: 15,
        rsl: "IQ+2",
        resolved_notes: "Nota resolvida.",
      },
    },
  ]);

  const spell = result.spells[0];

  assert.equal(spell.importedLevel, 15);
  assert.equal(spell.importedRelativeLevel, null);
  assert.equal(spell.importedRelativeLevelText, "IQ+2");
  assert.equal(spell.notes, "Nota resolvida.");
  assert.deepEqual(spell.calc, {
    level: 15,
    rsl: "IQ+2",
    resolved_notes: "Nota resolvida.",
  });
});

test("imports numeric relative level when available", () => {
  const result = importSpells([
    {
      type: "spell",
      id: "spell-001",
      name: "Alarme",
      difficulty: "iq/h",
      points: "2",
      relative_level: "2",
      prereq_count: "3",
    },
  ]);

  const spell = result.spells[0];

  assert.equal(spell.points, 2);
  assert.equal(spell.importedRelativeLevel, 2);
  assert.equal(spell.importedRelativeLevelText, null);
  assert.equal(spell.prereqCount, 3);
});

test("imports ritual magic spell and base skill", () => {
  const result = importSpells([
    {
      type: "ritual_magic_spell",
      id: "spell-001",
      name: "Ritual de Proteção",
      difficulty: "iq/h",
      college: "Proteção e Aviso",
      base_skill: "Magia Ritualística",
      points: 0,
    },
  ]);

  const spell = result.spells[0];

  assert.equal(spell.spellType, "ritualMagic");
  assert.deepEqual(spell.colleges, ["Proteção e Aviso"]);
  assert.equal(spell.baseSkill, "Magia Ritualística");
});

test("imports spell containers recursively", () => {
  const result = importSpells([
    {
      type: "spell_container",
      id: "container-001",
      name: "Mágicas de Água",
      children: [
        {
          type: "spell",
          id: "spell-001",
          name: "Criar Água",
          difficulty: "iq/h",
          college: ["Água"],
          points: 1,
        },
      ],
    },
  ]);

  assert.equal(result.containers.length, 1);
  assert.equal(result.spells.length, 1);
  assert.deepEqual(result.spells[0].importMeta.containerIds, ["container-001"]);
});

test("preserves optional library fields", () => {
  const raw = {
    type: "spell",
    id: "spell-001",
    name: "Animar Máquina",
    difficulty: "iq/vh",
    tech_level: "9",
    college: ["Máquina", "Tecnológica"],
    power_source: "Arcana",
    spell_class: "Comum",
    resist: "Vontade",
    casting_cost: "Varia",
    maintenance_cost: "Metade",
    casting_time: "seg=custo",
    duration: "1 min",
    item: "Item encantado",
    base_skill: "Magia Ritualística",
    points: 1,
    notes: "Nota da mágica.",
    tags: ["Tecnológica"],
    features: [{ type: "spell_bonus", amount: 1 }],
    modifiers: [{ name: "Modificador" }],
    study: [{ hours: 100 }],
    third_party: { translator: "SINGULAR" },
  };

  const spell = importSpells([raw]).spells[0];

  assert.equal(spell.techLevel, "9");
  assert.equal(spell.item, "Item encantado");
  assert.equal(spell.baseSkill, "Magia Ritualística");
  assert.equal(spell.notes, "Nota da mágica.");
  assert.equal(spell.features.length, 1);
  assert.equal(spell.modifiers.length, 1);
  assert.equal(spell.study.length, 1);
  assert.deepEqual(spell.thirdParty, { translator: "SINGULAR" });
  assert.ok(spell.tags.includes("import:gcs"));
});

test("preserves unknown spell nodes separately", () => {
  const result = importSpells([
    {
      type: "unknown_magic_node",
      id: "unknown-001",
      name: "Desconhecida",
    },
  ]);

  assert.deepEqual(result.spells, []);
  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.unknownNodes[0].id, "unknown-001");
});

test("rejects invalid spell source and fields", () => {
  assert.throws(() => {
    importSpells("spells");
  });

  assert.throws(() => {
    importSpells(["spell"]);
  });

  assert.throws(() => {
    importSpells([
      {
        type: "spell",
        name: "Mágica Inválida",
        points: -1,
      },
    ]);
  });

  assert.throws(() => {
    importSpells([
      {
        type: "spell",
        name: "Mágica Inválida",
        college: {},
      },
    ]);
  });
});
