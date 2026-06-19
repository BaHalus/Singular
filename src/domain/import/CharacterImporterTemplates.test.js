import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";

test("imports standalone GCT as template package without applying components", () => {
  const source = {
    type: "template",
    version: 2,
    id: "template-001",
    advantages: [
      {
        type: "advantage_container",
        id: "race-001",
        container_type: "race",
        name: "Elfo",
        reference: "B316",
        ancestry: "Human",
        calc: { points: 69 },
        children: [
          {
            type: "advantage",
            id: "adv-001",
            name: "Facilidade para Idiomas",
            base_points: 10,
            calc: { points: 10 },
            categories: ["Vantagem"],
          },
          {
            type: "advantage",
            id: "disadv-001",
            name: "ST -1",
            base_points: -10,
            calc: { points: -10 },
            categories: ["Desvantagem"],
          },
        ],
      },
    ],
    skills: [
      {
        type: "skill",
        id: "skill-001",
        name: "Conhecimento do Terreno",
        specialization: "Florestas",
        difficulty: "iq/a",
        points: 1,
      },
    ],
  };

  const snapshot = createSnapshotFromGcs(source);

  assert.equal(snapshot.identity.name, "Elfo");
  assert.equal(snapshot.templates.length, 1);
  assert.equal(snapshot.unknownTemplateNodes.length, 0);

  assert.deepEqual(snapshot.traits.advantages, []);
  assert.deepEqual(snapshot.traits.disadvantages, []);
  assert.deepEqual(snapshot.skills, []);

  const character = importCharacter(source);

  assert.equal(character.identity.name, "Elfo");
  assert.equal(character.templates.length, 1);
  assert.deepEqual(character.advantages, []);
  assert.deepEqual(character.disadvantages, []);
  assert.deepEqual(character.skills, []);

  const template = character.templates[0];

  assert.equal(template.templateType, "race");
  assert.equal(template.importedPoints, 69);
  assert.equal(template.traits.advantages.length, 1);
  assert.equal(template.traits.disadvantages.length, 1);
  assert.equal(template.skills.length, 1);
});

test("imports embedded templates without hiding character traits", () => {
  const source = {
    id: "char-001",
    profile: { name: "Template Hero" },
    traits: [
      {
        type: "advantage",
        id: "adv-character",
        name: "Reflexos em Combate",
        base_points: 15,
        calc: { points: 15 },
        categories: ["Vantagem"],
      },
    ],
    templates: [
      {
        type: "template",
        version: 2,
        id: "template-001",
        advantages: [
          {
            type: "advantage_container",
            id: "meta-001",
            container_type: "meta_trait",
            name: "Metacaracterística: Máquina",
            calc: { points: 25 },
            children: [
              {
                type: "advantage",
                id: "adv-template",
                name: "Tolerância a Ferimentos",
                calc: { points: 25 },
                categories: ["Vantagem"],
              },
            ],
          },
        ],
      },
    ],
  };

  const character = importCharacter(source);

  assert.equal(character.advantages.length, 1);
  assert.equal(character.advantages[0].id, "adv-character");
  assert.equal(character.templates.length, 1);
  assert.equal(character.templates[0].templateType, "metaTrait");
  assert.equal(character.templates[0].traits.advantages.length, 1);
  assert.equal(character.templates[0].traits.advantages[0].id, "adv-template");
});

test("preserves embedded GCT template diagnostics", () => {
  const snapshot = createSnapshotFromGcs({
    id: "char-001",
    profile: { name: "Template Hero" },
    templates: [
      {
        type: "unknown_package",
        id: "unknown-001",
        name: "Pacote desconhecido",
      },
    ],
  });

  assert.deepEqual(snapshot.templates, []);
  assert.equal(snapshot.unknownTemplateNodes.length, 1);
  assert.equal(snapshot.unknownTemplateNodes[0].id, "unknown-001");
});
