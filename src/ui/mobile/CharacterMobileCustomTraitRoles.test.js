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

test("preserves custom imported trait roles through the mobile read pipeline", () => {
  const character = createCharacter({
    identity: {
      id: "character-custom-trait-role",
      name: "Ayla",
    },
    traits: [
      {
        id: "trait-custom-role",
        role: "ancestral-gift",
        name: "Dom Ancestral",
        points: 12,
        notes: "Categoria importada futura",
      },
    ],
  });

  const projection = projectCharacterForMobileSheet(character);
  const serialized = serializeCharacterMobileProjection(projection);
  const renderModel = createCharacterMobileSheetRenderModel(projection);
  const trait = renderModel.cards
    .find(card => card.id === "traits")
    .items[0];

  assert.equal(projection.traits[0].role, "ancestral-gift");
  assert.equal(serialized.traits[0].role, "ancestral-gift");
  assert.equal(trait.role, "ancestral-gift");
  assert.equal(trait.label, "Traço");
  assert.equal(trait.value, "Dom Ancestral");
});

test("marks Equipment as pending integration instead of an external active front", () => {
  const character = createCharacter({
    identity: {
      id: "character-equipment-coordination",
      name: "Coordenação Atual",
    },
  });

  const projection = projectCharacterForMobileSheet(character);
  const equipmentSection = projection.sections.find(
    section => section.id === "equipment",
  );

  assert.equal(equipmentSection.status, "pending");
});
