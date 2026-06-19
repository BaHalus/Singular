import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  activateAlternateForm,
  deactivateAlternateForm,
} from "./AlternateFormOperations.js";

function createStatefulShapechanger(statePolicy) {
  return createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Licantropo",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: 8, maximum: 10 },
      EnergyReserve: { current: 3, maximum: 5 },
    },
    state: {
      injuries: [{ id: "base-injury", description: "Cicatriz antiga" }],
      conditions: [{ name: "Base Condition" }],
      effects: [{ source: "Base Effect" }],
    },
    equipment: [
      {
        id: "eq-sword",
        name: "Espada",
        state: "equipped",
        uses: 5,
        quantity: 1,
      },
    ],
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
        equipment: [
          {
            id: "eq-collar-source",
            name: "Coleira",
            state: "carried",
            uses: 4,
            quantity: 1,
          },
        ],
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Formas do Licantropo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        statePolicy,
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: "template-wolf",
          },
        ],
      },
    ],
    metadata: {
      createdAt: "2026-06-19T08:00:00.000Z",
      updatedAt: "2026-06-19T08:00:00.000Z",
      source: "singular",
    },
  });
}

test("preserves independent pools injuries conditions effects and equipment per form", () => {
  const base = createStatefulShapechanger({
    pools: {
      HP: "perForm",
      FP: "perForm",
      EnergyReserve: "perForm",
    },
    injuries: "perForm",
    conditions: "perForm",
    effects: "perForm",
    equipment: "perForm",
  });

  const wolfFirstEntry = activateAlternateForm(base, "set-body", "form-wolf", {
    activationId: "activation-wolf-1",
    now: "2026-06-19T09:00:00.000Z",
  });

  const savedBase = wolfFirstEntry.alternateFormSets[0].forms[0].runtimeState;

  assert.equal(savedBase.initialized, true);
  assert.equal(savedBase.pools.HP, 10);
  assert.equal(savedBase.pools.FP, 8);
  assert.equal(savedBase.pools.EnergyReserve, 3);
  assert.equal(savedBase.injuries[0].id, "base-injury");
  assert.equal(savedBase.equipment[0].key, "equipment:eq-sword");

  const woundedWolf = createCharacter({
    ...wolfFirstEntry,
    pools: {
      HP: { current: 4, maximum: 10 },
      FP: { current: 2, maximum: 10 },
      EnergyReserve: { current: 1, maximum: 5 },
    },
    state: {
      ...wolfFirstEntry.state,
      injuries: [{ id: "wolf-injury", description: "Pata ferida" }],
      conditions: [{ name: "Wolf Condition" }],
      effects: [{ source: "Wolf Effect" }],
    },
    equipment: wolfFirstEntry.equipment.map(item => (
      item.name === "Espada"
        ? { ...item, state: "dropped", uses: 3, quantity: 1 }
        : { ...item, state: "equipped", uses: 2, quantity: 1 }
    )),
  });

  const humanoid = deactivateAlternateForm(woundedWolf, "set-body", {
    now: "2026-06-19T10:00:00.000Z",
  });

  assert.equal(humanoid.pools.HP.current, 10);
  assert.equal(humanoid.pools.FP.current, 8);
  assert.equal(humanoid.pools.EnergyReserve.current, 3);
  assert.equal(humanoid.state.injuries[0].id, "base-injury");
  assert.equal(humanoid.state.conditions[0].name, "Base Condition");
  assert.equal(humanoid.state.effects[0].source, "Base Effect");
  assert.equal(humanoid.equipment.length, 1);
  assert.equal(humanoid.equipment[0].name, "Espada");
  assert.equal(humanoid.equipment[0].state, "equipped");
  assert.equal(humanoid.equipment[0].uses, 5);

  const savedWolf = humanoid.alternateFormSets[0].forms[1].runtimeState;

  assert.equal(savedWolf.initialized, true);
  assert.equal(savedWolf.pools.HP, 4);
  assert.equal(savedWolf.injuries[0].id, "wolf-injury");
  assert.equal(
    savedWolf.equipment.some(snapshot => (
      snapshot.key === "form:template-wolf:eq-collar-source" &&
      snapshot.state === "equipped" &&
      snapshot.uses === 2
    )),
    true,
  );

  const wolfSecondEntry = activateAlternateForm(
    humanoid,
    "set-body",
    "form-wolf",
    {
      activationId: "activation-wolf-2",
      now: "2026-06-19T11:00:00.000Z",
    },
  );

  assert.equal(wolfSecondEntry.pools.HP.current, 4);
  assert.equal(wolfSecondEntry.pools.FP.current, 2);
  assert.equal(wolfSecondEntry.pools.EnergyReserve.current, 1);
  assert.equal(wolfSecondEntry.state.injuries[0].id, "wolf-injury");
  assert.equal(wolfSecondEntry.state.conditions[0].name, "Wolf Condition");
  assert.equal(wolfSecondEntry.state.effects[0].source, "Wolf Effect");

  const sword = wolfSecondEntry.equipment.find(item => item.name === "Espada");
  const collar = wolfSecondEntry.equipment.find(item => item.name === "Coleira");

  assert.equal(sword.state, "dropped");
  assert.equal(sword.uses, 3);
  assert.equal(collar.state, "equipped");
  assert.equal(collar.uses, 2);
  assert.notEqual(collar.id, woundedWolf.equipment.find(item => item.name === "Coleira").id);
});

test("shared policy carries current state through transformations", () => {
  const base = createStatefulShapechanger();
  const wolf = activateAlternateForm(base, "set-body", "form-wolf", {
    activationId: "activation-wolf",
  });
  const changed = createCharacter({
    ...wolf,
    pools: {
      ...wolf.pools,
      HP: {
        ...wolf.pools.HP,
        current: 3,
      },
    },
    state: {
      ...wolf.state,
      injuries: [{ id: "shared-injury" }],
      conditions: [{ name: "Shared Condition" }],
    },
    equipment: wolf.equipment.map(item => (
      item.name === "Espada"
        ? { ...item, state: "dropped" }
        : item
    )),
  });
  const humanoid = deactivateAlternateForm(changed, "set-body");

  assert.equal(humanoid.pools.HP.current, 3);
  assert.equal(humanoid.state.injuries[0].id, "shared-injury");
  assert.equal(humanoid.state.conditions[0].name, "Shared Condition");
  assert.equal(humanoid.equipment[0].state, "dropped");
});

test("first entry into an uninitialized form carries the current state", () => {
  const base = createStatefulShapechanger({
    pools: {
      HP: "perForm",
    },
    injuries: "perForm",
  });
  const wolf = activateAlternateForm(base, "set-body", "form-wolf", {
    activationId: "activation-wolf",
  });

  assert.equal(wolf.pools.HP.current, 10);
  assert.equal(wolf.state.injuries[0].id, "base-injury");
  assert.equal(
    wolf.alternateFormSets[0].forms[1].runtimeState.initialized,
    false,
  );
});
