import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  projectCharacterForMobileSheet,
  serializeCharacterMobileProjection,
  validateCharacterMobileProjection,
} from "./CharacterMobileProjection.js";

test("projects identity, attributes and pools for the mobile sheet", () => {
  const character = createCharacter({
    identity: {
      id: "char_mobile_projection",
      name: "Aventureira Mobile",
      concept: "Teste vertical",
      playerId: null,
      campaignId: null,
    },
    attributes: {
      ST: {
        base: 10,
        override: 12,
      },
      DX: 13,
      IQ: 11,
      HT: 9,
    },
    secondaryCharacteristics: {
      HP: {
        base: 12,
        override: null,
      },
      FP: {
        base: 9,
        override: null,
      },
    },
    pools: {
      HP: {
        current: 8,
        maximum: 12,
      },
      FP: {
        current: 7,
        maximum: 9,
      },
    },
  });

  const projection = projectCharacterForMobileSheet(character);

  assert.equal(validateCharacterMobileProjection(projection), true);
  assert.equal(projection.identity.name, "Aventureira Mobile");
  assert.equal(projection.attributes.ST.level, 12);
  assert.equal(projection.attributes.ST.source, "override");
  assert.equal(projection.attributes.DX.level, 13);
  assert.equal(projection.attributes.DX.source, "base");
  assert.equal(projection.secondaryCharacteristics.HP.base, 12);
  assert.equal(projection.secondaryCharacteristics.HP.override, null);
  assert.equal(projection.pools.HP.current, 8);
  assert.equal(projection.pools.HP.maximum, 12);
});

test("serializes the mobile projection without exposing mutable state", () => {
  const character = createCharacter({
    identity: {
      id: "char_mobile_serialization",
      name: "Personagem Serializado",
      concept: "",
      playerId: null,
      campaignId: null,
    },
  });

  const projection = projectCharacterForMobileSheet(character);
  const serialized = serializeCharacterMobileProjection(projection);

  assert.notEqual(serialized, projection);
  assert.deepEqual(serialized.attributes.ST, projection.attributes.ST);
  serialized.identity.name = "Alterado";
  assert.equal(projection.identity.name, "Personagem Serializado");
});

test("keeps equipment as an external-front section while the parallel domain is active", () => {
  const character = createCharacter({
    identity: {
      id: "char_mobile_equipment_boundary",
      name: "Sem Equipamento Integrado",
      concept: "",
      playerId: null,
      campaignId: null,
    },
  });

  const projection = projectCharacterForMobileSheet(character);
  const equipmentSection = projection.sections.find(
    section => section.id === "equipment",
  );

  assert.equal(equipmentSection.status, "external-front");
});
