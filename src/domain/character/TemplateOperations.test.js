import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  incorporateTemplate,
  removeTemplateApplication,
  removeTemplatePackage,
  findTemplateApplication,
  getActiveTemplateApplications,
} from "./TemplateOperations.js";

function createTemplateCharacter() {
  return createCharacter({
    identity: {
      id: "char-001",
      name: "Template Hero",
      concept: "",
      playerId: null,
      campaignId: null,
    },
    advantages: [
      {
        id: "adv-existing",
        name: "Reflexos em Combate",
        points: 15,
      },
    ],
    templates: [
      {
        id: "template-001",
        templateType: "race",
        name: "Anão",
        ancestry: "Human",
        importedPoints: 35,
        traits: {
          advantages: [
            {
              id: "adv-source",
              name: "Visão Noturna",
              points: 5,
              importMeta: { source: "gcs" },
            },
          ],
          disadvantages: [
            {
              id: "disadv-source",
              name: "Pernas Curtas",
              points: -5,
            },
          ],
        },
        skills: [
          {
            id: "skill-source",
            name: "Ferreiro",
            attribute: "IQ",
            difficulty: "A",
            points: 1,
          },
        ],
        techniques: [
          {
            id: "tech-source",
            name: "Trabalho Rápido",
            skillId: "skill-source",
            skillName: "Ferreiro",
            difficulty: "H",
            points: 1,
          },
        ],
        spells: [
          {
            id: "spell-source",
            name: "Fortalecer Metal",
            attribute: "IQ",
            difficulty: "H",
            points: 1,
          },
        ],
        languages: [
          {
            id: "lang-source",
            name: "Anão",
            spokenLevel: "native",
            writtenLevel: "native",
            isNative: true,
          },
        ],
        familiarities: [
          {
            id: "fam-source",
            name: "Anões",
            isNative: true,
          },
        ],
        equipment: [
          {
            id: "eq-source",
            kind: "container",
            containerKind: "physical",
            name: "Mochila de Ferramentas",
            cost: 100,
            weightKg: 2,
            children: [
              {
                id: "eq-child-source",
                name: "Martelo",
                cost: 20,
                weightKg: 1,
              },
            ],
          },
        ],
      },
    ],
    metadata: {
      createdAt: "2026-06-19T10:00:00.000Z",
      updatedAt: "2026-06-19T10:00:00.000Z",
      source: "singular",
    },
  });
}

test("incorporates template components with provenance", () => {
  const original = createTemplateCharacter();
  const character = incorporateTemplate(original, "template-001", {
    applicationId: "application-001",
    now: "2026-06-19T12:00:00.000Z",
    notes: "Raça escolhida na criação.",
  });

  assert.equal(character.templates.length, 1);
  assert.equal(character.templateApplications.length, 1);
  assert.equal(character.metadata.updatedAt, "2026-06-19T12:00:00.000Z");

  const application = character.templateApplications[0];

  assert.equal(application.id, "application-001");
  assert.equal(application.templateId, "template-001");
  assert.equal(application.templateName, "Anão");
  assert.equal(application.templateType, "race");
  assert.equal(application.importedPoints, 35);
  assert.equal(application.status, "active");
  assert.equal(application.notes, "Raça escolhida na criação.");

  assert.equal(character.advantages.length, 2);
  assert.equal(character.disadvantages.length, 1);
  assert.equal(character.skills.length, 1);
  assert.equal(character.techniques.length, 1);
  assert.equal(character.spells.length, 1);
  assert.equal(character.languages.length, 1);
  assert.equal(character.familiarities.length, 1);
  assert.equal(character.equipment.length, 1);

  const advantage = character.advantages.find(item => item.name === "Visão Noturna");
  const skill = character.skills[0];
  const technique = character.techniques[0];
  const equipment = character.equipment[0];

  assert.notEqual(advantage.id, "adv-source");
  assert.equal(advantage.importMeta.source, "gcs");
  assert.equal(advantage.importMeta.templateApplicationId, "application-001");
  assert.equal(advantage.importMeta.templateId, "template-001");
  assert.equal(advantage.importMeta.templateSourceComponentId, "adv-source");

  assert.notEqual(skill.id, "skill-source");
  assert.equal(technique.skillId, skill.id);
  assert.equal(technique.importMeta.templateApplicationId, "application-001");

  assert.notEqual(equipment.id, "eq-source");
  assert.notEqual(equipment.children[0].id, "eq-child-source");
  assert.equal(
    equipment.children[0].importMeta.templateApplicationId,
    "application-001",
  );

  assert.deepEqual(application.componentIds.advantages, [advantage.id]);
  assert.deepEqual(application.componentIds.skills, [skill.id]);
  assert.deepEqual(application.componentIds.techniques, [technique.id]);
  assert.deepEqual(application.componentIds.equipment, [equipment.id]);

  assert.equal(original.advantages.length, 1);
  assert.equal(original.skills.length, 0);
  assert.equal(original.templateApplications.length, 0);
  assert.equal(original.templates[0].skills[0].id, "skill-source");
});

test("removes incorporated components and preserves package history", () => {
  const incorporated = incorporateTemplate(createTemplateCharacter(), "template-001", {
    applicationId: "application-001",
    now: "2026-06-19T12:00:00.000Z",
  });
  const character = removeTemplateApplication(incorporated, "application-001", {
    now: "2026-06-19T13:00:00.000Z",
  });

  assert.equal(character.advantages.length, 1);
  assert.equal(character.advantages[0].id, "adv-existing");
  assert.deepEqual(character.disadvantages, []);
  assert.deepEqual(character.skills, []);
  assert.deepEqual(character.techniques, []);
  assert.deepEqual(character.spells, []);
  assert.deepEqual(character.languages, []);
  assert.deepEqual(character.familiarities, []);
  assert.deepEqual(character.equipment, []);

  assert.equal(character.templates.length, 1);
  assert.equal(character.templateApplications.length, 1);
  assert.equal(character.templateApplications[0].status, "removed");
  assert.equal(
    character.templateApplications[0].removedAt,
    "2026-06-19T13:00:00.000Z",
  );
  assert.equal(character.metadata.updatedAt, "2026-06-19T13:00:00.000Z");
  assert.deepEqual(getActiveTemplateApplications(character), []);
});

test("allows reincorporation after previous application was removed", () => {
  const first = incorporateTemplate(createTemplateCharacter(), "template-001", {
    applicationId: "application-001",
    now: "2026-06-19T12:00:00.000Z",
  });
  const removed = removeTemplateApplication(first, "application-001", {
    now: "2026-06-19T13:00:00.000Z",
  });
  const second = incorporateTemplate(removed, "template-001", {
    applicationId: "application-002",
    now: "2026-06-19T14:00:00.000Z",
  });

  assert.equal(second.templateApplications.length, 2);
  assert.equal(second.templateApplications[0].status, "removed");
  assert.equal(second.templateApplications[1].status, "active");
  assert.equal(second.advantages.length, 2);
});

test("rejects duplicate active incorporation", () => {
  const character = incorporateTemplate(createTemplateCharacter(), "template-001", {
    applicationId: "application-001",
  });

  assert.throws(() => {
    incorporateTemplate(character, "template-001", {
      applicationId: "application-002",
    });
  });
});

test("removes template package only after active incorporation is removed", () => {
  const incorporated = incorporateTemplate(createTemplateCharacter(), "template-001", {
    applicationId: "application-001",
  });

  assert.throws(() => {
    removeTemplatePackage(incorporated, "template-001");
  });

  const removed = removeTemplateApplication(incorporated, "application-001", {
    now: "2026-06-19T13:00:00.000Z",
  });
  const withoutPackage = removeTemplatePackage(removed, "template-001", {
    now: "2026-06-19T14:00:00.000Z",
  });

  assert.deepEqual(withoutPackage.templates, []);
  assert.equal(withoutPackage.templateApplications.length, 1);
  assert.equal(withoutPackage.templateApplications[0].status, "removed");
});

test("finds applications and rejects invalid lifecycle operations", () => {
  const original = createTemplateCharacter();

  assert.equal(findTemplateApplication(original, "missing"), null);

  assert.throws(() => {
    incorporateTemplate(original, "missing");
  });

  assert.throws(() => {
    removeTemplateApplication(original, "missing");
  });

  assert.throws(() => {
    removeTemplatePackage(original, "missing");
  });

  assert.throws(() => {
    incorporateTemplate(original, "template-001", {
      applicationId: "application-001",
      now: 123,
    });
  });
});
