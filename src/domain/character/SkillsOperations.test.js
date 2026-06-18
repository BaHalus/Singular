import test from "node:test";
import assert from "node:assert/strict";

import { createSkills } from "./Skills.js";

import {
  addSkill,
  removeSkill,
  renameSkill,
  updateSkillNotes,
  setSkillSpecialization,
  setSkillBase,
  setSkillPoints,
  setSkillImportedLevel,
  addSkillTag,
  removeSkillTag,
} from "./SkillsOperations.js";

test("adds skill without mutating original", () => {
  const skills = createSkills();

  const updated = addSkill(skills, {
    id: "skill-001",
    externalIds: {},
    name: "Stealth",
    specialization: "",
    attribute: "DX",
    difficulty: "A",
    points: 2,
    importedLevel: null,
    notes: "",
    tags: [],
  });

  assert.equal(skills.length, 0);
  assert.equal(updated.length, 1);
});

test("removes skill without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth" },
  ]);

  const updated = removeSkill(skills, "skill-001");

  assert.equal(skills.length, 1);
  assert.equal(updated.length, 0);
});

test("renames skill without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Old Name" },
  ]);

  const updated = renameSkill(skills, "skill-001", "Stealth");

  assert.equal(skills[0].name, "Old Name");
  assert.equal(updated[0].name, "Stealth");
});

test("updates skill notes without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth", notes: "" },
  ]);

  const updated = updateSkillNotes(skills, "skill-001", "Imported.");

  assert.equal(skills[0].notes, "");
  assert.equal(updated[0].notes, "Imported.");
});

test("sets skill specialization without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Area Knowledge", specialization: "" },
  ]);

  const updated = setSkillSpecialization(skills, "skill-001", "Belém");

  assert.equal(skills[0].specialization, "");
  assert.equal(updated[0].specialization, "Belém");
});

test("sets skill base without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth" },
  ]);

  const updated = setSkillBase(skills, "skill-001", "DX", "A");

  assert.equal(skills[0].attribute, null);
  assert.equal(updated[0].attribute, "DX");
  assert.equal(updated[0].difficulty, "A");
});

test("sets skill points without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth", points: 1 },
  ]);

  const updated = setSkillPoints(skills, "skill-001", 2);

  assert.equal(skills[0].points, 1);
  assert.equal(updated[0].points, 2);
});

test("throws on invalid skill points", () => {
  const skills = createSkills();

  assert.throws(() => {
    setSkillPoints(skills, "skill-001", -1);
  });
});

test("sets skill imported level without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth", importedLevel: null },
  ]);

  const updated = setSkillImportedLevel(skills, "skill-001", 12);

  assert.equal(skills[0].importedLevel, null);
  assert.equal(updated[0].importedLevel, 12);
});

test("throws on invalid imported level", () => {
  const skills = createSkills();

  assert.throws(() => {
    setSkillImportedLevel(skills, "skill-001", "12");
  });
});

test("adds skill tag without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth", tags: [] },
  ]);

  const updated = addSkillTag(skills, "skill-001", "physical");

  assert.deepEqual(skills[0].tags, []);
  assert.deepEqual(updated[0].tags, ["physical"]);
});

test("does not duplicate skill tag", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth", tags: ["physical"] },
  ]);

  const updated = addSkillTag(skills, "skill-001", "physical");

  assert.deepEqual(updated[0].tags, ["physical"]);
});

test("removes skill tag without mutating original", () => {
  const skills = createSkills([
    { id: "skill-001", name: "Stealth", tags: ["physical"] },
  ]);

  const updated = removeSkillTag(skills, "skill-001", "physical");

  assert.deepEqual(skills[0].tags, ["physical"]);
  assert.deepEqual(updated[0].tags, []);
});
