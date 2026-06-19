import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";

test("imports language and cultural familiarity traits without duplicating advantages", () => {
  const source = {
    id: "char-001",
    profile: { name: "Polyglot Hero" },
    traits: [
      {
        id: "adv-001",
        name: "Reflexos em Combate",
        base_points: 15,
        tags: ["Vantagem"],
      },
      {
        id: "lang-001",
        name: "Idioma: Élfico",
        reference: "B24",
        tags: ["Idioma", "Mental", "Vantagem"],
        modifiers: [
          {
            name: "Falada",
            local_notes: "Com Sotaque",
            cost_adj: "2",
          },
          {
            name: "Escrita",
            local_notes: "Rudimentar",
            cost_adj: "1",
          },
        ],
        calc: { points: 3 },
      },
      {
        id: "fam-001",
        name: "Familiaridade Cultural (Elfos)",
        reference: "B23",
        tags: ["Mental", "Vantagem"],
        modifiers: [
          {
            name: "Nativa",
            cost_adj: "-1",
            disabled: true,
          },
        ],
        base_points: 1,
        calc: { points: 1 },
      },
    ],
  };

  const snapshot = createSnapshotFromGcs(source);

  assert.equal(snapshot.traits.advantages.length, 1);
  assert.equal(snapshot.traits.languageNodes.length, 1);
  assert.equal(snapshot.traits.familiarityNodes.length, 1);
  assert.equal(snapshot.languageNodes.length, 1);
  assert.equal(snapshot.familiarityNodes.length, 1);
  assert.equal(snapshot.languages.length, 1);
  assert.equal(snapshot.familiarities.length, 1);
  assert.equal(snapshot.unknownLanguageNodes.length, 0);
  assert.equal(snapshot.unknownFamiliarityNodes.length, 0);

  const character = importCharacter(source);

  assert.equal(character.advantages.length, 1);
  assert.equal(character.advantages[0].name, "Reflexos em Combate");
  assert.equal(character.languages.length, 1);
  assert.equal(character.languages[0].name, "Élfico");
  assert.equal(character.languages[0].spokenLevel, "accented");
  assert.equal(character.languages[0].writtenLevel, "broken");
  assert.equal(character.languages[0].importedCost, 3);
  assert.equal(character.familiarities.length, 1);
  assert.equal(character.familiarities[0].name, "Elfos");
  assert.equal(character.familiarities[0].importedCost, 1);
});

test("imports native language and culture from active modifiers", () => {
  const character = importCharacter({
    id: "char-001",
    profile: { name: "Native Hero" },
    traits: [
      {
        id: "lang-001",
        name: "Idioma: Português",
        tags: ["Idioma", "Vantagem"],
        modifiers: [
          {
            name: "Materna",
            cost_adj: "-6",
          },
        ],
        calc: { points: 0 },
      },
      {
        id: "fam-001",
        name: "Familiaridade Cultural: Ocidental",
        tags: ["Vantagem"],
        modifiers: [
          {
            name: "Nativa",
            cost_adj: "-1",
          },
        ],
        calc: { points: 0 },
      },
    ],
  });

  assert.equal(character.languages[0].isNative, true);
  assert.equal(character.languages[0].spokenLevel, "native");
  assert.equal(character.languages[0].writtenLevel, "native");
  assert.equal(character.languages[0].importedCost, 0);
  assert.equal(character.familiarities[0].isNative, true);
  assert.equal(character.familiarities[0].importedCost, 0);
});

test("imports direct language and familiarity collections", () => {
  const character = importCharacter({
    id: "char-001",
    profile: { name: "Direct Language Hero" },
    languages: [
      {
        id: "lang-001",
        language_name: "Anão",
        spoken_level: "Rudimentar",
        written_level: "Com Sotaque",
        imported_cost: "3",
      },
    ],
    cultural_familiarities: [
      {
        id: "fam-001",
        culture_name: "Mercantil",
        imported_cost: "1",
      },
    ],
  });

  assert.equal(character.languages.length, 1);
  assert.equal(character.languages[0].name, "Anão");
  assert.equal(character.languages[0].spokenLevel, "broken");
  assert.equal(character.languages[0].writtenLevel, "accented");
  assert.equal(character.familiarities.length, 1);
  assert.equal(character.familiarities[0].name, "Mercantil");
});

test("preserves language container ancestry", () => {
  const snapshot = createSnapshotFromGcs({
    id: "char-001",
    profile: { name: "Nested Language Hero" },
    traits: [
      {
        id: "culture-001",
        type: "trait_container",
        name: "Cultura Élfica",
        children: [
          {
            id: "lang-001",
            name: "Idioma: Élfico",
            tags: ["Idioma", "Vantagem"],
            modifiers: [
              {
                name: "Falada",
                local_notes: "Com Sotaque",
              },
            ],
            calc: { points: 2 },
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.languages[0].importMeta.containerIds, ["culture-001"]);
});
