import test from "node:test";
import assert from "node:assert/strict";

import {
  createSkills,
  serializeSkills,
} from "./Skills.js";

test("preserves rich imported skill fields", () => {
  const raw = { id: "skill-001", name: "Furtividade" };

  const skills = createSkills([
    {
      id: "skill-001",
      externalIds: { gcs: "gcs-skill-001" },
      name: "Furtividade",
      specialization: "Urbana",
      techLevel: "3",
      attribute: "DX",
      difficulty: "A",
      points: 4,
      importedLevel: 13,
      importedRelativeLevel: 1,
      defaults: [{ type: "skill", name: "Camuflagem", modifier: -4 }],
      features: [{ type: "skill_bonus", amount: 1 }],
      weapons: [{ type: "melee_weapon" }],
      prereqs: { type: "skill_prereq" },
      notes: "Importada do GCS.",
      tags: ["Física", "import:gcs"],
      importMeta: { source: "gcs", containerIds: ["container-001"] },
      raw,
    },
  ]);

  const skill = skills[0];

  assert.equal(skill.techLevel, "3");
  assert.equal(skill.importedRelativeLevel, 1);
  assert.equal(skill.defaults.length, 1);
  assert.equal(skill.features.length, 1);
  assert.equal(skill.weapons.length, 1);
  assert.deepEqual(skill.prereqs, { type: "skill_prereq" });
  assert.deepEqual(skill.importMeta, {
    source: "gcs",
    containerIds: ["container-001"],
  });
  assert.equal(skill.raw, raw);
});

test("serializes rich imported skill fields", () => {
  const skills = createSkills([
    {
      id: "skill-001",
      name: "Furtividade",
      techLevel: "3",
      attribute: "DX",
      difficulty: "A",
      points: 4,
      importedLevel: 13,
      importedRelativeLevel: 1,
      defaults: [{ type: "skill", name: "Camuflagem", modifier: -4 }],
      features: [{ type: "skill_bonus", amount: 1 }],
      weapons: [{ type: "melee_weapon" }],
      prereqs: { type: "skill_prereq" },
      importMeta: { source: "gcs" },
      raw: { id: "skill-001" },
    },
  ]);

  const json = serializeSkills(skills);

  assert.equal(json[0].techLevel, "3");
  assert.equal(json[0].importedRelativeLevel, 1);
  assert.equal(json[0].defaults.length, 1);
  assert.equal(json[0].features.length, 1);
  assert.equal(json[0].weapons.length, 1);
  assert.deepEqual(json[0].prereqs, { type: "skill_prereq" });
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { id: "skill-001" });
});

test("rejects invalid rich skill fields", () => {
  assert.throws(() => {
    createSkills([
      {
        id: "skill-001",
        name: "Furtividade",
        defaults: "Camuflagem",
      },
    ]);
  });

  assert.throws(() => {
    createSkills([
      {
        id: "skill-001",
        name: "Furtividade",
        importedRelativeLevel: "1",
      },
    ]);
  });
});
