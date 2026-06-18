import test from "node:test";
import assert from "node:assert/strict";

import {
  createSkills,
  createSkill,
  validateSkills,
  serializeSkills,
} from "./Skills.js";

test("creates empty skills list", () => {
  const skills = createSkills();

  assert.deepEqual(skills, []);
});

test("creates skill with defaults", () => {
  const skill = createSkill();

  assert.ok(skill.id);
  assert.deepEqual(skill.externalIds, {});
  assert.equal(skill.name, "");
  assert.equal(skill.specialization, "");
  assert.equal(skill.attribute, null);
  assert.equal(skill.difficulty, null);
  assert.equal(skill.points, 0);
  assert.equal(skill.importedLevel, null);
  assert.equal(skill.notes, "");
  assert.deepEqual(skill.tags, []);
});

test("creates skill from input", () => {
  const skill = createSkill({
    id: "skill-001",
    externalIds: { gcs: "gcs-skill-001" },
    name: "Stealth",
    specialization: "Urban",
    attribute: "DX",
    difficulty: "A",
    points: 2,
    importedLevel: 12,
    notes: "Imported from GCS.",
    tags: ["physical"],
  });

  assert.equal(skill.id, "skill-001");
  assert.equal(skill.externalIds.gcs, "gcs-skill-001");
  assert.equal(skill.name, "Stealth");
  assert.equal(skill.specialization, "Urban");
  assert.equal(skill.attribute, "DX");
  assert.equal(skill.difficulty, "A");
  assert.equal(skill.points, 2);
  assert.equal(skill.importedLevel, 12);
  assert.deepEqual(skill.tags, ["physical"]);
});

test("validates valid skills", () => {
  const skills = createSkills();

  assert.equal(validateSkills(skills), true);
});

test("serializes skills", () => {
  const skills = createSkills([
    {
      id: "skill-001",
      externalIds: { gcs: "gcs-skill-001" },
      name: "Stealth",
      attribute: "DX",
      difficulty: "A",
      points: 2,
      importedLevel: 12,
      tags: ["physical"],
    },
  ]);

  const json = serializeSkills(skills);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "skill-001");
  assert.equal(json[0].externalIds.gcs, "gcs-skill-001");
  assert.equal(json[0].name, "Stealth");
  assert.equal(json[0].importedLevel, 12);
});

test("throws when skills is not array", () => {
  assert.throws(() => {
    createSkills("Stealth");
  });
});

test("throws when skill externalIds is invalid", () => {
  assert.throws(() => {
    createSkills([{ id: "skill-001", externalIds: "gcs-skill-001", name: "Stealth" }]);
  });
});

test("throws when skill name is invalid", () => {
  assert.throws(() => {
    createSkills([{ id: "skill-001", name: 123 }]);
  });
});

test("throws when skill points is invalid", () => {
  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", points: -1 }]);
  });
});

test("throws when skill importedLevel is invalid", () => {
  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", importedLevel: "12" }]);
  });
});

test("throws when skill tags is invalid", () => {
  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", tags: "physical" }]);
  });
});
