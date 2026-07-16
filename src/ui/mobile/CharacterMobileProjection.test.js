import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  projectCharacterForMobileSheet,
  serializeCharacterMobileProjection,
  validateCharacterMobileProjection,
} from "./CharacterMobileProjection.js";

function identity(id, name) {
  return {
    id,
    name,
    concept: "",
    playerId: null,
    campaignId: null,
  };
}

test("projects identity, attributes and pools for the mobile sheet", () => {
  const character = createCharacter({
    identity: identity("char_mobile_projection", "Aventureira Mobile"),
    attributes: {
      ST: { base: 10, override: 12 },
      DX: 13,
      IQ: 11,
      HT: 9,
    },
    secondaryCharacteristics: {
      HP: { base: 12, override: null },
      FP: { base: 9, override: null },
    },
    pools: {
      HP: { current: 8, maximum: 12 },
      FP: { current: 7, maximum: 9 },
    },
  });

  const projection = projectCharacterForMobileSheet(character);

  assert.equal(validateCharacterMobileProjection(projection), true);
  assert.equal(projection.schemaVersion, 8);
  assert.equal(projection.identity.name, "Aventureira Mobile");
  assert.equal(projection.attributes.ST.level, 12);
  assert.equal(projection.attributes.ST.source, "override");
  assert.equal(projection.attributes.DX.level, 13);
  assert.equal(projection.attributes.DX.source, "base");
  assert.equal(projection.secondaryCharacteristics.HP.base, 12);
  assert.equal(projection.pools.HP.current, 8);
  assert.equal(projection.pools.HP.maximum, 12);
  assert.deepEqual(
    projection.mechanicalResults.items.map(item => [item.id, item.label, item.value, item.source]),
    [
      ["basic-speed", "Velocidade Básica", 5.5, "attributes"],
      ["basic-move", "Deslocamento Básico", 5, "attributes"],
      ["dodge", "Esquiva", 8, "attributes"],
    ],
  );
});

test("projects declared traits, skills and techniques without calculating rules", () => {
  const character = createCharacter({
    identity: identity("char_mobile_declared_lists", "Listas Declaradas"),
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
  assert.equal(projection.skills[0].importedLevel, 13);
  assert.equal(projection.techniques[0].skillId, "skill_espada");
  assert.equal(
    projection.sections.find(section => section.id === "traits").status,
    "declared-only",
  );
  assert.equal(
    projection.sections.find(section => section.id === "skills-techniques").status,
    "declared-only",
  );
});

test("projects equipment hierarchy and totals from the equipment engine", () => {
  const character = createCharacter({
    identity: identity("char_mobile_equipment", "Inventário Mobile"),
    equipment: [
      {
        id: "eq_mochila",
        kind: "container",
        containerKind: "physical",
        name: "Mochila",
        quantity: 1,
        weightKg: 1.5,
        cost: 60,
        state: "carried",
        children: [
          {
            id: "eq_tocha",
            name: "Tocha",
            quantity: 3,
            weightKg: 0.5,
            cost: 2,
            state: "stored",
          },
        ],
      },
      {
        id: "eq_espada",
        name: "Espada Curta",
        quantity: 1,
        weightKg: 1.5,
        cost: 400,
        state: "equipped",
      },
    ],
  });

  const projection = projectCharacterForMobileSheet(character);

  assert.equal(projection.equipment.items.length, 3);
  assert.deepEqual(
    projection.equipment.items.map(item => [item.id, item.parentId, item.depth]),
    [
      ["eq_mochila", null, 0],
      ["eq_tocha", "eq_mochila", 1],
      ["eq_espada", null, 0],
    ],
  );
  assert.equal(projection.equipment.totals.itemCount, 3);
  assert.equal(projection.equipment.totals.quantity, 5);
  assert.equal(projection.equipment.totals.weightKg, 4.5);
  assert.equal(projection.equipment.totals.loadWeightKg, 4.5);
  assert.equal(projection.equipment.totals.cost, 466);
  assert.equal(projection.equipment.totals.authority, "engine.equipment");
  assert.deepEqual(projection.equipment.totals.byState.carried, {
    itemCount: 1,
    quantity: 1,
    cost: 60,
    weightKg: 1.5,
    loadWeightKg: 1.5,
  });
  assert.deepEqual(projection.equipment.totals.byState.stored, {
    itemCount: 1,
    quantity: 3,
    cost: 6,
    weightKg: 1.5,
    loadWeightKg: 1.5,
  });
  assert.deepEqual(projection.equipment.totals.byState.equipped, {
    itemCount: 1,
    quantity: 1,
    cost: 400,
    weightKg: 1.5,
    loadWeightKg: 1.5,
  });
  assert.equal(
    projection.sections.find(section => section.id === "equipment").status,
    "declared-only",
  );
  assert.equal(Object.isFrozen(projection.equipment), true);
});

test("excludes ignored semantic groups from totals while counting their children", () => {
  const projection = projectCharacterForMobileSheet(createCharacter({
    identity: identity("char_mobile_equipment_group", "Grupo Semântico"),
    equipment: [
      {
        id: "eq_consumiveis",
        kind: "container",
        containerKind: "group",
        name: "Consumíveis",
        quantity: 1,
        weightKg: 9,
        cost: 99,
        children: [
          {
            id: "eq_bandagem",
            name: "Bandagem",
            quantity: 3,
            weightKg: 0.1,
            cost: 2,
            state: "carried",
          },
        ],
      },
    ],
  }));

  assert.equal(projection.equipment.items[0].state, "ignored");
  assert.equal(projection.equipment.totals.quantity, 3);
  assert.equal(projection.equipment.totals.weightKg, 0.3);
  assert.equal(projection.equipment.totals.loadWeightKg, 0.3);
  assert.equal(projection.equipment.totals.cost, 6);
  assert.equal(projection.equipment.totals.byState.ignored.itemCount, 1);
  assert.equal(projection.equipment.totals.byState.ignored.weightKg, 9);
  assert.equal(projection.equipment.totals.byState.carried.quantity, 3);
});

test("serializes the mobile projection without exposing mutable state", () => {
  const projection = projectCharacterForMobileSheet(createCharacter({
    identity: identity("char_mobile_serialization", "Personagem Serializado"),
  }));
  const serialized = serializeCharacterMobileProjection(projection);

  assert.notEqual(serialized, projection);
  assert.deepEqual(serialized.attributes.ST, projection.attributes.ST);
  assert.deepEqual(serialized.mechanicalResults, projection.mechanicalResults);
  serialized.identity.name = "Alterado";
  assert.equal(projection.identity.name, "Personagem Serializado");
});

test("rejects non-finite numeric values before JSON serialization", () => {
  const projection = projectCharacterForMobileSheet(createCharacter({
    identity: identity("char_mobile_non_finite", "Personagem Não Finito"),
  }));
  const invalidProjection = {
    ...serializeCharacterMobileProjection(projection),
    pools: {
      ...projection.pools,
      HP: { ...projection.pools.HP, current: Number.NaN },
    },
  };

  assert.throws(
    () => serializeCharacterMobileProjection(invalidProjection),
    /Mobile pool projection HP current must be a finite number or null/,
  );
});

test("marks an empty canonical equipment collection as empty", () => {
  const projection = projectCharacterForMobileSheet(createCharacter({
    identity: identity("char_mobile_equipment_empty", "Sem Equipamentos"),
  }));

  assert.deepEqual(projection.equipment.items, []);
  assert.equal(projection.equipment.totals.itemCount, 0);
  assert.equal(projection.equipment.totals.quantity, 0);
  assert.equal(projection.equipment.totals.weightKg, 0);
  assert.equal(projection.equipment.totals.loadWeightKg, 0);
  assert.equal(projection.equipment.totals.cost, 0);
  assert.equal(projection.equipment.totals.byState.carried.weightKg, 0);
  assert.equal(projection.equipment.totals.authority, "engine.equipment");
  assert.equal(
    projection.sections.find(section => section.id === "equipment").status,
    "empty",
  );
});
