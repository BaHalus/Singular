import test from "node:test";
import assert from "node:assert/strict";

import { createSkills } from "../../character/Skills.js";
import { importTechniques } from "./TechniquesImporter.js";

test("resolves parent skill by external GCS id", () => {
  const skills = createSkills([
    {
      id: "skill-local-001",
      externalIds: { gcs: "skill-gcs-001" },
      name: "Judô",
      attribute: "DX",
      difficulty: "H",
      points: 4,
    },
  ]);

  const result = importTechniques([
    {
      id: "tech-001",
      name: "Chave de Braço",
      difficulty: "H",
      points: 2,
      defaults: [
        {
          type: "skill",
          id: "skill-gcs-001",
          name: "Judô",
          modifier: 0,
        },
      ],
      calc: {
        level: 14,
        relative_level: 1,
      },
    },
  ], skills);

  assert.equal(result.techniques.length, 1);
  assert.equal(result.unresolvedLinks.length, 0);
  assert.equal(result.techniques[0].skillId, "skill-local-001");
  assert.equal(result.techniques[0].skillName, "Judô");
  assert.equal(result.techniques[0].importMeta.linkStatus, "resolvedById");
  assert.equal(result.techniques[0].defaultPenalty, 0);
  assert.equal(result.techniques[0].importedLevel, 14);
  assert.equal(result.techniques[0].importedRelativeLevel, 1);
});

test("resolves parent skill by name and specialization", () => {
  const skills = createSkills([
    {
      id: "skill-001",
      name: "Armas de Fogo",
      specialization: "Pistola",
      attribute: "DX",
      difficulty: "E",
      points: 2,
    },
    {
      id: "skill-002",
      name: "Armas de Fogo",
      specialization: "Rifle",
      attribute: "DX",
      difficulty: "E",
      points: 2,
    },
  ]);

  const result = importTechniques([
    {
      id: "tech-001",
      name: "Tiro Rápido",
      difficulty: "A",
      points: 1,
      defaults: [
        {
          type: "skill",
          name: "Armas de Fogo",
          specialization: "Pistola",
          modifier: -2,
        },
      ],
    },
  ], skills);

  assert.equal(result.unresolvedLinks.length, 0);
  assert.equal(result.techniques[0].skillId, "skill-001");
  assert.equal(result.techniques[0].skillSpecialization, "Pistola");
  assert.equal(result.techniques[0].importMeta.linkStatus, "resolvedByName");
  assert.equal(result.techniques[0].defaultPenalty, -2);
});

test("preserves unresolved parent skill reference", () => {
  const result = importTechniques([
    {
      id: "tech-001",
      name: "Chave de Braço",
      difficulty: "H",
      points: 2,
      defaults: [
        {
          type: "skill",
          name: "Judô",
          modifier: 0,
        },
      ],
    },
  ], []);

  assert.equal(result.techniques.length, 1);
  assert.equal(result.techniques[0].skillId, null);
  assert.equal(result.techniques[0].skillName, "Judô");
  assert.equal(result.techniques[0].importMeta.linkStatus, "unresolved");
  assert.equal(result.unresolvedLinks.length, 1);
  assert.equal(result.unresolvedLinks[0].reason, "skillNotFound");
});

test("does not choose ambiguous skill name", () => {
  const skills = createSkills([
    {
      id: "skill-001",
      name: "Armas de Fogo",
      specialization: "Pistola",
      points: 1,
    },
    {
      id: "skill-002",
      name: "Armas de Fogo",
      specialization: "Rifle",
      points: 1,
    },
  ]);

  const result = importTechniques([
    {
      id: "tech-001",
      name: "Tiro Rápido",
      defaults: [
        {
          type: "skill",
          name: "Armas de Fogo",
        },
      ],
    },
  ], skills);

  assert.equal(result.techniques[0].skillId, null);
  assert.equal(result.techniques[0].importMeta.linkStatus, "ambiguous");
  assert.equal(result.unresolvedLinks[0].reason, "multipleSkillsMatched");
});

test("preserves rich technique fields and numeric strings", () => {
  const raw = {
    id: "tech-001",
    name: "Desarme",
    specialization: "Espada",
    difficulty: "DX/H",
    points: "2",
    level: "13",
    relative_level: "1",
    maximum_relative_level: "4",
    defaults: [],
    features: [{ type: "skill_bonus", amount: 1 }],
    prereqs: { type: "skill_prereq" },
    notes: ["Primeira nota", "Segunda nota"],
    tags: ["Combate"],
  };

  const result = importTechniques([raw], []);
  const technique = result.techniques[0];

  assert.equal(technique.specialization, "Espada");
  assert.equal(technique.difficulty, "H");
  assert.equal(technique.points, 2);
  assert.equal(technique.importedLevel, 13);
  assert.equal(technique.importedRelativeLevel, 1);
  assert.equal(technique.maximumRelativeLevel, 4);
  assert.deepEqual(technique.features, [{ type: "skill_bonus", amount: 1 }]);
  assert.deepEqual(technique.prereqs, { type: "skill_prereq" });
  assert.equal(technique.notes, "Primeira nota\nSegunda nota");
  assert.ok(technique.tags.includes("import:gcs"));
  assert.equal(technique.raw, raw);
});

test("accepts object source", () => {
  const result = importTechniques({
    techniques: [
      {
        id: "tech-001",
        name: "Desarme",
        points: 1,
      },
    ],
  });

  assert.equal(result.techniques.length, 1);
});

test("rejects invalid source", () => {
  assert.throws(() => {
    importTechniques("techniques");
  });
});

test("rejects invalid node", () => {
  assert.throws(() => {
    importTechniques(["technique"]);
  });
});

test("rejects invalid skills collection", () => {
  assert.throws(() => {
    importTechniques([], "skills");
  });
});
