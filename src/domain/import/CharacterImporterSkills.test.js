import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";

test("preserves skill containers, techniques and unknown nodes in snapshot", () => {
  const snapshot = createSnapshotFromGcs({
    id: "char-001",
    profile: {
      name: "Skill Hero",
    },
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
            calc: {
              level: 14,
              relative_level: 2,
            },
          },
          {
            id: "tech-001",
            type: "technique",
            name: "Desarme",
            difficulty: "H",
            points: 2,
            calc: {
              level: 13,
              relative_level: 1,
            },
          },
        ],
      },
      {
        id: "unknown-001",
        name: "Sem classificação",
      },
    ],
  });

  assert.equal(snapshot.skills.length, 1);
  assert.equal(snapshot.skillContainers.length, 1);
  assert.equal(snapshot.techniqueNodes.length, 1);
  assert.equal(snapshot.techniques.length, 1);
  assert.equal(snapshot.unknownSkillNodes.length, 1);
  assert.deepEqual(snapshot.skills[0].importMeta.containerIds, ["container-001"]);
  assert.deepEqual(snapshot.techniqueNodes[0].importMeta.containerIds, ["container-001"]);
  assert.deepEqual(snapshot.techniques[0].importMeta.containerIds, ["container-001"]);
});

test("imports rich GCS skills into character", () => {
  const character = importCharacter({
    id: "char-001",
    profile: {
      name: "Skill Hero",
    },
    skills: [
      {
        id: "skill-001",
        type: "skill",
        name: "Furtividade",
        specialization: "Urbana",
        tech_level: "3",
        difficulty: "DX/A",
        points: 4,
        calc: {
          level: 13,
          relative_level: 1,
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

  assert.equal(character.skills.length, 1);

  const skill = character.skills[0];

  assert.equal(skill.id, "skill-001");
  assert.equal(skill.externalIds.gcs, "skill-001");
  assert.equal(skill.name, "Furtividade");
  assert.equal(skill.specialization, "Urbana");
  assert.equal(skill.techLevel, "3");
  assert.equal(skill.attribute, "DX");
  assert.equal(skill.difficulty, "A");
  assert.equal(skill.points, 4);
  assert.equal(skill.importedLevel, 13);
  assert.equal(skill.importedRelativeLevel, 1);
  assert.equal(skill.defaults.length, 1);
  assert.equal(skill.features.length, 1);
  assert.equal(skill.weapons.length, 1);
  assert.deepEqual(skill.prereqs, { type: "skill_prereq" });
  assert.deepEqual(skill.importMeta.containerIds, []);
  assert.ok(skill.tags.includes("import:gcs"));
});

test("does not import technique nodes as ordinary skills", () => {
  const character = importCharacter({
    id: "char-001",
    profile: {
      name: "Technique Hero",
    },
    skills: [
      {
        id: "tech-001",
        type: "technique",
        name: "Chave de Braço",
        difficulty: "H",
        points: 2,
      },
    ],
  });

  assert.deepEqual(character.skills, []);
  assert.equal(character.techniques.length, 1);
  assert.equal(character.techniques[0].id, "tech-001");
  assert.equal(character.techniques[0].skillId, null);
});
