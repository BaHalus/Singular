import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  analyzeAlternateFormLinks,
  linkAlternateForms,
} from "./AlternateFormsLinker.js";

function createCharacterWithForms(overrides = {}) {
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
        id: "adv-form-bat",
        name: "Forma Alternativa",
        notes: "Morcego",
        points: 15,
      },
      {
        id: "adv-form-wolf",
        name: "Forma Alternativa: Lobo",
        points: 15,
      },
    ],
    templates: [
      {
        id: "template-bat",
        templateType: "form",
        name: "Forma de Morcego",
      },
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
      },
    ],
    ...overrides,
  });
}

test("analyzes unique canonical template links", () => {
  const report = analyzeAlternateFormLinks(createCharacterWithForms());

  assert.equal(report.candidates.length, 2);
  assert.equal(report.resolved.length, 2);
  assert.deepEqual(report.ambiguous, []);
  assert.deepEqual(report.unresolved, []);
  assert.equal(report.resolved[0].traitId, "adv-form-bat");
  assert.equal(report.resolved[0].templateId, "template-bat");
  assert.equal(report.resolved[0].matchMethod, "canonical-template-name");
  assert.equal(report.resolved[0].groupKey, "body");
  assert.equal(report.resolved[1].templateId, "template-wolf");
});

test("links multiple body forms into one set", () => {
  const original = createCharacterWithForms();
  const result = linkAlternateForms(original, {
    baseFormName: "Elfo Vampiro Humanoide",
  });

  assert.equal(result.report.createdSetIds.length, 1);
  assert.deepEqual(result.report.updatedSetIds, []);
  assert.equal(result.character.alternateFormSets.length, 1);

  const set = result.character.alternateFormSets[0];

  assert.equal(set.id, "form_set_linked_body");
  assert.equal(set.name, "Formas corporais");
  assert.equal(set.baseFormId, "form_set_linked_body_base");
  assert.equal(set.activeFormId, set.baseFormId);
  assert.equal(set.forms.length, 3);
  assert.equal(set.forms[0].name, "Elfo Vampiro Humanoide");
  assert.equal(set.forms[1].templateId, "template-bat");
  assert.equal(set.forms[1].sourceTraitId, "adv-form-bat");
  assert.equal(set.forms[2].templateId, "template-wolf");
  assert.equal(set.forms[2].sourceTraitId, "adv-form-wolf");
  assert.equal(set.importMeta.linkerGroupKey, "body");
  assert.deepEqual(original.alternateFormSets, []);
});

test("uses explicit template id before names", () => {
  const character = createCharacterWithForms({
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa",
        notes: "Nome errado",
        raw: {
          alternate_form_template_id: "template-wolf",
        },
      },
    ],
  });

  const report = analyzeAlternateFormLinks(character);

  assert.equal(report.resolved.length, 1);
  assert.equal(report.resolved[0].templateId, "template-wolf");
  assert.equal(report.resolved[0].matchMethod, "explicit-template-id");
});

test("preserves explicit independent groups", () => {
  const character = createCharacterWithForms({
    advantages: [
      {
        id: "adv-form-wolf",
        name: "Forma Alternativa: Lobo",
        alternateGroupId: "Corpo",
      },
      {
        id: "adv-form-armor",
        name: "Forma Alternativa: Blindado",
        alternateGroupId: "Revestimento",
        raw: {
          form_set_name: "Revestimentos",
        },
      },
    ],
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
      },
      {
        id: "template-armor",
        templateType: "form",
        name: "Forma Blindado",
      },
    ],
  });

  const result = linkAlternateForms(character);

  assert.equal(result.character.alternateFormSets.length, 2);
  assert.deepEqual(
    result.character.alternateFormSets.map(set => set.importMeta.linkerGroupKey),
    ["corpo", "revestimento"],
  );
  assert.equal(result.character.alternateFormSets[1].name, "Revestimentos");
});

test("does not invent target when trait has no target information", () => {
  const character = createCharacterWithForms({
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa",
        notes: "",
      },
    ],
  });

  const result = linkAlternateForms(character);

  assert.equal(result.report.unresolved.length, 1);
  assert.equal(result.report.unresolved[0].reason, "missing-target-name");
  assert.deepEqual(result.character.alternateFormSets, []);
  assert.equal(result.character, character);
});

test("does not link ambiguous template names", () => {
  const character = createCharacterWithForms({
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa (Lobo)",
      },
    ],
    templates: [
      {
        id: "template-wolf-a",
        templateType: "form",
        name: "Forma de Lobo",
      },
      {
        id: "template-wolf-b",
        templateType: "form",
        name: "Lobo",
      },
    ],
  });

  const result = linkAlternateForms(character);

  assert.equal(result.report.ambiguous.length, 1);
  assert.equal(result.report.ambiguous[0].reason, "ambiguous-template-name");
  assert.deepEqual(
    result.report.ambiguous[0].candidateTemplateIds,
    ["template-wolf-a", "template-wolf-b"],
  );
  assert.deepEqual(result.character.alternateFormSets, []);
});

test("reports missing explicit template id without name fallback", () => {
  const character = createCharacterWithForms({
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa: Lobo",
        raw: {
          target_template_id: "missing-template",
        },
      },
    ],
  });

  const report = analyzeAlternateFormLinks(character);

  assert.equal(report.unresolved.length, 1);
  assert.equal(report.unresolved[0].reason, "explicit-template-not-found");
  assert.equal(report.unresolved[0].explicitTemplateId, "missing-template");
  assert.deepEqual(report.resolved, []);
});

test("is idempotent and reports existing safe links", () => {
  const first = linkAlternateForms(createCharacterWithForms());
  const second = linkAlternateForms(first.character);

  assert.equal(second.character, first.character);
  assert.deepEqual(second.report.createdSetIds, []);
  assert.deepEqual(second.report.updatedSetIds, []);
  assert.equal(second.report.alreadyLinked.length, 2);
  assert.equal(second.character.alternateFormSets[0].forms.length, 3);
});

test("updates existing linker set with newly added form", () => {
  const firstCharacter = createCharacterWithForms({
    advantages: [
      {
        id: "adv-form-bat",
        name: "Forma Alternativa",
        notes: "Morcego",
      },
    ],
  });
  const first = linkAlternateForms(firstCharacter);
  const expanded = createCharacter({
    ...first.character,
    advantages: [
      ...first.character.advantages,
      {
        id: "adv-form-wolf",
        name: "Forma Alternativa: Lobo",
      },
    ],
  });
  const second = linkAlternateForms(expanded);

  assert.deepEqual(second.report.createdSetIds, []);
  assert.deepEqual(second.report.updatedSetIds, ["form_set_linked_body"]);
  assert.equal(second.character.alternateFormSets.length, 1);
  assert.equal(second.character.alternateFormSets[0].forms.length, 3);
});

test("does not overwrite manual existing links", () => {
  const character = createCharacterWithForms({
    advantages: [
      {
        id: "adv-form-bat",
        name: "Forma Alternativa",
        notes: "Morcego",
      },
    ],
    alternateFormSets: [
      {
        id: "manual-set",
        name: "Conjunto manual",
        baseFormId: "manual-base",
        activeFormId: "manual-base",
        forms: [
          {
            id: "manual-base",
            name: "Base",
          },
          {
            id: "manual-form",
            name: "Morcego manual",
            templateId: "template-wolf",
            sourceTraitId: "adv-form-bat",
          },
        ],
      },
    ],
  });

  const result = linkAlternateForms(character);

  assert.equal(result.report.ambiguous.length, 1);
  assert.equal(result.report.ambiguous[0].reason, "existing-link-conflict");
  assert.equal(result.character, character);
  assert.equal(result.character.alternateFormSets[0].forms[1].templateId, "template-wolf");
});

test("ignores unrelated advantages", () => {
  const character = createCharacterWithForms({
    advantages: [
      {
        id: "adv-flight",
        name: "Voo",
        points: 40,
      },
    ],
  });

  const report = analyzeAlternateFormLinks(character);

  assert.deepEqual(report.candidates, []);
  assert.deepEqual(report.resolved, []);
});

test("rejects malformed character input", () => {
  assert.throws(() => {
    analyzeAlternateFormLinks(null);
  });

  assert.throws(() => {
    analyzeAlternateFormLinks({
      advantages: [],
      templates: [],
      alternateFormSets: "sets",
    });
  });
});
