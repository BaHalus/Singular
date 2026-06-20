import test from "node:test";
import assert from "node:assert/strict";

import {
  createTemplate,
  createTemplates,
  serializeTemplates,
} from "./Templates.js";

test("creates a sovereign race template with canonical entries", () => {
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
      calculatedPoints: null,
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

  assert.equal(template.id, "template-001");
  assert.equal(template.templateType, "race");
  assert.equal(template.ancestry, "Human");
  assert.equal(template.importedPoints, 35);
  assert.equal(template.calculatedPoints, null);
  assert.deepEqual(template.source, {
    kind: "imported",
    provider: "gcs",
    format: "gct",
    reference: "B261",
    version: 2,
  });
  assert.equal(template.entries.length, 4);
  assert.equal(template.entries[0].entryType, "advantage");
  assert.equal(template.entries[1].entryType, "disadvantage");
  assert.equal(template.entries[2].entryType, "traitContainer");
  assert.equal(template.entries[3].entryType, "skill");
  assert.equal(template.traits.advantages.length, 1);
  assert.equal(template.traits.disadvantages.length, 1);
  assert.equal(template.traits.containers.length, 1);
  assert.equal(template.skills.length, 1);
  assert.equal(template.importMeta.originalExtension, ".gct");
  assert.deepEqual(template.raw, raw);
  assert.notEqual(template.raw, raw);
  assert.equal(Object.isFrozen(template), true);
  assert.equal(Object.isFrozen(template.entries), true);
  assert.equal(Object.isFrozen(template.entries[0].payload), true);
});

test("creates metatrait with negative imported points without calculating it", () => {
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
  assert.equal(templates[0].calculatedPoints, null);
  assert.equal(templates[0].traits.disadvantages.length, 1);
  assert.equal(templates[0].entries[0].entryType, "disadvantage");
});

test("preserves unknown entries without linking them by name", () => {
  const template = createTemplate({
    id: "template-unknown",
    name: "Pacote externo",
    templateType: "unknown",
    source: {
      kind: "external",
      provider: "campaign-tool",
      format: "json",
      reference: "campaign:alpha",
      version: "3.2",
      custom: { channel: "nightly" },
    },
    entries: [
      {
        id: "entry-unknown-1",
        domain: "unknown",
        entryType: "vendorExtension",
        externalIds: { vendor: "same-name-1" },
        payload: {
          name: "Lobo",
          vendorRule: { mode: "opaque", amount: 7 },
        },
        raw: { untouched: [1, 2, 3] },
      },
      {
        id: "entry-unknown-2",
        domain: "unknown",
        entryType: "vendorExtension",
        externalIds: { vendor: "same-name-2" },
        payload: {
          name: "Lobo",
          vendorRule: { mode: "opaque", amount: 9 },
        },
      },
    ],
  });

  assert.equal(template.entries.length, 2);
  assert.equal(template.entries[0].entryType, "vendorExtension");
  assert.deepEqual(
    template.entries[0].payload.vendorRule,
    { mode: "opaque", amount: 7 },
  );
  assert.deepEqual(template.entries[0].raw, { untouched: [1, 2, 3] });
  assert.equal(template.entries[0].referenceId, null);
  assert.equal(template.entries[1].referenceId, null);
  assert.equal(template.source.custom.channel, "nightly");
});

test("keeps imported and calculated points as separate declared values", () => {
  const template = createTemplate({
    id: "template-reconciled-later",
    importedPoints: 50,
    calculatedPoints: 47,
  });

  assert.equal(template.importedPoints, 50);
  assert.equal(template.calculatedPoints, 47);
});

test("serializes canonical entries and compatibility projections", () => {
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
  const restored = createTemplates(json);

  assert.equal(json[0].templateType, "form");
  assert.equal(json[0].entries.length, 2);
  assert.equal(json[0].entries[0].entryType, "spell");
  assert.equal(json[0].entries[1].entryType, "equipment");
  assert.equal(json[0].spells.length, 1);
  assert.equal(json[0].equipment.length, 1);
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { type: "template" });
  assert.deepEqual(serializeTemplates(restored), json);
});

test("rejects conflicting canonical and compatibility definitions", () => {
  assert.throws(() => createTemplate({
    id: "template-conflict",
    entries: [
      {
        id: "entry-advantage",
        domain: "trait",
        entryType: "advantage",
        payload: {
          id: "adv-001",
          name: "Visão Noturna",
          points: 5,
        },
      },
    ],
    traits: {
      advantages: [
        {
          id: "adv-001",
          name: "Visão Noturna",
          points: 10,
        },
      ],
    },
  }));
});

test("does not retain mutable references from input or serialization", () => {
  const input = {
    id: "template-immutable",
    externalIds: { gcs: "template-immutable" },
    entries: [
      {
        id: "entry-immutable",
        domain: "rule",
        entryType: "rule",
        payload: { nested: { amount: 3 } },
      },
    ],
    raw: { source: { value: 1 } },
  };
  const template = createTemplate(input);
  const serialized = serializeTemplates([template]);

  input.externalIds.gcs = "changed";
  input.entries[0].payload.nested.amount = 99;
  input.raw.source.value = 99;
  serialized[0].entries[0].payload.nested.amount = 41;
  serialized[0].raw.source.value = 41;

  assert.equal(template.externalIds.gcs, "template-immutable");
  assert.equal(template.entries[0].payload.nested.amount, 3);
  assert.equal(template.raw.source.value, 1);
});

test("rejects duplicate sovereign template and entry identities", () => {
  assert.throws(
    () => createTemplates([
      { id: "template-duplicate" },
      { id: "template-duplicate" },
    ]),
    /Template ids must be unique/,
  );

  assert.throws(
    () => createTemplate({
      id: "template-entry-duplicate",
      entries: [
        { id: "entry-duplicate", entryType: "unknown" },
        { id: "entry-duplicate", entryType: "unknown" },
      ],
    }),
    /Template entry ids must be unique/,
  );
});

test("rejects invalid template foundation fields", () => {
  assert.throws(() => createTemplates("templates"));

  assert.throws(() => createTemplates([
    {
      id: "template-001",
      templateType: "species",
    },
  ]));

  assert.throws(() => createTemplates([
    {
      id: "template-001",
      sourceVersion: -1,
      templateType: "race",
    },
  ]));

  assert.throws(() => createTemplates([
    {
      id: "template-001",
      templateType: "race",
      traits: {
        containers: "race",
      },
    },
  ]));

  assert.throws(() => createTemplate({
    id: "template-source-invalid",
    source: { kind: "invented" },
  }));

  assert.throws(() => createTemplate({
    id: "template-entry-invalid",
    entries: [{ id: "", entryType: "unknown" }],
  }));
});
