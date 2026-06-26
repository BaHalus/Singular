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
  assert.equal(skill.techLevel, null);
  assert.equal(skill.attribute, null);
  assert.equal(skill.difficulty, null);
  assert.equal(skill.points, 0);
  assert.equal(skill.importedLevel, null);
  assert.equal(skill.importedRelativeLevel, null);
  assert.deepEqual(skill.defaults, []);
  assert.deepEqual(skill.features, []);
  assert.deepEqual(skill.weapons, []);
  assert.equal(skill.prereqs, null);
  assert.equal(skill.notes, "");
  assert.deepEqual(skill.tags, []);
  assert.equal(skill.importMeta, null);
  assert.equal(skill.raw, null);
});

test("creates skill from imported structural input", () => {
  const skill = createSkill({
    id: "skill-001",
    externalIds: { gcs: "gcs-skill-001" },
    name: "Stealth",
    specialization: "Urban",
    techLevel: "3",
    attribute: "DX",
    difficulty: "A",
    points: 2,
    importedLevel: 12,
    importedRelativeLevel: 1,
    defaults: [{ type: "attribute", name: "DX", modifier: -5 }],
    features: [{ type: "bonus", amount: 1 }],
    weapons: [{ name: "Knife", usage: "Thrown" }],
    prereqs: { all: [] },
    notes: "Imported from GCS.",
    tags: ["physical"],
    importMeta: { source: "gcs" },
    raw: { original: true },
  });

  assert.equal(skill.id, "skill-001");
  assert.equal(skill.externalIds.gcs, "gcs-skill-001");
  assert.equal(skill.name, "Stealth");
  assert.equal(skill.specialization, "Urban");
  assert.equal(skill.techLevel, "3");
  assert.equal(skill.attribute, "DX");
  assert.equal(skill.difficulty, "A");
  assert.equal(skill.points, 2);
  assert.equal(skill.importedLevel, 12);
  assert.equal(skill.importedRelativeLevel, 1);
  assert.deepEqual(skill.defaults, [
    { type: "attribute", name: "DX", modifier: -5 },
  ]);
  assert.deepEqual(skill.features, [{ type: "bonus", amount: 1 }]);
  assert.deepEqual(skill.weapons, [{ name: "Knife", usage: "Thrown" }]);
  assert.deepEqual(skill.prereqs, { all: [] });
  assert.equal(skill.notes, "Imported from GCS.");
  assert.deepEqual(skill.tags, ["physical"]);
  assert.deepEqual(skill.importMeta, { source: "gcs" });
  assert.deepEqual(skill.raw, { original: true });
});

test("validates valid skills", () => {
  const skills = createSkills();

  assert.equal(validateSkills(skills), true);
});

test("serializes skills without calculating levels", () => {
  const skills = createSkills([
    {
      id: "skill-001",
      externalIds: { gcs: "gcs-skill-001" },
      name: "Stealth",
      specialization: "Urban",
      techLevel: "3",
      attribute: "DX",
      difficulty: "A",
      points: 2,
      importedLevel: 12,
      importedRelativeLevel: 1,
      defaults: [{ type: "attribute", name: "DX", modifier: -5 }],
      features: [{ type: "bonus", amount: 1 }],
      weapons: [{ name: "Knife", usage: "Thrown" }],
      prereqs: { all: [] },
      notes: "Imported from GCS.",
      tags: ["physical"],
      importMeta: { source: "gcs" },
      raw: { original: true },
    },
  ]);

  const json = serializeSkills(skills);

  assert.deepEqual(json, [
    {
      id: "skill-001",
      externalIds: { gcs: "gcs-skill-001" },
      name: "Stealth",
      specialization: "Urban",
      techLevel: "3",
      attribute: "DX",
      difficulty: "A",
      points: 2,
      importedLevel: 12,
      importedRelativeLevel: 1,
      defaults: [{ type: "attribute", name: "DX", modifier: -5 }],
      features: [{ type: "bonus", amount: 1 }],
      weapons: [{ name: "Knife", usage: "Thrown" }],
      prereqs: { all: [] },
      notes: "Imported from GCS.",
      tags: ["physical"],
      importMeta: { source: "gcs" },
      raw: { original: true },
    },
  ]);
});

test("throws when skills is not array", () => {
  assert.throws(() => {
    createSkills("Stealth");
  });
});

test("throws when skill externalIds is invalid", () => {
  assert.throws(() => {
    createSkills([
      {
        id: "skill-001",
        externalIds: "gcs-skill-001",
        name: "Stealth",
      },
    ]);
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

test("throws when skill imported numeric fields are invalid", () => {
  assert.throws(() => {
    createSkills([
      {
        id: "skill-001",
        name: "Stealth",
        importedLevel: "12",
      },
    ]);
  });

  assert.throws(() => {
    createSkills([
      {
        id: "skill-001",
        name: "Stealth",
        importedRelativeLevel: "1",
      },
    ]);
  });
});

test("throws when skill structural collections are invalid", () => {
  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", defaults: {} }]);
  });

  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", features: {} }]);
  });

  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", weapons: {} }]);
  });

  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", tags: "physical" }]);
  });
});

test("throws when skill metadata objects are invalid", () => {
  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", prereqs: [] }]);
  });

  assert.throws(() => {
    createSkills([{ id: "skill-001", name: "Stealth", importMeta: [] }]);
  });
});
