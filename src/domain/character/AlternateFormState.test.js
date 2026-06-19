import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  createAlternateFormStatePolicy,
  createAlternateFormRuntimeState,
  captureAlternateFormRuntimeState,
  restoreAlternateFormRuntimeState,
} from "./AlternateFormState.js";

test("creates shared state policy by default", () => {
  const policy = createAlternateFormStatePolicy();

  assert.deepEqual(policy, {
    pools: {
      HP: "shared",
      FP: "shared",
      EnergyReserve: "shared",
    },
    injuries: "shared",
    conditions: "shared",
    effects: "shared",
    equipment: "shared",
  });
});

test("creates per-form runtime state", () => {
  const runtimeState = createAlternateFormRuntimeState({
    initialized: true,
    capturedAt: "2026-06-19T12:00:00.000Z",
    pools: {
      HP: 4,
      FP: 3,
    },
    injuries: [{ id: "injury-001" }],
    conditions: [{ name: "Prone" }],
    effects: [{ source: "Poison" }],
    equipment: [
      {
        key: "equipment:eq-001",
        state: "equipped",
        uses: 2,
        quantity: 1,
      },
    ],
  });

  assert.equal(runtimeState.initialized, true);
  assert.equal(runtimeState.pools.HP, 4);
  assert.equal(runtimeState.injuries.length, 1);
  assert.equal(runtimeState.equipment.length, 1);
});

test("captures configured per-form state only", () => {
  const character = createCharacter({
    pools: {
      HP: { current: 7, maximum: 10 },
      FP: { current: 5, maximum: 10 },
      EnergyReserve: { current: 2, maximum: 5 },
    },
    state: {
      injuries: [{ id: "injury-001" }],
      conditions: [{ name: "Prone" }],
      effects: [{ source: "Poison" }],
    },
    equipment: [
      {
        id: "eq-001",
        name: "Espada",
        state: "equipped",
        uses: 3,
        quantity: 1,
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        statePolicy: {
          pools: {
            HP: "perForm",
            FP: "shared",
            EnergyReserve: "perForm",
          },
          injuries: "perForm",
          conditions: "shared",
          effects: "perForm",
          equipment: "perForm",
        },
        forms: [
          {
            id: "form-base",
            name: "Base",
          },
        ],
      },
    ],
  });

  const runtimeState = captureAlternateFormRuntimeState(
    character,
    character.alternateFormSets[0],
    "2026-06-19T12:00:00.000Z",
  );

  assert.deepEqual(runtimeState.pools, {
    HP: 7,
    EnergyReserve: 2,
  });
  assert.equal(runtimeState.injuries.length, 1);
  assert.deepEqual(runtimeState.conditions, []);
  assert.equal(runtimeState.effects.length, 1);
  assert.deepEqual(runtimeState.equipment, [
    {
      key: "equipment:eq-001",
      state: "equipped",
      uses: 3,
      quantity: 1,
    },
  ]);
});

test("restores configured per-form state without changing shared fields", () => {
  const character = createCharacter({
    pools: {
      HP: { current: 2, maximum: 10 },
      FP: { current: 4, maximum: 10 },
    },
    state: {
      injuries: [{ id: "current-injury" }],
      conditions: [{ name: "Stunned" }],
      effects: [{ source: "Current Effect" }],
    },
    equipment: [
      {
        id: "eq-001",
        name: "Espada",
        state: "dropped",
        uses: 1,
        quantity: 0,
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        statePolicy: {
          pools: {
            HP: "perForm",
            FP: "shared",
          },
          injuries: "perForm",
          conditions: "shared",
          effects: "perForm",
          equipment: "perForm",
        },
        forms: [
          {
            id: "form-base",
            name: "Base",
          },
        ],
      },
    ],
  });

  const restored = restoreAlternateFormRuntimeState(
    character,
    character.alternateFormSets[0],
    createAlternateFormRuntimeState({
      initialized: true,
      pools: {
        HP: 9,
      },
      injuries: [{ id: "saved-injury" }],
      effects: [{ source: "Saved Effect" }],
      equipment: [
        {
          key: "equipment:eq-001",
          state: "equipped",
          uses: 3,
          quantity: 1,
        },
      ],
    }),
  );

  assert.equal(restored.pools.HP.current, 9);
  assert.equal(restored.pools.FP.current, 4);
  assert.deepEqual(restored.state.injuries, [{ id: "saved-injury" }]);
  assert.deepEqual(restored.state.conditions, [{ name: "Stunned" }]);
  assert.deepEqual(restored.state.effects, [{ source: "Saved Effect" }]);
  assert.equal(restored.equipment[0].state, "equipped");
  assert.equal(restored.equipment[0].uses, 3);
  assert.equal(restored.equipment[0].quantity, 1);
});

test("restores form equipment using stable template provenance", () => {
  const character = createCharacter({
    equipment: [
      {
        id: "new-clone-id",
        name: "Coleira",
        state: "carried",
        uses: 5,
        quantity: 1,
        importMeta: {
          alternateFormSetId: "set-body",
          templateId: "template-wolf",
          templateSourceComponentId: "eq-collar",
        },
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        statePolicy: {
          equipment: "perForm",
        },
        forms: [
          {
            id: "form-base",
            name: "Base",
          },
          {
            id: "form-wolf",
            name: "Lobo",
          },
        ],
      },
    ],
  });

  const restored = restoreAlternateFormRuntimeState(
    character,
    character.alternateFormSets[0],
    createAlternateFormRuntimeState({
      initialized: true,
      equipment: [
        {
          key: "form:template-wolf:eq-collar",
          state: "equipped",
          uses: 2,
          quantity: 1,
        },
      ],
    }),
  );

  assert.equal(restored.equipment[0].id, "new-clone-id");
  assert.equal(restored.equipment[0].state, "equipped");
  assert.equal(restored.equipment[0].uses, 2);
});

test("rejects invalid policies and runtime state", () => {
  assert.throws(() => {
    createAlternateFormStatePolicy({
      injuries: "reset",
    });
  });

  assert.throws(() => {
    createAlternateFormRuntimeState({
      pools: {
        HP: "7",
      },
    });
  });

  assert.throws(() => {
    createAlternateFormRuntimeState({
      equipment: [
        {
          key: "",
          state: "equipped",
          uses: null,
          quantity: 1,
        },
      ],
    });
  });
});
