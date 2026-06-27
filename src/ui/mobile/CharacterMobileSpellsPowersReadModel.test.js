import assert from "node:assert/strict";
import test from "node:test";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createCharacterMobileSpellsPowersReadModel,
  serializeCharacterMobileSpellsPowersReadModel,
} from "./CharacterMobileSpellsPowersReadModel.js";

test("creates a portable mobile read model for declared Spells and Powers", () => {
  const character = createCharacter({
    identity: {
      id: "char-mobile-spells-powers",
      name: "Maga de Teste",
      concept: "Alpha mobile",
      playerId: null,
      campaignId: null,
    },
    spells: [
      {
        id: "spell-fireball",
        name: "Bola de Fogo",
        spellClass: "Projétil",
        castingCost: "1 a 3",
        maintenanceCost: "",
        castingTime: "1s",
        duration: "Instantânea",
        resistance: "",
        colleges: ["Fogo"],
        importedLevel: 14,
        importedRelativeLevelText: "IQ+2",
        points: 4,
        notes: "Valor importado; sem cálculo na UI.",
      },
    ],
    powers: [
      {
        id: "power-psi",
        name: "Psiquismo",
        source: "Psíquico",
        powerModifier: { name: "Psíquico", valuePercent: -10, notes: "Importado" },
        memberTraitIds: [],
        notes: "Sem membros ainda.",
        tags: ["alpha"],
      },
    ],
  });

  const model = createCharacterMobileSpellsPowersReadModel(character);
  const serialized = serializeCharacterMobileSpellsPowersReadModel(model);

  assert.equal(serialized.characterId, "char-mobile-spells-powers");
  assert.equal(serialized.cards[0].id, "spells");
  assert.equal(serialized.cards[0].status, "declared-only");
  assert.equal(serialized.cards[0].authority, "application.spell-read-projection");
  assert.equal(serialized.cards[0].items[0].value, "Bola de Fogo");
  assert.equal(serialized.cards[0].items[0].importedLevel, 14);
  assert.equal(serialized.cards[0].items[0].importedRelativeLevelText, "IQ+2");
  assert.equal(serialized.cards[0].items[0].castingCost, "1 a 3");
  assert.equal(serialized.cards[0].items[0].duration, "Instantânea");

  assert.equal(serialized.cards[1].id, "powers");
  assert.equal(serialized.cards[1].status, "declared-only");
  assert.equal(serialized.cards[1].authority, "application.power-read-projection");
  assert.equal(serialized.cards[1].items[0].value, "Psiquismo");
  assert.deepEqual(serialized.cards[1].items[0].memberTraitIds, []);
  assert.deepEqual(serialized.cards[1].items[0].diagnosticCodes, [
    "power.memberTraits.empty",
  ]);
});

test("marks Spells and Powers cards as empty without fabricating values", () => {
  const model = serializeCharacterMobileSpellsPowersReadModel(
    createCharacterMobileSpellsPowersReadModel(createCharacter()),
  );

  assert.equal(model.cards[0].status, "empty");
  assert.deepEqual(model.cards[0].items, []);
  assert.equal(model.cards[1].status, "empty");
  assert.deepEqual(model.cards[1].items, []);
});
