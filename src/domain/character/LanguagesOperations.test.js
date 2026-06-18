import test from "node:test";
import assert from "node:assert/strict";

import { createLanguages } from "./Languages.js";

import {
  addLanguage,
  removeLanguage,
  renameLanguage,
  setLanguageLevels,
  setLanguageImportedCost,
  updateLanguageNotes,
  addLanguageTag,
  removeLanguageTag,
} from "./LanguagesOperations.js";

test("adds language without mutating original", () => {
  const languages = createLanguages();

  const updated = addLanguage(languages, {
    id: "lang-001",
    externalIds: {},
    name: "Portuguese",
    spokenLevel: "native",
    writtenLevel: "native",
    importedCost: 0,
    notes: "",
    tags: [],
  });

  assert.equal(languages.length, 0);
  assert.equal(updated.length, 1);
});

test("removes language without mutating original", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Portuguese" },
  ]);

  const updated = removeLanguage(languages, "lang-001");

  assert.equal(languages.length, 1);
  assert.equal(updated.length, 0);
});

test("renames language without mutating original", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Old Name" },
  ]);

  const updated = renameLanguage(languages, "lang-001", "Portuguese");

  assert.equal(languages[0].name, "Old Name");
  assert.equal(updated[0].name, "Portuguese");
});

test("sets language levels without mutating original", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Portuguese" },
  ]);

  const updated = setLanguageLevels(languages, "lang-001", "native", "native");

  assert.equal(languages[0].spokenLevel, "none");
  assert.equal(updated[0].spokenLevel, "native");
  assert.equal(updated[0].writtenLevel, "native");
});

test("sets language imported cost without mutating original", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Portuguese", importedCost: null },
  ]);

  const updated = setLanguageImportedCost(languages, "lang-001", 0);

  assert.equal(languages[0].importedCost, null);
  assert.equal(updated[0].importedCost, 0);
});

test("throws on invalid imported cost", () => {
  const languages = createLanguages();

  assert.throws(() => {
    setLanguageImportedCost(languages, "lang-001", "0");
  });
});

test("updates language notes without mutating original", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Portuguese", notes: "" },
  ]);

  const updated = updateLanguageNotes(languages, "lang-001", "Native language.");

  assert.equal(languages[0].notes, "");
  assert.equal(updated[0].notes, "Native language.");
});

test("adds language tag without mutating original", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Portuguese", tags: [] },
  ]);

  const updated = addLanguageTag(languages, "lang-001", "native");

  assert.deepEqual(languages[0].tags, []);
  assert.deepEqual(updated[0].tags, ["native"]);
});

test("does not duplicate language tag", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Portuguese", tags: ["native"] },
  ]);

  const updated = addLanguageTag(languages, "lang-001", "native");

  assert.deepEqual(updated[0].tags, ["native"]);
});

test("removes language tag without mutating original", () => {
  const languages = createLanguages([
    { id: "lang-001", name: "Portuguese", tags: ["native"] },
  ]);

  const updated = removeLanguageTag(languages, "lang-001", "native");

  assert.deepEqual(languages[0].tags, ["native"]);
  assert.deepEqual(updated[0].tags, []);
});
