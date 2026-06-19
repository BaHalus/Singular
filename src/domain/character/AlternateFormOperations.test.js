import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  activateAlternateForm,
  switchAlternateForm,
  deactivateAlternateForm,
  getActiveAlternateForm,
  getActiveAlternateForms,
} from "./AlternateFormOperations.js";

function createShapechanger() {
  return createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Elfo Vampiro",
      playerId: null,
      campaignId: null,
    },
    advantages: [
      {
        id: "adv-elf",
        name: "Longevidade Élfica",
        points: 2,
        importMeta: {
          templateApplicationId: "application-elf",
          templateId: "template-elf",
        },
      },
      {
        id: "adv-vampire",
        name: "Não Respira",
        points: 20,
        importMeta: {
          templateApplicationId: "application-vampire",
          templateId: "template-vampire",
        },
      },
    ],
    templates: [
      {
        id: "template-bat",
        templateType: "form",
        name: "Forma de Morcego",
        importedPoints: 35,
        traits: {
          advantages: [
            {
              id: "adv-bat-flight",
              name: "Voo",
              points: 40,
            },
          ],
          disadvantages: [
            {
              id: "disadv-bat-size",
              name: "Tamanho Reduzido",
              points: -10,
            },
          ],
        },
        skills: [
          {
            id: "skill-bat",
            name: "Voo",
            attribute: "DX",
            difficulty: "A",
            points: 2,
          },
        ],
        techniques: [
          {
            id: "tech-bat",
            name: "Mergulho",
            skillId: "skill-bat",
            skillName: "Voo",
            difficulty: "H",
            points: 1,
          },
        ],
      },
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
        importedPoints: 45,
        traits: {
          advantages: [
            {
              id: "adv-wolf-teeth",
              name: "Dentes Afiados",
              points: 1,
              weapons: [
                {
                  type: "melee_weapon",
                  usage: "Mordida",
                },
              ],
            },
          ],
        },
        equipment: [
          {
            id: "eq-wolf-collar",
            name: "Coleira",
            cost: 10,
            weightKg: 0.1,
          },
        ],
      },
      {
        id: "template-armored",
        templateType: "form",
        name: "Revestimento Blindado",
        importedPoints: 20,
        traits: {
          advantages: [
            {
              id: "adv-armor-dr",
              name: "Resistência a Dano",
              points: 20,
            },
          ],
        },
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Formas Vampíricas",
        baseFormId: "form-humanoid",
        activeFormId: "form-humanoid",
        forms: [
          {
            id: "form-humanoid",
            name: "Elfo Vampiro Humanoide",
            templateId: null,
          },
          {
            id: "form-bat",
            name: "Morcego",
            templateId: "template-bat",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: "template-wolf",
          },
        ],
      },
      {
        id: "set-armor",
        name: "Revestimento",
        baseFormId: "form-unarmored",
        activeFormId: "form-unarmored",
        forms: [
          {
            id: "form-unarmored",
            name: "Sem Revestimento",
            templateId: null,
          },
          {
            id: "form-armored",
            name: "Blindado",
            templateId: "template-armored",
          },
        ],
      },
    ],
    templateApplications: [
      {
        id: "application-elf",
        templateId: "template-elf",
        templateName: "Elfo",
        templateType: "race",
        status: "active",
        appliedAt: "2026-06-19T08:00:00.000Z",
      },
      {
        id: "application-vampire",
        templateId: "template-vampire",
        templateName: "Vampiro",
        templateType: "template",
        status: "active",
        appliedAt: "2026-06-19T09:00:00.000Z",
      },
    ],
    metadata: {
      createdAt: "2026-06-19T07:00:00.000Z",
      updatedAt: "2026-06-19T09:00:00.000Z",
      source: "singular",
    },
  });
}

test("switches humanoid to bat to wolf without leaving residues", () => {
  const base = createShapechanger();
  const bat = activateAlternateForm(base, "set-body", "form-bat", {
    activationId: "activation-bat",
    now: "2026-06-19T10:00:00.000Z",
  });

  assert.equal(getActiveAlternateForm(bat, "set-body").id, "form-bat");
  assert.equal(bat.alternateFormSets[0].activeActivationId, "activation-bat");
  assert.equal(bat.advantages.length, 3);
  assert.equal(bat.disadvantages.length, 1);
  assert.equal(bat.skills.length, 1);
  assert.equal(bat.techniques.length, 1);
  assert.equal(
    bat.techniques[0].skillId,
    bat.skills[0].id,
  );

  const wolf = switchAlternateForm(bat, "set-body", "form-wolf", {
    activationId: "activation-wolf",
    now: "2026-06-19T11:00:00.000Z",
  });

  assert.equal(getActiveAlternateForm(wolf, "set-body").id, "form-wolf");
  assert.equal(wolf.alternateFormSets[0].activeActivationId, "activation-wolf");
  assert.equal(wolf.advantages.length, 3);
  assert.equal(wolf.disadvantages.length, 0);
  assert.equal(wolf.skills.length, 0);
  assert.equal(wolf.techniques.length, 0);
  assert.equal(wolf.equipment.length, 1);
  assert.equal(wolf.advantages.some(item => item.name === "Voo"), false);
  assert.equal(wolf.advantages.some(item => item.name === "Dentes Afiados"), true);
  assert.equal(
    wolf.advantages.find(item => item.name === "Dentes Afiados")
      .importMeta.alternateFormSetId,
    "set-body",
  );

  const humanoid = deactivateAlternateForm(wolf, "set-body", {
    now: "2026-06-19T12:00:00.000Z",
  });

  assert.equal(getActiveAlternateForm(humanoid, "set-body").id, "form-humanoid");
  assert.equal(humanoid.alternateFormSets[0].activeActivationId, null);
  assert.equal(humanoid.advantages.length, 2);
  assert.deepEqual(humanoid.disadvantages, []);
  assert.deepEqual(humanoid.skills, []);
  assert.deepEqual(humanoid.techniques, []);
  assert.deepEqual(humanoid.equipment, []);
  assert.equal(humanoid.metadata.updatedAt, "2026-06-19T12:00:00.000Z");
});

test("preserves permanent elf and vampire templates during form changes", () => {
  const bat = activateAlternateForm(createShapechanger(), "set-body", "form-bat", {
    activationId: "activation-bat",
  });
  const humanoid = deactivateAlternateForm(bat, "set-body");

  assert.equal(humanoid.advantages.length, 2);
  assert.equal(humanoid.advantages[0].id, "adv-elf");
  assert.equal(humanoid.advantages[1].id, "adv-vampire");
  assert.equal(humanoid.templateApplications.length, 2);
  assert.equal(humanoid.templateApplications.every(item => item.status === "active"), true);
});

test("allows one active form in each independent set", () => {
  const body = activateAlternateForm(createShapechanger(), "set-body", "form-wolf", {
    activationId: "activation-wolf",
  });
  const both = activateAlternateForm(body, "set-armor", "form-armored", {
    activationId: "activation-armor",
  });

  const active = getActiveAlternateForms(both);

  assert.equal(active.length, 2);
  assert.equal(active[0].form.id, "form-wolf");
  assert.equal(active[1].form.id, "form-armored");
  assert.equal(both.advantages.some(item => item.name === "Dentes Afiados"), true);
  assert.equal(both.advantages.some(item => item.name === "Resistência a Dano"), true);

  const bat = switchAlternateForm(both, "set-body", "form-bat", {
    activationId: "activation-bat",
  });

  assert.equal(getActiveAlternateForm(bat, "set-body").id, "form-bat");
  assert.equal(getActiveAlternateForm(bat, "set-armor").id, "form-armored");
  assert.equal(bat.advantages.some(item => item.name === "Resistência a Dano"), true);
  assert.equal(bat.advantages.some(item => item.name === "Dentes Afiados"), false);
  assert.equal(bat.advantages.some(item => item.name === "Voo"), true);
});

test("does not create template application history for form switches", () => {
  const base = createShapechanger();
  const bat = activateAlternateForm(base, "set-body", "form-bat", {
    activationId: "activation-bat",
  });
  const wolf = switchAlternateForm(bat, "set-body", "form-wolf", {
    activationId: "activation-wolf",
  });

  assert.equal(base.templateApplications.length, 2);
  assert.equal(bat.templateApplications.length, 2);
  assert.equal(wolf.templateApplications.length, 2);
});

test("treats activation of already active form as idempotent", () => {
  const character = createShapechanger();
  const result = activateAlternateForm(
    character,
    "set-body",
    "form-humanoid",
  );

  assert.equal(result, character);
});

test("rejects invalid form transitions", () => {
  const character = createShapechanger();

  assert.throws(() => {
    activateAlternateForm(character, "missing", "form-bat");
  });

  assert.throws(() => {
    activateAlternateForm(character, "set-body", "missing");
  });

  const missingTemplateCharacter = createCharacter({
    ...character,
    templates: character.templates.filter(item => item.id !== "template-bat"),
  });

  assert.throws(() => {
    activateAlternateForm(
      missingTemplateCharacter,
      "set-body",
      "form-bat",
    );
  });

  assert.throws(() => {
    activateAlternateForm(character, "set-body", "form-bat", {
      now: 123,
    });
  });
});
