import test from "node:test";
import assert from "node:assert/strict";

import { createSpells } from "./Spells.js";

import {
  addSpell,
  removeSpell,
  renameSpell,
  updateSpellNotes,
  setSpellBase,
  setSpellPoints,
  setSpellImportedLevel,
  addSpellTag,
  removeSpellTag,
} from "./SpellsOperations.js";

test("adds spell without mutating original", () => {
  const spells = createSpells();

  const updated = addSpell(spells, {
    id: "spell-001",
    externalIds: {},
    spellType: "standard",
    name: "Bola de Ácido",
    attribute: "IQ",
    difficulty: "H",
    points: 1,
    importedLevel: null,
    notes: "",
    tags: [],
  });

  assert.equal(spells.length, 0);
  assert.equal(updated.length, 1);
});

test("removes spell without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido" },
  ]);

  const updated = removeSpell(spells, "spell-001");

  assert.equal(spells.length, 1);
  assert.equal(updated.length, 0);
});

test("renames spell without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Nome Antigo" },
  ]);

  const updated = renameSpell(spells, "spell-001", "Bola de Ácido");

  assert.equal(spells[0].name, "Nome Antigo");
  assert.equal(updated[0].name, "Bola de Ácido");
});

test("updates spell notes without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido", notes: "" },
  ]);

  const updated = updateSpellNotes(spells, "spell-001", "Importada.");

  assert.equal(spells[0].notes, "");
  assert.equal(updated[0].notes, "Importada.");
});

test("sets spell base without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido" },
  ]);

  const updated = setSpellBase(spells, "spell-001", "IQ", "H");

  assert.equal(spells[0].attribute, null);
  assert.equal(spells[0].difficulty, null);
  assert.equal(updated[0].attribute, "IQ");
  assert.equal(updated[0].difficulty, "H");
});

test("sets spell points without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido", points: 1 },
  ]);

  const updated = setSpellPoints(spells, "spell-001", 2);

  assert.equal(spells[0].points, 1);
  assert.equal(updated[0].points, 2);
});

test("rejects invalid spell points", () => {
  const spells = createSpells();

  assert.throws(
    () => setSpellPoints(spells, "spell-001", -1),
    /Spell points must be non-negative number/,
  );
  assert.throws(
    () => setSpellPoints(spells, "spell-001", Number.NaN),
    /Spell points must be non-negative number/,
  );
});

test("sets spell imported level without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido", importedLevel: null },
  ]);

  const updated = setSpellImportedLevel(spells, "spell-001", 14);

  assert.equal(spells[0].importedLevel, null);
  assert.equal(updated[0].importedLevel, 14);
});

test("rejects invalid imported level", () => {
  const spells = createSpells();

  assert.throws(
    () => setSpellImportedLevel(spells, "spell-001", "14"),
    /Spell importedLevel must be number or null/,
  );
  assert.throws(
    () => setSpellImportedLevel(spells, "spell-001", Number.NaN),
    /Spell importedLevel must be number or null/,
  );
});

test("adds spell tag without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido", tags: [] },
  ]);

  const updated = addSpellTag(spells, "spell-001", "combat");

  assert.deepEqual(spells[0].tags, []);
  assert.deepEqual(updated[0].tags, ["combat"]);
});

test("does not duplicate spell tag", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido", tags: ["combat"] },
  ]);

  const updated = addSpellTag(spells, "spell-001", "combat");

  assert.deepEqual(updated[0].tags, ["combat"]);
});

test("removes spell tag without mutating original", () => {
  const spells = createSpells([
    { id: "spell-001", name: "Bola de Ácido", tags: ["combat"] },
  ]);

  const updated = removeSpellTag(spells, "spell-001", "combat");

  assert.deepEqual(spells[0].tags, ["combat"]);
  assert.deepEqual(updated[0].tags, []);
});
