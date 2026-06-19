import test from "node:test";
import assert from "node:assert/strict";

import {
  createAlternateFormSets,
  serializeAlternateFormSets,
} from "./AlternateForms.js";

test("creates alternate form set with explicit base form", () => {
  const sets = createAlternateFormSets([
    {
      id: "set-001",
      name: "Formas do Vampiro",
      mechanism: "alternateForm",
      sourceTraitId: "adv-forma-alternativa",
      baseFormId: "form-base",
      activeFormId: "form-base",
      forms: [
        {
          id: "form-base",
          name: "Forma Humanoide",
          templateId: null,
        },
        {
          id: "form-bat",
          name: "Morcego",
          templateId: "template-bat",
          sourceTraitId: "adv-forma-morcego",
          state: { HP: 8 },
        },
      ],
      tags: ["Vampiro"],
    },
  ]);

  const set = sets[0];

  assert.equal(set.baseFormId, "form-base");
  assert.equal(set.activeFormId, "form-base");
  assert.equal(set.activeActivationId, null);
  assert.equal(set.forms.length, 2);
  assert.equal(set.forms[1].templateId, "template-bat");
  assert.deepEqual(set.forms[1].state, { HP: 8 });
});

test("defaults active form to base form", () => {
  const sets = createAlternateFormSets([
    {
      id: "set-001",
      name: "Formas do Licantropo",
      forms: [
        {
          id: "form-base",
          name: "Humanoide",
        },
        {
          id: "form-wolf",
          name: "Lobo",
          templateId: "template-wolf",
        },
      ],
    },
  ]);

  assert.equal(sets[0].baseFormId, "form-base");
  assert.equal(sets[0].activeFormId, "form-base");
});

test("supports morph mechanism for future integration", () => {
  const sets = createAlternateFormSets([
    {
      id: "set-001",
      name: "Morfo",
      mechanism: "morph",
      forms: [
        {
          id: "form-base",
          name: "Forma-base",
        },
      ],
    },
  ]);

  assert.equal(sets[0].mechanism, "morph");
});

test("serializes alternate form state", () => {
  const sets = createAlternateFormSets([
    {
      id: "set-001",
      name: "Formas do Vampiro",
      baseFormId: "form-base",
      activeFormId: "form-bat",
      activeActivationId: "activation-001",
      activeSince: "2026-06-19T12:00:00.000Z",
      forms: [
        {
          id: "form-base",
          name: "Humanoide",
        },
        {
          id: "form-bat",
          name: "Morcego",
          templateId: "template-bat",
          importMeta: { source: "singular" },
        },
      ],
      importMeta: { source: "singular" },
    },
  ]);

  const json = serializeAlternateFormSets(sets);

  assert.equal(json[0].activeFormId, "form-bat");
  assert.equal(json[0].activeActivationId, "activation-001");
  assert.equal(json[0].activeSince, "2026-06-19T12:00:00.000Z");
  assert.deepEqual(json[0].forms[1].importMeta, { source: "singular" });
});

test("rejects invalid alternate form sets", () => {
  assert.throws(() => {
    createAlternateFormSets("forms");
  });

  assert.throws(() => {
    createAlternateFormSets([
      {
        id: "set-001",
        name: "Sem formas",
        forms: [],
      },
    ]);
  });

  assert.throws(() => {
    createAlternateFormSets([
      {
        id: "set-001",
        name: "Base inválida",
        baseFormId: "missing",
        forms: [
          {
            id: "form-base",
            name: "Base",
          },
        ],
      },
    ]);
  });

  assert.throws(() => {
    createAlternateFormSets([
      {
        id: "set-001",
        name: "Formas",
        mechanism: "shapechange",
        forms: [
          {
            id: "form-base",
            name: "Base",
          },
        ],
      },
    ]);
  });

  assert.throws(() => {
    createAlternateFormSets([
      {
        id: "set-001",
        name: "Duplicadas",
        forms: [
          {
            id: "form-base",
            name: "Base",
          },
          {
            id: "form-base",
            name: "Outra",
          },
        ],
      },
    ]);
  });
});
