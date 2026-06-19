import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

test("serializes alternate form state policies and runtime snapshots", () => {
  const character = createCharacter({
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        statePolicy: {
          pools: {
            HP: "perForm",
            FP: "shared",
            EnergyReserve: "perForm",
          },
          injuries: "perForm",
          equipment: "perForm",
        },
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
            runtimeState: {
              initialized: true,
              capturedAt: "2026-06-19T12:00:00.000Z",
              pools: {
                HP: 9,
                EnergyReserve: 2,
              },
              injuries: [{ id: "injury-001" }],
              equipment: [
                {
                  key: "equipment:eq-001",
                  state: "equipped",
                  uses: 3,
                  quantity: 1,
                },
              ],
            },
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: "template-wolf",
          },
        ],
      },
    ],
  });

  const json = serializeCharacter(character);
  const set = json.alternateFormSets[0];

  assert.equal(set.statePolicy.pools.HP, "perForm");
  assert.equal(set.statePolicy.pools.FP, "shared");
  assert.equal(set.statePolicy.injuries, "perForm");
  assert.equal(set.statePolicy.conditions, "shared");
  assert.equal(set.forms[0].runtimeState.initialized, true);
  assert.equal(set.forms[0].runtimeState.pools.HP, 9);
  assert.equal(set.forms[0].runtimeState.injuries[0].id, "injury-001");
  assert.equal(
    set.forms[0].runtimeState.equipment[0].key,
    "equipment:eq-001",
  );
  assert.equal(set.forms[1].runtimeState.initialized, false);
});
