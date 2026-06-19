import test from "node:test";
import assert from "node:assert/strict";

import {
  createTemplates,
  serializeTemplates,
} from "./Templates.js";

test("creates rich race template", () => {
  const raw = { type: "template", id: "template-001" };

  const templates = createTemplates([
    {
      id: "template-001",
      externalIds: { gcs: "template-001" },
      sourceVersion: 2,
      templateType: "race",
      name: "Anão",
      ancestry: "Human",
      reference: "B261",
      importedPoints: 35,
      tags: ["import:gcs", "format:gct"],
      traits: {
        advantages: [
          {
            id: "adv-001",
            name: "Visão Noturna",
            points: 5,
          },
        ],
        disadvantages: [
          {
            id: "disadv-001",
            name: "Pernas Curtas",
            points: -5,
          },
        ],
        containers: [
          {
            id: "container-001",
            name: "Anão",
            containerType: "race",
          },
        ],
      },
      skills: [
        {
          id: "skill-001",
          name: "Ferreiro",
          attribute: "IQ",
          difficulty: "A",
          points: 1,
        },
      ],
      importMeta: {
        source: "gcs",
        format: "gct",
        originalExtension: ".gct",
      },
      raw,
    },
  ]);

  const template = templates[0];

  assert.equal(template.templateType, "race");
  assert.equal(template.ancestry, "Human");
  assert.equal(template.importedPoints, 35);
  assert.equal(template.traits.advantages.length, 1);
  assert.equal(template.traits.disadvantages.length, 1);
  assert.equal(template.traits.containers.length, 1);
  assert.equal(template.skills.length, 1);
  assert.equal(template.importMeta.originalExtension, ".gct");
  assert.equal(template.raw, raw);
});

test("creates metatrait with negative imported points", () => {
  const templates = createTemplates([
    {
      id: "template-001",
      templateType: "metaTrait",
      name: "Metacaracterística: Ictioide",
      importedPoints: -50,
      traits: {
        disadvantages: [
          {
            id: "disadv-001",
            name: "Sem Manuseadores",
            points: -50,
          },
        ],
      },
    },
  ]);

  assert.equal(templates[0].templateType, "metaTrait");
  assert.equal(templates[0].importedPoints, -50);
  assert.equal(templates[0].traits.disadvantages.length, 1);
});

test("serializes nested template components", () => {
  const templates = createTemplates([
    {
      id: "template-001",
      templateType: "form",
      name: "Forma de Morcego",
      importedPoints: 30,
      spells: [
        {
          id: "spell-001",
          name: "Visão no Escuro",
          points: 1,
        },
      ],
      equipment: [
        {
          id: "eq-001",
          name: "Coleira",
          cost: 10,
          weightKg: 0.1,
        },
      ],
      importMeta: { source: "gcs" },
      raw: { type: "template" },
    },
  ]);

  const json = serializeTemplates(templates);

  assert.equal(json[0].templateType, "form");
  assert.equal(json[0].spells.length, 1);
  assert.equal(json[0].equipment.length, 1);
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { type: "template" });
});

test("rejects invalid template fields", () => {
  assert.throws(() => {
    createTemplates("templates");
  });

  assert.throws(() => {
    createTemplates([
      {
        id: "template-001",
        templateType: "species",
      },
    ]);
  });

  assert.throws(() => {
    createTemplates([
      {
        id: "template-001",
        sourceVersion: -1,
        templateType: "race",
      },
    ]);
  });

  assert.throws(() => {
    createTemplates([
      {
        id: "template-001",
        templateType: "race",
        traits: {
          containers: "race",
        },
      },
    ]);
  });
});
