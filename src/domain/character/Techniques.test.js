import test from "node:test";
import assert from "node:assert/strict";

import {
  createTechniques,
  createTechnique,
  validateTechnique,
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
  assert.equal(technique.skillSpecialization, "");
  assert.equal(technique.difficulty, null);
  assert.equal(technique.points, 0);
  assert.equal(technique.importedLevel, null);
  assert.equal(technique.importedRelativeLevel, null);
  assert.equal(technique.defaultPenalty, null);
  assert.equal(technique.maximumRelativeLevel, null);
  assert.deepEqual(technique.defaults, []);
  assert.deepEqual(technique.features, []);
  assert.equal(technique.prereqs, null);
  assert.equal(technique.notes, "");
  assert.deepEqual(technique.tags, []);
  assert.equal(technique.importMeta, null);
  assert.equal(technique.raw, null);
});

test("creates technique from imported structural input", () => {
  const technique = createTechnique({
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
  });

  assert.equal(technique.id, "tech-001");
  assert.equal(technique.externalIds.gcs, "gcs-tech-001");
  assert.equal(technique.name, "Arm Lock");
  assert.equal(technique.specialization, "Wrist");
  assert.equal(technique.skillId, "skill-001");
  assert.equal(technique.skillName, "Judo");
  assert.equal(technique.skillSpecialization, "Sport");
  assert.equal(technique.difficulty, "H");
  assert.equal(technique.points, 2);
  assert.equal(technique.importedLevel, 14);
  assert.equal(technique.importedRelativeLevel, 1);
  assert.equal(technique.defaultPenalty, -4);
  assert.equal(technique.maximumRelativeLevel, 0);
  assert.deepEqual(technique.defaults, [{ type: "skill", name: "Judo", penalty: -4 }]);
  assert.deepEqual(technique.features, [{ type: "note", value: "Imported feature" }]);
  assert.deepEqual(technique.prereqs, { all: [] });
  assert.deepEqual(technique.tags, ["combat"]);
  assert.deepEqual(technique.importMeta, { source: "gcs" });
  assert.deepEqual(technique.raw, { original: true });
});

test("validates valid techniques", () => {
  const techniques = createTechniques([
    {
      id: "tech-001",
      name: "Arm Lock",
      skillName: "Judo",
      difficulty: "H",
      points: 2,
    },
  ]);

  assert.equal(validateTechniques(techniques), true);
  assert.equal(validateTechnique(techniques[0]), true);
});

test("serializes techniques without calculating levels", () => {
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
      importedRelativeLevel: 1,
      defaultPenalty: -4,
      maximumRelativeLevel: 0,
      tags: ["combat"],
    },
  ]);

  const json = serializeTechniques(techniques);

  assert.deepEqual(json, [
    {
      id: "tech-001",
      externalIds: { gcs: "gcs-tech-001" },
      name: "Arm Lock",
      specialization: "",
      skillId: "skill-001",
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
      tags: ["combat"],
      importMeta: null,
      raw: null,
    },
  ]);
});

test("throws when techniques is not array", () => {
  assert.throws(
    () => createTechniques("Arm Lock"),
    /input.map is not a function/,
  );
});

test("throws when technique externalIds is invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", externalIds: "gcs-tech-001", name: "Arm Lock" }]),
    /Technique externalIds must be object/,
  );
});

test("throws when technique name is invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: 123 }]),
    /Technique name must be string/,
  );
});

test("throws when technique skillId is invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", skillId: 123 }]),
    /Technique skillId must be string or null/,
  );
});

test("throws when technique skillName is invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", skillName: 123 }]),
    /Technique skillName must be string/,
  );
});

test("throws when technique skillSpecialization is invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", skillSpecialization: 123 }]),
    /Technique skillSpecialization must be string/,
  );
});

test("throws when technique points is invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", points: -1 }]),
    /Technique points must be non-negative number/,
  );
});

test("throws when technique imported numeric fields are invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", importedLevel: "14" }]),
    /Technique importedLevel must be number or null/,
  );

  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", importedRelativeLevel: "1" }]),
    /Technique importedRelativeLevel must be number or null/,
  );

  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", defaultPenalty: "-4" }]),
    /Technique defaultPenalty must be number or null/,
  );

  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", maximumRelativeLevel: "0" }]),
    /Technique maximumRelativeLevel must be number or null/,
  );
});

test("throws when technique structural collections are invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", defaults: {} }]),
    /Technique defaults must be array/,
  );

  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", features: {} }]),
    /Technique features must be array/,
  );

  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", tags: "combat" }]),
    /Technique tags must be array/,
  );
});

test("throws when technique metadata objects are invalid", () => {
  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", prereqs: [] }]),
    /Technique prereqs must be object or null/,
  );

  assert.throws(
    () => createTechniques([{ id: "tech-001", name: "Arm Lock", importMeta: [] }]),
    /Technique importMeta must be object or null/,
  );
});
