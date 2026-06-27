import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "../../domain/character/Character.js";
import {
  addLanguage,
  findLanguageById,
  removeLanguage,
  reorderLanguage,
  updateLanguage,
} from "../../domain/character/LanguagesOperations.js";
import {
  addFamiliarity,
  findFamiliarityById,
  removeFamiliarity,
  reorderFamiliarity,
  updateFamiliarity,
} from "../../domain/character/FamiliaritiesOperations.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createLanguageCultureCommandHandlerEntries,
  LANGUAGE_CULTURE_COMMAND_TYPES,
} from "./LanguageCultureCommandHandlers.js";

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-27T12:00:00.000Z" },
    idGenerator: { next: prefix => `${prefix}:language-culture-edit-${++sequence}` },
  };
}

function character() {
  return createCharacter({
    identity: { id: "character-language-culture-edit", name: "Iara", concept: "Diplomata" },
    languages: [
      {
        id: "language-native",
        name: "Português",
        spokenLevel: "native",
        writtenLevel: "native",
        isNative: true,
        importedCost: 0,
        reference: "B24",
        notes: "Idioma materno.",
        tags: ["materno"],
        raw: { source: "manual" },
      },
      {
        id: "language-elvish",
        name: "Élfico",
        spokenLevel: "accented",
        writtenLevel: "broken",
        importedCost: 3,
      },
    ],
    familiarities: [
      {
        id: "familiarity-western",
        name: "Ocidental",
        isNative: true,
        importedCost: 0,
        reference: "B23",
        notes: "Cultura base.",
      },
      { id: "familiarity-elven", name: "Élfica", importedCost: 1 },
    ],
    traits: [
      { id: "trait-status", role: "advantage", name: "Status", points: 5 },
    ],
  });
}

function session() {
  return createApplicationSession({ id: "session-language-culture-edit", character: character() });
}

function registry() {
  return createCommandRegistry(createLanguageCultureCommandHandlerEntries());
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `command:${type}`,
    type,
    expectedRevision,
    issuedAt: "2026-06-27T12:00:00.000Z",
    payload,
  };
}

test("edits Languages and Familiarities immutably without calculating costs", () => {
  const beforeLanguages = character().languages;
  const addedLanguages = addLanguage(beforeLanguages, {
    id: "language-dwarvish",
    name: "Anão",
    spokenLevel: "broken",
    writtenLevel: "none",
    importedCost: 1,
    reference: "Mesa",
  });
  const updatedLanguages = updateLanguage(addedLanguages, "language-dwarvish", {
    writtenLevel: "broken",
    notes: "Custo importado preservado; aplicação não calcula.",
  });
  const reorderedLanguages = reorderLanguage(updatedLanguages, "language-dwarvish", 0);
  const removedLanguages = removeLanguage(reorderedLanguages, "language-elvish");

  assert.equal(beforeLanguages.length, 2);
  assert.equal(addedLanguages.length, 3);
  assert.equal(findLanguageById(updatedLanguages, "language-dwarvish").importedCost, 1);
  assert.equal(reorderedLanguages[0].id, "language-dwarvish");
  assert.equal(findLanguageById(removedLanguages, "language-elvish"), null);

  const beforeFamiliarities = character().familiarities;
  const addedFamiliarities = addFamiliarity(beforeFamiliarities, {
    id: "familiarity-dwarven",
    name: "Anã",
    importedCost: 1,
    notes: "Declarado pelo importador.",
  });
  const updatedFamiliarities = updateFamiliarity(addedFamiliarities, "familiarity-dwarven", {
    isNative: false,
    reference: "Mesa",
  });
  const reorderedFamiliarities = reorderFamiliarity(updatedFamiliarities, "familiarity-dwarven", 0);
  const removedFamiliarities = removeFamiliarity(reorderedFamiliarities, "familiarity-elven");

  assert.equal(beforeFamiliarities.length, 2);
  assert.equal(findFamiliarityById(updatedFamiliarities, "familiarity-dwarven").importedCost, 1);
  assert.equal(reorderedFamiliarities[0].id, "familiarity-dwarven");
  assert.equal(findFamiliarityById(removedFamiliarities, "familiarity-elven"), null);
});

test("rejects unsupported patches, invalid reorders and non-portable payloads", () => {
  assert.throws(() => updateLanguage(character().languages, "language-native", { calculatedCost: 6 }), /unsupported fields/);
  assert.throws(() => reorderLanguage(character().languages, "language-native", 99), /target index is invalid/);
  assert.throws(() => removeFamiliarity(character().familiarities, "missing"), /Familiarity not found/);
  assert.throws(() => addLanguage(character().languages, { id: "bad", name: "Bad", raw: { fn: () => null } }), /JSON portable/);
  assert.throws(() => updateFamiliarity(character().familiarities, "familiarity-elven", { importMeta: { symbol: Symbol("bad") } }), /JSON portable/);
  assert.throws(() => updateLanguage(character().languages, "language-elvish", { modifiers: [{ value: Number.NaN }] }), /JSON portable/);
  assert.throws(() => addLanguage(character().languages, "oops"), /Language input must be an object/);
  assert.throws(() => addLanguage(character().languages, []), /Language input must be an object/);
  assert.throws(() => addFamiliarity(character().familiarities, "oops"), /Familiarity input must be an object/);
  assert.throws(() => addFamiliarity(character().familiarities, []), /Familiarity input must be an object/);

  const cyclic = { id: "language-cyclic", name: "Cíclico" };
  cyclic.raw = { self: cyclic };
  assert.throws(() => addLanguage(character().languages, cyclic), /cycles/);
});

test("applies Language commands through CommandExecutor with revision and history", () => {
  const beforeSession = session();
  const beforeCharacter = serializeCharacter(beforeSession.character);
  const result = executeCommand(
    beforeSession,
    command(LANGUAGE_CULTURE_COMMAND_TYPES.ADD_LANGUAGE, {
      language: {
        id: "language-draconic",
        name: "Dracônico",
        spokenLevel: "broken",
        writtenLevel: "accented",
        isNative: false,
        importedCost: 3,
        reference: "Mesa",
        notes: "Preservar valores declarados.",
      },
    }),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.history[0].commandType, "language.add");
  assert.equal(result.session.character.languages.at(-1).id, "language-draconic");
  assert.deepEqual(serializeCharacter(result.session.character).traits, beforeCharacter.traits);
});

test("updates, removes and reorders Languages and Familiarities by id", () => {
  const appRuntime = runtime();
  const commandRegistry = registry();
  const first = executeCommand(session(), command(LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_LANGUAGE, {
    languageId: "language-elvish",
    patch: { spokenLevel: "native", reference: "Mesa revisada" },
  }), commandRegistry, appRuntime);
  const second = executeCommand(first.session, command(LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_LANGUAGE, {
    languageId: "language-elvish",
    targetIndex: 0,
  }, 1), commandRegistry, appRuntime);
  const third = executeCommand(second.session, command(LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_FAMILIARITY, {
    familiarityId: "familiarity-elven",
    patch: { notes: "Contato prolongado." },
  }, 2), commandRegistry, appRuntime);
  const fourth = executeCommand(third.session, command(LANGUAGE_CULTURE_COMMAND_TYPES.REMOVE_FAMILIARITY, {
    familiarityId: "familiarity-western",
  }, 3), commandRegistry, appRuntime);

  assert.equal(first.status, "applied");
  assert.equal(first.session.character.languages[1].spokenLevel, "native");
  assert.equal(second.session.character.languages[0].id, "language-elvish");
  assert.equal(third.session.character.familiarities[1].notes, "Contato prolongado.");
  assert.equal(fourth.session.character.familiarities.length, 1);
  assert.equal(fourth.session.revision, 4);
});

test("returns no-op for unchanged update and same-position reorder", () => {
  const noChange = executeCommand(session(), command(LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_LANGUAGE, {
    languageId: "language-elvish",
    patch: { name: "Élfico" },
  }), registry(), runtime());
  const samePosition = executeCommand(session(), command(LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_FAMILIARITY, {
    familiarityId: "familiarity-elven",
    targetIndex: 1,
  }), registry(), runtime());

  assert.equal(noChange.status, "no-op");
  assert.equal(noChange.session.revision, 0);
  assert.equal(samePosition.status, "no-op");
  assert.equal(samePosition.session.revision, 0);
});
