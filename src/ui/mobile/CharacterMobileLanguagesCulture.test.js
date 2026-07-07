import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  projectCharacterForMobileSheet,
  serializeCharacterMobileProjection,
} from "./CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";
import {
  renderCharacterMobileSheetHtml,
} from "./CharacterMobileSheetHtml.js";

function createMulticulturalCharacter() {
  return createCharacter({
    identity: {
      id: "character-languages-culture",
      name: "Ayla",
    },
    languages: [
      {
        id: "language_portuguese",
        name: "Português",
        spokenLevel: "native",
        writtenLevel: "native",
        isNative: true,
        importedCost: 0,
        reference: "B24",
        notes: "Idioma materno",
      },
      {
        id: "language_english",
        name: "Inglês",
        spokenLevel: "accented",
        writtenLevel: "broken",
        importedCost: 4,
        notes: "Aprendido em viagens",
      },
    ],
    familiarities: [
      {
        id: "familiarity_brazilian",
        name: "Brasileira",
        isNative: true,
        importedCost: 0,
        notes: "Cultura de origem",
      },
      {
        id: "familiarity_yrth",
        name: "Yrth",
        importedCost: 1,
        reference: "Banestorm",
      },
    ],
  });
}

test("projects languages and cultural familiarities without calculating costs", () => {
  const projection = projectCharacterForMobileSheet(createMulticulturalCharacter());

  assert.equal(projection.schemaVersion, 7);
  assert.deepEqual(projection.languages, [
    {
      id: "language_portuguese",
      name: "Português",
      spokenLevel: "native",
      writtenLevel: "native",
      isNative: true,
      importedCost: 0,
      reference: "B24",
      notes: "Idioma materno",
      status: "declared",
    },
    {
      id: "language_english",
      name: "Inglês",
      spokenLevel: "accented",
      writtenLevel: "broken",
      isNative: false,
      importedCost: 4,
      reference: null,
      notes: "Aprendido em viagens",
      status: "declared",
    },
  ]);
  assert.equal(projection.familiarities[0].isNative, true);
  assert.equal(projection.familiarities[1].importedCost, 1);
  assert.equal(
    projection.sections.find(section => section.id === "languages-culture").status,
    "declared-only",
  );
  assert.equal(Object.isFrozen(projection.languages), true);
  assert.equal(Object.isFrozen(projection.familiarities), true);
});

test("creates namespaced language and familiarity items in one mobile card", () => {
  const model = createCharacterMobileSheetRenderModel(
    projectCharacterForMobileSheet(createMulticulturalCharacter()),
  );
  const card = model.cards.find(candidate => candidate.id === "languages-culture");

  assert.equal(model.schemaVersion, 6);
  assert.equal(card.status, "declared-only");
  assert.deepEqual(
    card.items.map(item => [
      item.id,
      item.canonicalId,
      item.entryKind,
      item.importedCost,
    ]),
    [
      ["language:language_portuguese", "language_portuguese", "language", 0],
      ["language:language_english", "language_english", "language", 4],
      ["familiarity:familiarity_brazilian", "familiarity_brazilian", "familiarity", 0],
      ["familiarity:familiarity_yrth", "familiarity_yrth", "familiarity", 1],
    ],
  );
});

test("renders fluency, nativities and imported costs explicitly", () => {
  const html = renderCharacterMobileSheetHtml(
    createCharacterMobileSheetRenderModel(
      projectCharacterForMobileSheet(createMulticulturalCharacter()),
    ),
    { mode: "table" },
  );

  assert.match(html, /data-schema-version="13"/);
  assert.match(html, /data-card="languages-culture" data-status="declared-only"/);
  assert.match(
    html,
    /data-entry-kind="language" data-canonical-id="language_portuguese"/,
  );
  assert.match(html, /Português <small>Fala Nativo · Escrita Nativo · Idioma nativo · Custo importado 0 pts · Ref\. B24 · Idioma materno<\/small>/);
  assert.match(html, /Inglês <small>Fala Com sotaque · Escrita Rudimentar · Custo importado 4 pts · Aprendido em viagens<\/small>/);
  assert.match(
    html,
    /data-entry-kind="familiarity" data-canonical-id="familiarity_brazilian"/,
  );
  assert.match(html, /Brasileira <small>Cultura nativa · Custo importado 0 pts · Cultura de origem<\/small>/);
  assert.match(html, /Yrth <small>Custo importado 1 pts · Ref\. Banestorm<\/small>/);
});

test("keeps the empty languages and culture state explicit", () => {
  const projection = projectCharacterForMobileSheet(createCharacter({
    identity: {
      id: "character-no-languages-culture",
      name: "Sem Idiomas",
    },
  }));
  const model = createCharacterMobileSheetRenderModel(projection);
  const html = renderCharacterMobileSheetHtml(model, { mode: "table" });

  assert.deepEqual(projection.languages, []);
  assert.deepEqual(projection.familiarities, []);
  assert.equal(
    projection.sections.find(section => section.id === "languages-culture").status,
    "empty",
  );
  assert.equal(
    model.cards.find(card => card.id === "languages-culture").status,
    "empty",
  );
  assert.match(html, /data-section="languages-culture" data-status="empty"/);
  assert.match(html, /Nenhum idioma ou familiaridade cultural declarado/);
});

test("rejects non-finite imported costs before serialization", () => {
  const projection = serializeCharacterMobileProjection(
    projectCharacterForMobileSheet(createMulticulturalCharacter()),
  );
  projection.languages[0].importedCost = Number.POSITIVE_INFINITY;

  assert.throws(
    () => serializeCharacterMobileProjection(projection),
    /Mobile language language_portuguese importedCost must be a finite number or null/,
  );
});
