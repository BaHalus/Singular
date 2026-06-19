import test from "node:test";
import assert from "node:assert/strict";

import { importLanguages } from "./LanguagesImporter.js";

test("imports language trait modifiers into spoken and written levels", () => {
  const raw = {
    id: "lang-001",
    name: "Idioma: Élfico",
    reference: "B24",
    local_notes: "Idioma aprendido em viagem.",
    tags: ["Idioma", "Mental", "Vantagem"],
    modifiers: [
      {
        id: "mod-spoken",
        name: "Falada",
        local_notes: "Com Sotaque",
        cost_adj: "2",
      },
      {
        id: "mod-written",
        name: "Escrita",
        local_notes: "Rudimentar",
        cost_adj: "1",
      },
      {
        id: "mod-native",
        name: "Materna",
        cost_adj: "-6",
        disabled: true,
      },
    ],
    calc: { points: 3 },
  };

  const result = importLanguages([
    {
      id: "lang-001",
      externalIds: { gcs: "lang-001" },
      specialKind: "language",
      name: raw.name,
      modifiers: raw.modifiers,
      prereqs: null,
      tags: raw.tags,
      importMeta: { source: "gcs", containerIds: ["culture-001"] },
      raw,
    },
  ]);

  assert.equal(result.languages.length, 1);
  assert.equal(result.unknownNodes.length, 0);

  const language = result.languages[0];

  assert.equal(language.id, "lang-001");
  assert.equal(language.externalIds.gcs, "lang-001");
  assert.equal(language.name, "Élfico");
  assert.equal(language.spokenLevel, "accented");
  assert.equal(language.writtenLevel, "broken");
  assert.equal(language.isNative, false);
  assert.equal(language.importedCost, 3);
  assert.equal(language.reference, "B24");
  assert.equal(language.notes, "Idioma aprendido em viagem.");
  assert.deepEqual(language.importMeta.containerIds, ["culture-001"]);
  assert.equal(language.raw, raw);
});

test("imports native language from active Materna modifier", () => {
  const result = importLanguages([
    {
      id: "lang-001",
      name: "Idioma: Português",
      modifiers: [
        {
          name: "Materna",
          cost_adj: "-6",
        },
      ],
      calc: { points: 0 },
      tags: ["Idioma", "Vantagem"],
    },
  ]);

  const language = result.languages[0];

  assert.equal(language.name, "Português");
  assert.equal(language.spokenLevel, "native");
  assert.equal(language.writtenLevel, "native");
  assert.equal(language.isNative, true);
  assert.equal(language.importedCost, 0);
  assert.ok(language.tags.includes("native"));
});

test("imports direct language data and Portuguese level labels", () => {
  const result = importLanguages({
    languages: [
      {
        id: "lang-001",
        language_name: "Anão",
        spoken_level: "Rudimentar",
        written_level: "Com Sotaque",
        imported_cost: "3",
        native: false,
      },
    ],
  });

  const language = result.languages[0];

  assert.equal(language.name, "Anão");
  assert.equal(language.spokenLevel, "broken");
  assert.equal(language.writtenLevel, "accented");
  assert.equal(language.importedCost, 3);
});

test("preserves sign language without inventing written proficiency", () => {
  const result = importLanguages([
    {
      id: "lang-001",
      name: "Linguagem de Sinais: Mercantil",
      modifiers: [
        {
          name: "Sinais",
          local_notes: "Com Sotaque",
        },
      ],
      calc: { points: 2 },
      tags: ["Idioma"],
    },
  ]);

  const language = result.languages[0];

  assert.equal(language.name, "Mercantil");
  assert.equal(language.spokenLevel, "accented");
  assert.equal(language.writtenLevel, "none");
  assert.ok(language.tags.includes("mode:signed"));
  assert.equal(language.importMeta.mode, "signed");
});

test("preserves unnamed language nodes separately", () => {
  const result = importLanguages([
    {
      id: "unknown-001",
      name: "",
    },
  ]);

  assert.deepEqual(result.languages, []);
  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.unknownNodes[0].id, "unknown-001");
});

test("rejects invalid language source and fields", () => {
  assert.throws(() => {
    importLanguages("languages");
  });

  assert.throws(() => {
    importLanguages(["language"]);
  });

  assert.throws(() => {
    importLanguages([
      {
        id: "lang-001",
        name: "Idioma: Élfico",
        modifiers: "Falada",
      },
    ]);
  });
});
