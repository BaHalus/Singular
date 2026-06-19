import test from "node:test";
import assert from "node:assert/strict";

import {
  importCharacter,
  importCharacterWithDiagnostics,
} from "./CharacterImporter.js";

test("automatically links safe alternate forms after character import", () => {
  const source = {
    id: "char-001",
    profile: {
      name: "Eldrin",
    },
    advantages: [
      {
        type: "advantage",
        id: "adv-form-bat",
        name: "Forma Alternativa",
        notes: "Morcego",
        base_points: 15,
        calc: { points: 15 },
        categories: ["Vantagem"],
      },
      {
        type: "advantage",
        id: "adv-form-wolf",
        name: "Forma Alternativa: Lobo",
        base_points: 15,
        calc: { points: 15 },
        categories: ["Vantagem"],
      },
    ],
    templates: [
      {
        type: "template",
        version: 2,
        id: "template-bat",
        name: "Forma de Morcego",
      },
      {
        type: "template",
        version: 2,
        id: "template-wolf",
        name: "Forma de Lobo",
      },
    ],
  };

  const character = importCharacter(source);

  assert.equal(character.alternateFormSets.length, 1);
  assert.equal(character.alternateFormSets[0].forms.length, 3);
  assert.equal(character.alternateFormSets[0].activeFormId, "form_set_linked_body_base");
  assert.equal(character.alternateFormSets[0].forms[1].templateId, "template-bat");
  assert.equal(character.alternateFormSets[0].forms[2].templateId, "template-wolf");
});

test("returns alternate form link diagnostics", () => {
  const source = {
    id: "char-001",
    profile: {
      name: "Eldrin",
    },
    advantages: [
      {
        type: "advantage",
        id: "adv-form",
        name: "Forma Alternativa",
        notes: "Morcego",
        calc: { points: 15 },
        categories: ["Vantagem"],
      },
    ],
    templates: [
      {
        type: "template",
        version: 2,
        id: "template-bat-a",
        name: "Forma de Morcego",
      },
      {
        type: "template",
        version: 2,
        id: "template-bat-b",
        name: "Morcego",
      },
    ],
  };

  const result = importCharacterWithDiagnostics(source);

  assert.equal(result.alternateFormLinkReport.ambiguous.length, 1);
  assert.equal(
    result.alternateFormLinkReport.ambiguous[0].reason,
    "ambiguous-template-name",
  );
  assert.deepEqual(result.character.alternateFormSets, []);
  assert.equal(result.snapshot.templates.length, 2);
});

test("does not invent alternate form link when imported trait lacks target", () => {
  const result = importCharacterWithDiagnostics({
    id: "char-001",
    profile: {
      name: "Eldrin",
    },
    advantages: [
      {
        type: "advantage",
        id: "adv-form",
        name: "Forma Alternativa",
        calc: { points: 15 },
        categories: ["Vantagem"],
      },
    ],
    templates: [
      {
        type: "template",
        version: 2,
        id: "template-bat",
        name: "Forma de Morcego",
      },
    ],
  });

  assert.equal(result.alternateFormLinkReport.unresolved.length, 1);
  assert.equal(
    result.alternateFormLinkReport.unresolved[0].reason,
    "missing-target-name",
  );
  assert.deepEqual(result.character.alternateFormSets, []);
});
