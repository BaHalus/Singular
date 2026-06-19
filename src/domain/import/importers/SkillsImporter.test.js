import test from "node:test";
import assert from "node:assert/strict";

import { importSkills } from "./SkillsImporter.js";

test("imports basic GCS skill", () => {
  const result = importSkills({
    skills: [
      {
        id: "skill-001",
        type: "skill",
        name: "Furtividade",
        specialization: "Urbana",
        tech_level: "3",
        difficulty: "DX/A",
        points: 2,
        calc: {
          level: 12,
          relative_level: 0,
        },
        defaults: [{ type: "skill", name: "Camuflagem", modifier: -4 }],
        features: [{ type: "skill_bonus", amount: 1 }],
        weapons: [{ type: "melee_weapon" }],
        prereqs: { type: "skill_prereq" },
        notes: "Importada do GCS.",
        tags: ["Física"],
      },
    ],
  });

  assert.equal(result.skills.length, 1);
  assert.equal(result.skills[0].id, "skill-001");
  assert.equal(result.skills[0].externalIds.gcs, "skill-001");
  assert.equal(result.skills[0].name, "Furtividade");
  assert.equal(result.skills[0].specialization, "Urbana");
  assert.equal(result.skills[0].techLevel, "3");
  assert.equal(result.skills[0].attribute, "DX");
  assert.equal(result.skills[0].difficulty, "A");
  assert.equal(result.skills[0].points, 2);
  assert.equal(result.skills[0].importedLevel, 12);
  assert.equal(result.skills[0].importedRelativeLevel, 0);
  assert.equal(result.skills[0].defaults.length, 1);
  assert.equal(result.skills[0].features.length, 1);
  assert.equal(result.skills[0].weapons.length, 1);
  assert.deepEqual(result.skills[0].prereqs, { type: "skill_prereq" });
  assert.ok(result.skills[0].tags.includes("import:gcs"));
});

test("imports numeric strings", () => {
  const result = importSkills([
    {
      id: "skill-001",
      type: "skill",
      name: "Furtividade",
      attribute: "dx",
      difficulty: "a",
      points: "4",
      level: "13",
      relative_level: "1",
    },
  ]);

  assert.equal(result.skills[0].attribute, "DX");
  assert.equal(result.skills[0].difficulty, "A");
  assert.equal(result.skills[0].points, 4);
  assert.equal(result.skills[0].importedLevel, 13);
  assert.equal(result.skills[0].importedRelativeLevel, 1);
});

test("imports skill containers recursively", () => {
  const result = importSkills({
    skills: [
      {
        id: "container-001",
        type: "skill_container",
        name: "Perícias de Combate",
        children: [
          {
            id: "skill-001",
            type: "skill",
            name: "Espada de Lâmina Larga",
            difficulty: "DX/A",
            points: 4,
          },
        ],
      },
    ],
  });

  assert.equal(result.containers.length, 1);
  assert.equal(result.skills.length, 1);
  assert.deepEqual(result.skills[0].importMeta.containerIds, ["container-001"]);
});

test("preserves techniques for later importer", () => {
  const result = importSkills({
    skills: [
      {
        id: "tech-001",
        type: "technique",
        name: "Chave de Braço",
        difficulty: "H",
        points: 2,
        calc: {
          level: 14,
          relative_level: 1,
        },
        defaults: [{ type: "skill", name: "Judô", modifier: 0 }],
      },
    ],
  });

  assert.equal(result.skills.length, 0);
  assert.equal(result.techniqueNodes.length, 1);
  assert.equal(result.techniqueNodes[0].name, "Chave de Braço");
  assert.equal(result.techniqueNodes[0].importedLevel, 14);
  assert.equal(result.techniqueNodes[0].importedRelativeLevel, 1);
  assert.equal(result.techniqueNodes[0].defaults.length, 1);
});

test("preserves unknown skill nodes", () => {
  const result = importSkills({
    skills: [
      {
        id: "unknown-001",
        name: "Sem classificação",
      },
    ],
  });

  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.unknownNodes[0].id, "unknown-001");
});

test("preserves raw source", () => {
  const raw = {
    id: "skill-001",
    type: "skill",
    name: "Furtividade",
    difficulty: "DX/A",
    points: 2,
  };

  const result = importSkills([raw]);

  assert.equal(result.skills[0].raw, raw);
});

test("rejects invalid source", () => {
  assert.throws(() => {
    importSkills("skills");
  });
});

test("rejects invalid node", () => {
  assert.throws(() => {
    importSkills(["skill"]);
  });
});

test("rejects negative points", () => {
  assert.throws(() => {
    importSkills([
      {
        id: "skill-001",
        type: "skill",
        name: "Furtividade",
        points: -1,
      },
    ]);
  });
});
