import test from "node:test";
import assert from "node:assert/strict";

import {
  createTemplate,
  createTemplates,
  serializeTemplates,
} from "./Templates.js";
import {
  createAttributeContribution,
  createReferenceContribution,
  createSecondaryCharacteristicContribution,
  createSpecialRuleContribution,
  createTemplateComposition,
  createTemplateContribution,
  createTemplateReferenceContribution,
  getTemplateCompositionEntries,
  serializeTemplateComposition,
  validateTemplateComposition,
} from "./TemplateComposition.js";

function createDeclarativeTemplate() {
  return createTemplate({
    id: "template-declarative-elf",
    name: "Elfo declarativo",
    templateType: "race",
    entries: [
      createAttributeContribution({
        id: "entry-attribute-dx",
        attributeId: "attribute:DX",
        declaration: {
          operation: "modifier",
          amount: 1,
          unit: "level",
        },
      }),
      createSecondaryCharacteristicContribution({
        id: "entry-secondary-per",
        secondaryCharacteristicId: "secondary:Perception",
        declaration: {
          operation: "modifier",
          amount: 1,
          unit: "level",
        },
      }),
      createReferenceContribution({
        id: "entry-trait-reference",
        domain: "trait",
        entryType: "traitReference",
        referenceId: "trait:night-vision",
        declaration: { role: "include" },
      }),
      createReferenceContribution({
        id: "entry-skill-reference",
        domain: "skill",
        entryType: "skillReference",
        referenceId: "skill:bow",
        declaration: { points: 2 },
      }),
      createReferenceContribution({
        id: "entry-technique-reference",
        domain: "skill",
        entryType: "techniqueReference",
        referenceId: "technique:targeted-attack",
        declaration: { points: 1 },
      }),
      createReferenceContribution({
        id: "entry-language-reference",
        domain: "language",
        entryType: "languageReference",
        referenceId: "language:elvish",
        declaration: { spoken: "native", written: "native" },
      }),
      createReferenceContribution({
        id: "entry-culture-reference",
        domain: "culture",
        entryType: "cultureReference",
        referenceId: "culture:elven",
        declaration: { familiarity: true },
      }),
      createReferenceContribution({
        id: "entry-equipment-reference",
        domain: "equipment",
        entryType: "equipmentReference",
        referenceId: "equipment:elven-cloak",
        declaration: { quantity: 1 },
      }),
      createTemplateReferenceContribution({
        id: "entry-template-reference",
        templateId: "template-fey-ancestry",
        declaration: { relation: "include" },
      }),
      createSpecialRuleContribution({
        id: "entry-special-rule",
        declaration: {
          ruleId: "rule:ageless-appearance",
          parameters: { category: "appearance" },
        },
      }),
    ],
  });
}

test("classifies every declarative contribution without interpreting it", () => {
  const template = createDeclarativeTemplate();
  const composition = createTemplateComposition(template);

  assert.equal(composition.templateId, template.id);
  assert.deepEqual(composition.byDomain.attribute, ["entry-attribute-dx"]);
  assert.deepEqual(
    composition.byDomain.secondaryCharacteristic,
    ["entry-secondary-per"],
  );
  assert.deepEqual(composition.byDomain.trait, ["entry-trait-reference"]);
  assert.deepEqual(
    composition.byDomain.skill,
    ["entry-skill-reference", "entry-technique-reference"],
  );
  assert.deepEqual(composition.byDomain.template, ["entry-template-reference"]);
  assert.deepEqual(composition.byDomain.rule, ["entry-special-rule"]);
  assert.equal(composition.references.length, 9);
  assert.deepEqual(composition.ruleEntryIds, ["entry-special-rule"]);
  assert.deepEqual(composition.inlineEntryIds, []);
  assert.deepEqual(composition.opaqueEntryIds, []);

  const dx = composition.references.find(item => (
    item.entryId === "entry-attribute-dx"
  ));
  assert.equal(dx.referenceId, "attribute:DX");
  assert.deepEqual(dx.declaration, {
    operation: "modifier",
    amount: 1,
    unit: "level",
  });
});

test("does not calculate or normalize declarations owned by another domain", () => {
  const expression = {
    operation: "campaignFormula",
    expression: "base + sourceLevel * 2",
    importedResult: 7,
  };
  const contribution = createAttributeContribution({
    id: "entry-opaque-expression",
    attributeId: "attribute:ST",
    declaration: expression,
  });

  assert.deepEqual(contribution.payload, expression);
  assert.notEqual(contribution.payload, expression);
  assert.equal(Object.hasOwn(contribution.payload, "calculatedResult"), false);
});

test("requires explicit references for known reference contribution types", () => {
  assert.throws(
    () => createTemplateContribution({
      id: "entry-missing-attribute",
      entryType: "attributeContribution",
      payload: { amount: 1 },
    }),
    /requires explicit referenceId/,
  );

  assert.throws(
    () => createTemplateContribution({
      id: "entry-missing-template",
      entryType: "templateReference",
      payload: { relation: "include" },
    }),
    /requires explicit referenceId/,
  );
});

test("never infers a reference from a matching name", () => {
  const template = createTemplate({
    id: "template-no-name-link",
    entries: [{
      id: "entry-name-only",
      domain: "unknown",
      entryType: "vendorExtension",
      payload: {
        name: "Visão Noturna",
        templateName: "Elfo",
      },
    }],
  });
  const composition = createTemplateComposition(template);

  assert.equal(template.entries[0].referenceId, null);
  assert.deepEqual(composition.references, []);
  assert.deepEqual(composition.opaqueEntryIds, ["entry-name-only"]);
});

test("preserves custom domains and explicit references for future modules", () => {
  const contribution = createReferenceContribution({
    id: "entry-custom-reference",
    domain: "campaignDoctrine",
    entryType: "campaignDoctrineReference",
    referenceId: "doctrine:moon-court",
    declaration: { status: "required" },
  });
  const template = createTemplate({
    id: "template-custom-domain",
    entries: [contribution],
  });
  const composition = createTemplateComposition(template);

  assert.deepEqual(composition.byDomain.campaignDoctrine, [
    "entry-custom-reference",
  ]);
  assert.equal(composition.references[0].referenceId, "doctrine:moon-court");
});

test("declares nested templates without resolving cycles or dependencies", () => {
  const template = createTemplate({
    id: "template-self-reference",
    entries: [createTemplateReferenceContribution({
      id: "entry-self-reference",
      templateId: "template-self-reference",
      declaration: { relation: "include" },
    })],
  });
  const composition = createTemplateComposition(template);

  assert.equal(composition.references[0].referenceId, template.id);
  assert.equal(composition.references[0].declaration.relation, "include");
});

test("classifies existing imported components as inline contributions", () => {
  const template = createTemplate({
    id: "template-inline-legacy",
    traits: {
      advantages: [{
        id: "adv-inline",
        name: "Visão Noturna",
        points: 5,
      }],
    },
    skills: [{
      id: "skill-inline",
      name: "Arco",
      points: 2,
    }],
  });
  const composition = createTemplateComposition(template);

  assert.equal(composition.inlineEntryIds.length, 2);
  assert.deepEqual(composition.byDomain.trait.length, 1);
  assert.deepEqual(composition.byDomain.skill.length, 1);
});

test("composition is derived, immutable and stable across save/load", () => {
  const template = createDeclarativeTemplate();
  const before = serializeTemplateComposition(createTemplateComposition(template));
  const serialized = serializeTemplates([template]);
  const restored = createTemplates(serialized)[0];
  const after = serializeTemplateComposition(createTemplateComposition(restored));

  assert.deepEqual(after, before);
  assert.equal(Object.isFrozen(createTemplateComposition(template)), true);
  assert.equal(Object.isFrozen(createTemplateComposition(template).byDomain), true);
  assert.equal(Object.isFrozen(createTemplateComposition(template).references), true);
});

test("returns domain entries as detached immutable declarations", () => {
  const template = createDeclarativeTemplate();
  const attributes = getTemplateCompositionEntries(template, "attribute");

  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].referenceId, "attribute:DX");
  assert.equal(Object.isFrozen(attributes), true);
  assert.equal(Object.isFrozen(attributes[0]), true);
});

test("rejects inconsistent externally supplied composition projections", () => {
  const composition = serializeTemplateComposition(
    createTemplateComposition(createDeclarativeTemplate()),
  );
  composition.byDomain.attribute = [];

  assert.throws(
    () => validateTemplateComposition(composition),
    /byDomain must contain every entry once/,
  );
});
