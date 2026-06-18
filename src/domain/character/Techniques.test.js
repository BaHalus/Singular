import test from "node:test";
import assert from "node:assert/strict";

import {
  createTechniques,
  createTechnique,
  validateTechniques,
  serializeTechniques,
} from "./Techniques.js";

test("creates empty techniques list", () => {
  const techniques = createTechniques();

  assert.deepEqual(techniques, []);
});

test("creates technique with defaults", () => {
  const technique = createTechnique();

  assert.ok(technique.id);
  assert.deepEqual(technique.externalIds, {});
  assert.equal(technique.name, "");
  assert.equal(technique.specialization, "");
  assert.equal(technique.skillId, null);
  assert.equal(technique.skillName, "");
  assert.equal(technique.difficulty, null);
  assert.equal(technique.points, 0);
  assert.equal(technique.importedLevel, null);
  assert.equal(technique.notes, "");
  assert.deepEqual(technique.tags, []);
});

test("creates technique from input", () => {
  const technique = createTechnique({
    id: "tech-001",
    externalIds: { gcs: "gcs-tech-001" },
    name: "Arm Lock",
    specialization: "",
    skillId: "skill-001",
    skillName: "Judo",
    difficulty: "H",
    points: 2,
    importedLevel: 14,
    notes: "Imported from GCS.",
    tags: ["combat"],
  });

  assert.equal(technique.id, "tech-001");
  assert.equal(technique.externalIds.gcs, "gcs-tech-001");
  assert.equal(technique.name, "Arm Lock");
  assert.equal(technique.skillId, "skill-001");
  assert.equal(technique.skillName, "Judo");
  assert.equal(technique.difficulty, "H");
  assert.equal(technique.points, 2);
  assert.equal(technique.importedLevel, 14);
  assert.deepEqual(technique.tags, ["combat"]);
});

test("validates valid techniques", () => {
  const techniques = createTechniques();

  assert.equal(validateTechniques(techniques), true);
});

test("serializes techniques", () => {
  const techniques = createTechniques([
    {
      id: "tech-001",
      externalIds: { gcs: "gcs-tech-001" },
      name: "Arm Lock",
      skillId: "skill-001",
      skillName: "Judo",
      difficulty: "H",
      points: 2,
      importedLevel: 14,
      tags: ["combat"],
    },
  ]);

  const json = serializeTechniques(techniques);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "tech-001");
  assert.equal(json[0].externalIds.gcs, "gcs-tech-001");
  assert.equal(json[0].name, "Arm Lock");
  assert.equal(json[0].skillName, "Judo");
  assert.equal(json[0].importedLevel, 14);
});

test("throws when techniques is not array", () => {
  assert.throws(() => {
    createTechniques("Arm Lock");
  });
});

test("throws when technique externalIds is invalid", () => {
  assert.throws(() => {
    createTechniques([{ id: "tech-001", externalIds: "gcs-tech-001", name: "Arm Lock" }]);
  });
});

test("throws when technique name is invalid", () => {
  assert.throws(() => {
    createTechniques([{ id: "tech-001", name: 123 }]);
  });
});

test("throws when technique skillId is invalid", () => {
  assert.throws(() => {
    createTechniques([{ id: "tech-001", name: "Arm Lock", skillId: 123 }]);
  });
});

test("throws when technique skillName is invalid", () => {
  assert.throws(() => {
    createTechniques([{ id: "tech-001", name: "Arm Lock", skillName: 123 }]);
  });
});

test("throws when technique points is invalid", () => {
  assert.throws(() => {
    createTechniques([{ id: "tech-001", name: "Arm Lock", points: -1 }]);
  });
});

test("throws when technique importedLevel is invalid", () => {
  assert.throws(() => {
    createTechniques([{ id: "tech-001", name: "Arm Lock", importedLevel: "14" }]);
  });
});

test("throws when technique tags is invalid", () => {
  assert.throws(() => {
    createTechniques([{ id: "tech-001", name: "Arm Lock", tags: "combat" }]);
  });
});
