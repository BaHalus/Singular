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

test("projects declared traits, skills and techniques without calculating rules", () => {
  const character = createCharacter({
    identity: {
      id: "char_mobile_declared_lists",
      name: "Listas Declaradas",
      concept: "",
      playerId: null,
      campaignId: null,
    },
    traits: [
      {
        id: "trait_reflexos",
        role: "advantage",
        name: "Reflexos em Combate",
        points: 15,
        levels: null,
        notes: "Reação rápida",
      },
      {
        id: "trait_honra",
        role: "disadvantage",
        name: "Código de Honra",
        points: -10,
      },
    ],
    skills: [
      {
        id: "skill_espada",
        name: "Espada Curta",
        attribute: "DX",
        difficulty: "A",
        points: 4,
        importedLevel: 13,
        importedRelativeLevel: 1,
      },
    ],
    techniques: [
      {
        id: "tech_corte_pescoco",
        name: "Corte no Pescoço",
        skillId: "skill_espada",
        skillName: "Espada Curta",
        difficulty: "D",
        points: 2,
        importedLevel: 11,
        defaultPenalty: -5,
      },
    ],
  });

  const projection = projectCharacterForMobileSheet(character);

  assert.equal(validateCharacterMobileProjection(projection), true);
  assert.equal(projection.traits.length, 2);
  assert.deepEqual(projection.traits[0], {
    id: "trait_reflexos",
    name: "Reflexos em Combate",
    role: "advantage",
    points: 15,
    levels: null,
    notes: "Reação rápida",
    status: "declared",
  });
  assert.equal(projection.skills[0].name, "Espada Curta");
  assert.equal(projection.skills[0].importedLevel, 13);
  assert.equal(projection.techniques[0].skillId, "skill_espada");
  assert.equal(projection.techniques[0].defaultPenalty, -5);
  assert.equal(
    projection.sections.find(section => section.id === "traits").status,
    "declared-only",
  );
  assert.equal(
    projection.sections.find(section => section.id === "skills-techniques").status,
    "declared-only",
  );
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

test("rejects non-finite numeric values before JSON serialization", () => {
  const character = createCharacter({
    identity: {
      id: "char_mobile_non_finite",
      name: "Personagem Não Finito",
      concept: "",
      playerId: null,
      campaignId: null,
    },
  });

  const projection = projectCharacterForMobileSheet(character);
  const invalidProjection = {
    ...serializeCharacterMobileProjection(projection),
    pools: {
      ...projection.pools,
      HP: {
        ...projection.pools.HP,
        current: Number.NaN,
      },
    },
  };

  assert.throws(
    () => serializeCharacterMobileProjection(invalidProjection),
    /Mobile pool projection HP current must be a finite number or null/,
  );
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
