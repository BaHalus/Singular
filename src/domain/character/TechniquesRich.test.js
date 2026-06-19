import test from "node:test";
import assert from "node:assert/strict";

import {
  createTechniques,
  serializeTechniques,
} from "./Techniques.js";

test("preserves rich imported technique fields", () => {
  const raw = { id: "tech-001", name: "Desarme" };

  const techniques = createTechniques([
    {
      id: "tech-001",
      externalIds: { gcs: "gcs-tech-001" },
      name: "Desarme",
      specialization: "Espada",
      skillId: "skill-001",
      skillName: "Espada de Lâmina Larga",
      skillSpecialization: "",
      difficulty: "H",
      points: 2,
      importedLevel: 14,
      importedRelativeLevel: 1,
      defaultPenalty: -2,
      maximumRelativeLevel: 4,
      defaults: [{ type: "skill", name: "Espada de Lâmina Larga", modifier: -2 }],
      features: [{ type: "skill_bonus", amount: 1 }],
      prereqs: { type: "skill_prereq" },
      notes: "Importada do GCS.",
      tags: ["Combate", "import:gcs"],
      importMeta: {
        source: "gcs",
        containerIds: ["container-001"],
        linkStatus: "resolvedByName",
      },
      raw,
    },
  ]);

  const technique = techniques[0];

  assert.equal(technique.skillSpecialization, "");
  assert.equal(technique.importedRelativeLevel, 1);
  assert.equal(technique.defaultPenalty, -2);
  assert.equal(technique.maximumRelativeLevel, 4);
  assert.equal(technique.defaults.length, 1);
  assert.equal(technique.features.length, 1);
  assert.deepEqual(technique.prereqs, { type: "skill_prereq" });
  assert.equal(technique.importMeta.linkStatus, "resolvedByName");
  assert.equal(technique.raw, raw);
});

test("serializes rich imported technique fields", () => {
  const techniques = createTechniques([
    {
      id: "tech-001",
      name: "Desarme",
      skillId: "skill-001",
      skillName: "Espada de Lâmina Larga",
      difficulty: "H",
      points: 2,
      importedLevel: 14,
      importedRelativeLevel: 1,
      defaultPenalty: -2,
      maximumRelativeLevel: 4,
      defaults: [{ type: "skill", name: "Espada de Lâmina Larga", modifier: -2 }],
      features: [{ type: "skill_bonus", amount: 1 }],
      prereqs: { type: "skill_prereq" },
      importMeta: { source: "gcs" },
      raw: { id: "tech-001" },
    },
  ]);

  const json = serializeTechniques(techniques);

  assert.equal(json[0].importedRelativeLevel, 1);
  assert.equal(json[0].defaultPenalty, -2);
  assert.equal(json[0].maximumRelativeLevel, 4);
  assert.equal(json[0].defaults.length, 1);
  assert.equal(json[0].features.length, 1);
  assert.deepEqual(json[0].prereqs, { type: "skill_prereq" });
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { id: "tech-001" });
});

test("rejects invalid rich technique fields", () => {
  assert.throws(() => {
    createTechniques([
      {
        id: "tech-001",
        name: "Desarme",
        defaults: "Espada de Lâmina Larga",
      },
    ]);
  });

  assert.throws(() => {
    createTechniques([
      {
        id: "tech-001",
        name: "Desarme",
        importedRelativeLevel: "1",
      },
    ]);
  });
});
