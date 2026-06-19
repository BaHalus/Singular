import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";

test("imports nested technique and resolves parent by id", () => {
  const source = {
    id: "char-001",
    profile: { name: "Technique Hero" },
    skills: [
      {
        id: "skill-gcs-001",
        type: "skill",
        name: "Judô",
        difficulty: "DX/H",
        points: 4,
      },
      {
        id: "tech-001",
        type: "technique",
        name: "Projeção Controlada",
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
    ],
  };

  const snapshot = createSnapshotFromGcs(source);

  assert.equal(snapshot.skills.length, 1);
  assert.equal(snapshot.techniques.length, 1);
  assert.equal(snapshot.unresolvedTechniqueLinks.length, 0);
  assert.equal(snapshot.techniques[0].skillId, "skill-gcs-001");
  assert.equal(snapshot.techniques[0].skillName, "Judô");
  assert.equal(snapshot.techniques[0].importMeta.linkStatus, "resolvedById");

  const character = importCharacter(source);

  assert.equal(character.techniques.length, 1);
  assert.equal(character.techniques[0].name, "Projeção Controlada");
  assert.equal(character.techniques[0].skillId, "skill-gcs-001");
  assert.equal(character.techniques[0].importedLevel, 14);
  assert.equal(character.techniques[0].importedRelativeLevel, 1);
});

test("imports direct technique collection and resolves parent by name", () => {
  const character = importCharacter({
    id: "char-001",
    profile: { name: "Direct Technique Hero" },
    skills: [
      {
        id: "skill-001",
        type: "skill",
        name: "Pilotagem",
        specialization: "Automóvel",
        difficulty: "DX/A",
        points: 2,
      },
    ],
    techniques: [
      {
        id: "tech-001",
        name: "Curva Fechada",
        difficulty: "A",
        points: 1,
        defaults: [
          {
            type: "skill",
            name: "Pilotagem",
            specialization: "Automóvel",
            modifier: -2,
          },
        ],
      },
    ],
  });

  assert.equal(character.techniques.length, 1);
  assert.equal(character.techniques[0].skillId, "skill-001");
  assert.equal(character.techniques[0].skillSpecialization, "Automóvel");
  assert.equal(character.techniques[0].defaultPenalty, -2);
  assert.equal(character.techniques[0].importMeta.linkStatus, "resolvedByName");
});

test("preserves unresolved technique link in snapshot", () => {
  const source = {
    id: "char-001",
    profile: { name: "Unresolved Technique Hero" },
    techniques: [
      {
        id: "tech-001",
        name: "Projeção Controlada",
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
    ],
  };

  const snapshot = createSnapshotFromGcs(source);

  assert.equal(snapshot.techniques.length, 1);
  assert.equal(snapshot.techniques[0].skillId, null);
  assert.equal(snapshot.techniques[0].skillName, "Judô");
  assert.equal(snapshot.unresolvedTechniqueLinks.length, 1);
  assert.equal(snapshot.unresolvedTechniqueLinks[0].reason, "skillNotFound");

  const character = importCharacter(source);

  assert.equal(character.techniques.length, 1);
  assert.equal(character.techniques[0].skillId, null);
});

test("deduplicates technique present in both collections", () => {
  const technique = {
    id: "tech-001",
    type: "technique",
    name: "Curva Fechada",
    difficulty: "A",
    points: 1,
  };

  const snapshot = createSnapshotFromGcs({
    id: "char-001",
    profile: { name: "Duplicate Technique Hero" },
    skills: [technique],
    techniques: [technique],
  });

  assert.equal(snapshot.techniqueNodes.length, 1);
  assert.equal(snapshot.techniques.length, 1);
});
