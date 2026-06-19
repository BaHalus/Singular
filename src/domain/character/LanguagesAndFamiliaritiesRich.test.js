import test from "node:test";
import assert from "node:assert/strict";

import {
  createLanguages,
  serializeLanguages,
} from "./Languages.js";
import {
  createFamiliarities,
  serializeFamiliarities,
} from "./Familiarities.js";

test("preserves rich imported language fields", () => {
  const raw = { id: "lang-001", name: "Idioma: Élfico" };

  const languages = createLanguages([
    {
      id: "lang-001",
      externalIds: { gcs: "gcs-lang-001" },
      name: "Élfico",
      spokenLevel: "accented",
      writtenLevel: "broken",
      isNative: false,
      importedCost: 3,
      reference: "B24",
      modifiers: [{ name: "Falada", local_notes: "Com Sotaque" }],
      prereqs: { type: "prereq_list", all: true, prereqs: [] },
      notes: "Importado do GCS.",
      tags: ["Idioma", "import:gcs"],
      importMeta: { source: "gcs", mode: "spokenWritten" },
      raw,
    },
  ]);

  const language = languages[0];

  assert.equal(language.isNative, false);
  assert.equal(language.reference, "B24");
  assert.equal(language.modifiers.length, 1);
  assert.deepEqual(language.prereqs, { type: "prereq_list", all: true, prereqs: [] });
  assert.deepEqual(language.importMeta, { source: "gcs", mode: "spokenWritten" });
  assert.equal(language.raw, raw);
});

test("serializes rich imported language fields", () => {
  const languages = createLanguages([
    {
      id: "lang-001",
      name: "Português",
      spokenLevel: "native",
      writtenLevel: "native",
      isNative: true,
      importedCost: 0,
      reference: "B24",
      modifiers: [],
      importMeta: { source: "gcs" },
      raw: { id: "lang-001" },
    },
  ]);

  const json = serializeLanguages(languages);

  assert.equal(json[0].isNative, true);
  assert.equal(json[0].reference, "B24");
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { id: "lang-001" });
});

test("preserves rich imported familiarity fields", () => {
  const raw = { id: "fam-001", name: "Familiaridade Cultural (Elfos)" };

  const familiarities = createFamiliarities([
    {
      id: "fam-001",
      externalIds: { gcs: "gcs-fam-001" },
      name: "Elfos",
      isNative: false,
      importedCost: 1,
      reference: "B23",
      modifiers: [{ name: "Nativa", disabled: true }],
      prereqs: { type: "prereq_list", all: true, prereqs: [] },
      notes: "Importada do GCS.",
      tags: ["Mental", "import:gcs"],
      importMeta: { source: "gcs" },
      raw,
    },
  ]);

  const familiarity = familiarities[0];

  assert.equal(familiarity.isNative, false);
  assert.equal(familiarity.reference, "B23");
  assert.equal(familiarity.modifiers.length, 1);
  assert.deepEqual(familiarity.prereqs, { type: "prereq_list", all: true, prereqs: [] });
  assert.deepEqual(familiarity.importMeta, { source: "gcs" });
  assert.equal(familiarity.raw, raw);
});

test("serializes rich imported familiarity fields", () => {
  const familiarities = createFamiliarities([
    {
      id: "fam-001",
      name: "Ocidental",
      isNative: true,
      importedCost: 0,
      reference: "B23",
      modifiers: [],
      importMeta: { source: "gcs" },
      raw: { id: "fam-001" },
    },
  ]);

  const json = serializeFamiliarities(familiarities);

  assert.equal(json[0].isNative, true);
  assert.equal(json[0].reference, "B23");
  assert.deepEqual(json[0].importMeta, { source: "gcs" });
  assert.deepEqual(json[0].raw, { id: "fam-001" });
});

test("rejects invalid rich language and familiarity fields", () => {
  assert.throws(() => {
    createLanguages([
      {
        id: "lang-001",
        name: "Élfico",
        isNative: "yes",
      },
    ]);
  });

  assert.throws(() => {
    createFamiliarities([
      {
        id: "fam-001",
        name: "Elfos",
        importMeta: [],
      },
    ]);
  });
});
