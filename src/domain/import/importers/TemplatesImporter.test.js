import test from "node:test";
import assert from "node:assert/strict";

import { importTemplates } from "./TemplatesImporter.js";

test("imports GCT race template with traits and skills", () => {
  const source = {
    type: "template",
    version: 2,
    id: "template-001",
    advantages: [
      {
        type: "advantage_container",
        id: "race-001",
        container_type: "race",
        name: "Anão",
        reference: "B261",
        ancestry: "Human",
        calc: { points: 35 },
        children: [
          {
            type: "advantage",
            id: "adv-001",
            name: "Visão Noturna",
            levels: "5",
            points_per_level: 1,
            reference: "B97",
            calc: { points: 5 },
            categories: ["Vantagem"],
          },
          {
            type: "advantage",
            id: "disadv-001",
            name: "Sem Manuseadores",
            base_points: -50,
            reference: "B149",
            calc: { points: -50 },
            features: [
              {
                type: "cost_reduction",
                attribute: "st",
                percentage: 40,
              },
            ],
            categories: ["Desvantagem"],
          },
        ],
      },
    ],
    skills: [
      {
        type: "skill",
        id: "skill-001",
        name: "Ferreiro",
        difficulty: "iq/a",
        points: 1,
        reference: "B194",
      },
    ],
  };

  const result = importTemplates(source);

  assert.equal(result.templates.length, 1);
  assert.equal(result.unknownNodes.length, 0);

  const template = result.templates[0];

  assert.equal(template.id, "template-001");
  assert.equal(template.externalIds.gcs, "template-001");
  assert.equal(template.sourceVersion, 2);
  assert.equal(template.templateType, "race");
  assert.equal(template.name, "Anão");
  assert.equal(template.ancestry, "Human");
  assert.equal(template.reference, "B261");
  assert.equal(template.importedPoints, 35);
  assert.equal(template.traits.advantages.length, 1);
  assert.equal(template.traits.disadvantages.length, 1);
  assert.equal(template.traits.containers.length, 1);
  assert.equal(template.traits.advantages[0].points, 5);
  assert.equal(template.traits.disadvantages[0].points, -50);
  assert.equal(template.traits.disadvantages[0].features.length, 1);
  assert.equal(template.skills.length, 1);
  assert.equal(template.skills[0].attribute, "IQ");
  assert.equal(template.skills[0].difficulty, "A");
  assert.equal(template.importMeta.format, "gct");
  assert.equal(template.importMeta.originalExtension, ".gct");
  assert.deepEqual(template.importMeta.rootContainerIds, ["race-001"]);
  assert.equal(template.raw, source);
});

test("imports metatrait and preserves negative package cost", () => {
  const source = {
    type: "template",
    version: 2,
    id: "template-001",
    advantages: [
      {
        type: "advantage_container",
        id: "meta-001",
        container_type: "meta_trait",
        name: "Metacaracterística: Ictioide",
        reference: "B263",
        calc: { points: -50 },
        children: [
          {
            type: "advantage",
            id: "disadv-001",
            name: "Sem Manuseadores",
            base_points: -50,
            calc: { points: -50 },
            categories: ["Desvantagem"],
          },
          {
            type: "advantage",
            id: "zero-001",
            name: "Sem Pernas (Aquático)",
            calc: { points: 0 },
            categories: ["Desvantagem"],
          },
        ],
      },
    ],
  };

  const template = importTemplates(source).templates[0];

  assert.equal(template.templateType, "metaTrait");
  assert.equal(template.importedPoints, -50);
  assert.equal(template.traits.disadvantages.length, 2);
  assert.equal(template.traits.disadvantages[1].points, 0);
});

test("recognizes English GCS categories", () => {
  const source = {
    type: "template",
    version: 2,
    id: "template-001",
    advantages: [
      {
        type: "advantage_container",
        id: "meta-001",
        container_type: "meta_trait",
        name: "Metacaracterística: Inteligência Artificial",
        calc: { points: 32 },
        children: [
          {
            type: "advantage",
            id: "adv-001",
            name: "Mente Digital",
            base_points: 5,
            calc: { points: 5 },
            categories: ["Advantage"],
          },
          {
            type: "advantage",
            id: "disadv-001",
            name: "Reprogramável",
            base_points: -10,
            calc: { points: -10 },
            categories: ["Disadvantage"],
          },
        ],
      },
    ],
  };

  const template = importTemplates(source).templates[0];

  assert.equal(template.traits.advantages.length, 1);
  assert.equal(template.traits.disadvantages.length, 1);
});

test("preserves attribute bonuses, natural attacks and alternative forms", () => {
  const source = {
    type: "template",
    version: 2,
    id: "template-001",
    advantages: [
      {
        type: "advantage_container",
        id: "race-001",
        container_type: "race",
        name: "Vampiro",
        ancestry: "Human",
        calc: { points: 150 },
        children: [
          {
            type: "advantage",
            id: "attr-001",
            name: "Modificadores de Atributos",
            modifiers: [
              {
                type: "modifier",
                id: "mod-001",
                name: "ST +6",
                cost_type: "points",
                cost: 60,
                features: [
                  {
                    type: "attribute_bonus",
                    amount: 6,
                    attribute: "st",
                  },
                ],
              },
            ],
            calc: { points: 60 },
            categories: ["Vantagem"],
          },
          {
            type: "advantage",
            id: "form-001",
            name: "Forma Alternativa",
            base_points: 15,
            notes: "Morcego",
            calc: { points: 15 },
            categories: ["Vantagem"],
          },
          {
            type: "advantage",
            id: "attack-001",
            name: "Dentes Afiados",
            base_points: 1,
            weapons: [
              {
                type: "melee_weapon",
                usage: "Mordida",
                damage: { type: "corte", st: "thr", base: "-1" },
              },
            ],
            calc: { points: 1 },
            categories: ["Vantagem"],
          },
        ],
      },
    ],
  };

  const template = importTemplates(source).templates[0];
  const attributes = template.traits.advantages.find(item => item.id === "attr-001");
  const form = template.traits.advantages.find(item => item.id === "form-001");
  const attack = template.traits.advantages.find(item => item.id === "attack-001");

  assert.equal(attributes.modifiers[0].features[0].attribute, "st");
  assert.equal(form.notes, "Morcego");
  assert.equal(attack.weapons.length, 1);
  assert.equal(attack.weapons[0].usage, "Mordida");
});

test("does not recalculate imported package cost", () => {
  const source = {
    type: "template",
    version: 2,
    id: "template-001",
    advantages: [
      {
        type: "advantage_container",
        id: "race-001",
        container_type: "race",
        name: "Teste",
        calc: { points: 999 },
        children: [
          {
            type: "advantage",
            id: "adv-001",
            name: "Vantagem",
            base_points: 1,
            calc: { points: 1 },
            categories: ["Vantagem"],
          },
        ],
      },
    ],
  };

  const template = importTemplates(source).templates[0];

  assert.equal(template.importedPoints, 999);
  assert.equal(template.traits.advantages[0].points, 1);
});

test("imports embedded template arrays", () => {
  const result = importTemplates({
    templates: [
      {
        type: "template",
        version: 2,
        id: "template-001",
        name: "Forma de Névoa",
        template_type: "form",
      },
    ],
  });

  assert.equal(result.templates.length, 1);
  assert.equal(result.templates[0].templateType, "form");
  assert.equal(result.templates[0].name, "Forma de Névoa");
});

test("preserves unknown template nodes separately", () => {
  const result = importTemplates([
    {
      type: "unknown_package",
      id: "unknown-001",
      name: "Pacote desconhecido",
    },
  ]);

  assert.deepEqual(result.templates, []);
  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.unknownNodes[0].id, "unknown-001");
});

test("rejects invalid template source and nodes", () => {
  assert.throws(() => {
    importTemplates("templates");
  });

  assert.throws(() => {
    importTemplates(["template"]);
  });

  assert.throws(() => {
    importTemplates({
      type: "template",
      version: -1,
      id: "template-001",
    });
  });
});
