import test from "node:test";
import assert from "node:assert/strict";

import {
  createLanguages,
  createLanguage,
  validateLanguages,
  serializeLanguages,
} from "./Languages.js";

test("creates empty languages list", () => {
  const languages = createLanguages();

  assert.deepEqual(languages, []);
});

test("creates language with defaults", () => {
  const language = createLanguage();

  assert.ok(language.id);
  assert.deepEqual(language.externalIds, {});
  assert.equal(language.name, "");
  assert.equal(language.spokenLevel, "none");
  assert.equal(language.writtenLevel, "none");
  assert.equal(language.importedCost, null);
  assert.equal(language.notes, "");
  assert.deepEqual(language.tags, []);
});

test("creates language from input", () => {
  const language = createLanguage({
    id: "lang-001",
    externalIds: { gcs: "gcs-lang-001" },
    name: "Portuguese",
    spokenLevel: "native",
    writtenLevel: "native",
    importedCost: 0,
    notes: "Native language.",
    tags: ["native"],
  });

  assert.equal(language.id, "lang-001");
  assert.equal(language.externalIds.gcs, "gcs-lang-001");
  assert.equal(language.name, "Portuguese");
  assert.equal(language.spokenLevel, "native");
  assert.equal(language.writtenLevel, "native");
  assert.equal(language.importedCost, 0);
  assert.deepEqual(language.tags, ["native"]);
});

test("validates valid languages", () => {
  const languages = createLanguages();

  assert.equal(validateLanguages(languages), true);
});

test("serializes languages", () => {
  const languages = createLanguages([
    {
      id: "lang-001",
      externalIds: { gcs: "gcs-lang-001" },
      name: "Portuguese",
      spokenLevel: "native",
      writtenLevel: "native",
      importedCost: 0,
      tags: ["native"],
    },
  ]);

  const json = serializeLanguages(languages);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "lang-001");
  assert.equal(json[0].externalIds.gcs, "gcs-lang-001");
  assert.equal(json[0].spokenLevel, "native");
  assert.equal(json[0].writtenLevel, "native");
});

test("throws when languages is not array", () => {
  assert.throws(() => {
    createLanguages("Portuguese");
  });
});

test("throws when language externalIds is invalid", () => {
  assert.throws(() => {
    createLanguages([{ id: "lang-001", externalIds: "gcs-lang-001", name: "Portuguese" }]);
  });
});

test("throws when language name is invalid", () => {
  assert.throws(() => {
    createLanguages([{ id: "lang-001", name: 123 }]);
  });
});

test("throws when spoken level is invalid", () => {
  assert.throws(() => {
    createLanguages([{ id: "lang-001", name: "Portuguese", spokenLevel: "fluent" }]);
  });
});

test("throws when written level is invalid", () => {
  assert.throws(() => {
    createLanguages([{ id: "lang-001", name: "Portuguese", writtenLevel: "fluent" }]);
  });
});

test("throws when imported cost is invalid", () => {
  assert.throws(() => {
    createLanguages([{ id: "lang-001", name: "Portuguese", importedCost: "0" }]);
  });
});

test("throws when language tags is invalid", () => {
  assert.throws(() => {
    createLanguages([{ id: "lang-001", name: "Portuguese", tags: "native" }]);
  });
});
