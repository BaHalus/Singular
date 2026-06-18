import test from "node:test";
import assert from "node:assert/strict";

import { createTechniques } from "./Techniques.js";

import {
  addTechnique,
  removeTechnique,
  renameTechnique,
  updateTechniqueNotes,
  setTechniqueSpecialization,
  setTechniqueSkillReference,
  setTechniqueDifficulty,
  setTechniquePoints,
  setTechniqueImportedLevel,
  addTechniqueTag,
  removeTechniqueTag,
} from "./TechniquesOperations.js";

test("adds technique without mutating original", () => {
  const techniques = createTechniques();

  const updated = addTechnique(techniques, {
    id: "tech-001",
    externalIds: {},
    name: "Arm Lock",
    specialization: "",
    skillId: "skill-001",
    skillName: "Judo",
    difficulty: "H",
    points: 2,
    importedLevel: null,
    notes: "",
    tags: [],
  });

  assert.equal(techniques.length, 0);
  assert.equal(updated.length, 1);
});

test("removes technique without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock" },
  ]);

  const updated = removeTechnique(techniques, "tech-001");

  assert.equal(techniques.length, 1);
  assert.equal(updated.length, 0);
});

test("renames technique without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Old Name" },
  ]);

  const updated = renameTechnique(techniques, "tech-001", "Arm Lock");

  assert.equal(techniques[0].name, "Old Name");
  assert.equal(updated[0].name, "Arm Lock");
});

test("updates technique notes without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock", notes: "" },
  ]);

  const updated = updateTechniqueNotes(techniques, "tech-001", "Imported.");

  assert.equal(techniques[0].notes, "");
  assert.equal(updated[0].notes, "Imported.");
});

test("sets technique specialization without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock", specialization: "" },
  ]);

  const updated = setTechniqueSpecialization(techniques, "tech-001", "Axe");

  assert.equal(techniques[0].specialization, "");
  assert.equal(updated[0].specialization, "Axe");
});

test("sets technique skill reference without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock" },
  ]);

  const updated = setTechniqueSkillReference(
    techniques,
    "tech-001",
    "skill-001",
    "Judo"
  );

  assert.equal(techniques[0].skillId, null);
  assert.equal(updated[0].skillId, "skill-001");
  assert.equal(updated[0].skillName, "Judo");
});

test("sets technique difficulty without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock" },
  ]);

  const updated = setTechniqueDifficulty(techniques, "tech-001", "H");

  assert.equal(techniques[0].difficulty, null);
  assert.equal(updated[0].difficulty, "H");
});

test("sets technique points without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock", points: 1 },
  ]);

  const updated = setTechniquePoints(techniques, "tech-001", 2);

  assert.equal(techniques[0].points, 1);
  assert.equal(updated[0].points, 2);
});

test("throws on invalid technique points", () => {
  const techniques = createTechniques();

  assert.throws(() => {
    setTechniquePoints(techniques, "tech-001", -1);
  });
});

test("sets technique imported level without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock", importedLevel: null },
  ]);

  const updated = setTechniqueImportedLevel(techniques, "tech-001", 14);

  assert.equal(techniques[0].importedLevel, null);
  assert.equal(updated[0].importedLevel, 14);
});

test("throws on invalid imported level", () => {
  const techniques = createTechniques();

  assert.throws(() => {
    setTechniqueImportedLevel(techniques, "tech-001", "14");
  });
});

test("adds technique tag without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock", tags: [] },
  ]);

  const updated = addTechniqueTag(techniques, "tech-001", "combat");

  assert.deepEqual(techniques[0].tags, []);
  assert.deepEqual(updated[0].tags, ["combat"]);
});

test("does not duplicate technique tag", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock", tags: ["combat"] },
  ]);

  const updated = addTechniqueTag(techniques, "tech-001", "combat");

  assert.deepEqual(updated[0].tags, ["combat"]);
});

test("removes technique tag without mutating original", () => {
  const techniques = createTechniques([
    { id: "tech-001", name: "Arm Lock", tags: ["combat"] },
  ]);

  const updated = removeTechniqueTag(techniques, "tech-001", "combat");

  assert.deepEqual(techniques[0].tags, ["combat"]);
  assert.deepEqual(updated[0].tags, []);
});
