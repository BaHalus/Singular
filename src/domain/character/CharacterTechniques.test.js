import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

test("Character preserves imported technique structure", () => {
  const character = createCharacter({
    techniques: [
      {
        id: "tech-001",
        externalIds: { gcs: "gcs-tech-001" },
        name: "Arm Lock",
        specialization: "Wrist",
        skillId: "skill-001",
        skillName: "Judo",
        skillSpecialization: "Sport",
        difficulty: "H",
        points: 2,
        importedLevel: 14,
        importedRelativeLevel: 1,
        defaultPenalty: -4,
        maximumRelativeLevel: 0,
        defaults: [{ type: "skill", name: "Judo", penalty: -4 }],
        features: [{ type: "note", value: "Imported feature" }],
        prereqs: { all: [] },
        notes: "Imported from GCS.",
        tags: ["combat"],
        importMeta: { source: "gcs" },
        raw: { original: true },
      },
    ],
  });

  assert.deepEqual(character.techniques, [
    {
      id: "tech-001",
      externalIds: { gcs: "gcs-tech-001" },
      name: "Arm Lock",
      specialization: "Wrist",
      skillId: "skill-001",
      skillName: "Judo",
      skillSpecialization: "Sport",
      difficulty: "H",
      points: 2,
      importedLevel: 14,
      importedRelativeLevel: 1,
      defaultPenalty: -4,
      maximumRelativeLevel: 0,
      defaults: [{ type: "skill", name: "Judo", penalty: -4 }],
      features: [{ type: "note", value: "Imported feature" }],
      prereqs: { all: [] },
      notes: "Imported from GCS.",
      tags: ["combat"],
      importMeta: { source: "gcs" },
      raw: { original: true },
    },
  ]);
});

test("Character serializes techniques without calculating levels", () => {
  const character = createCharacter({
    techniques: [
      {
        id: "tech-001",
        name: "Arm Lock",
        skillName: "Judo",
        difficulty: "H",
        points: 2,
        importedLevel: 14,
        importedRelativeLevel: 1,
        defaultPenalty: -4,
        maximumRelativeLevel: 0,
      },
    ],
  });

  const json = serializeCharacter(character);

  assert.deepEqual(json.techniques, [
    {
      id: "tech-001",
      externalIds: {},
      name: "Arm Lock",
      specialization: "",
      skillId: null,
      skillName: "Judo",
      skillSpecialization: "",
      difficulty: "H",
      points: 2,
      importedLevel: 14,
      importedRelativeLevel: 1,
      defaultPenalty: -4,
      maximumRelativeLevel: 0,
      defaults: [],
      features: [],
      prereqs: null,
      notes: "",
      tags: [],
      importMeta: null,
      raw: null,
    },
  ]);
});
