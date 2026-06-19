import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { planFormTransition } from "./FormTransitionPlanner.js";
import {
  executeFormTransition,
  FormTransitionExecutionError,
} from "./FormTransitionExecutor.js";

function createSwitchCharacter(fp = 5) {
  return createCharacter({
    identity: {
      id: "char-switch",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 10 },
      FP: { current: fp, maximum: 10 },
    },
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-wolf",
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            transitionRules: {
              deactivation: {
                baseTimeSeconds: 1,
                costs: [
                  {
                    id: "cost-leave-wolf",
                    resource: "FP",
                    amount: 1,
                    timing: "deactivation",
                  },
                ],
              },
              return: {
                mode: "manual",
                targetFormId: "form-base",
              },
            },
          },
          {
            id: "form-bat",
            name: "Morcego",
            transitionRules: {
              activation: {
                baseTimeSeconds: 2,
                costs: [
                  {
                    id: "cost-enter-bat",
                    resource: "FP",
                    amount: 2,
                    timing: "activation",
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  });
}

test("consumes aggregate switch costs once and activates target", () => {
  const character = createSwitchCharacter(5);
  const plan = planFormTransition(
    character,
    "set-body",
    "form-bat",
  );
  const result = executeFormTransition(character, plan, {
    executionId: "switch-001",
    now: "2026-06-19T15:00:00.000Z",
  });

  assert.equal(plan.transitionKind, "switch");
  assert.equal(plan.costs.length, 2);
  assert.equal(plan.costs[0].totalRequired, 3);
  assert.equal(plan.costs[1].totalRequired, 3);

  assert.equal(result.character.pools.FP.current, 2);
  assert.equal(result.character.alternateFormSets[0].activeFormId, "form-bat");
  assert.equal(result.receipt.consumedResources.length, 1);
  assert.equal(result.receipt.consumedResources[0].amount, 3);
  assert.deepEqual(
    result.receipt.consumedResources[0].costIds,
    ["cost-leave-wolf", "cost-enter-bat"],
  );
  assert.deepEqual(
    result.receipt.consumedCostIds,
    ["cost-leave-wolf", "cost-enter-bat"],
  );
});

test("revalidation can reject a changed world condition", () => {
  const character = createCharacter({
    ...createSwitchCharacter(5),
    alternateFormSets: [
      {
        ...createSwitchCharacter(5).alternateFormSets[0],
        activeFormId: "form-base",
        forms: createSwitchCharacter(5).alternateFormSets[0].forms.map(form => (
          form.id === "form-bat"
            ? {
              ...form,
              transitionRules: {
                ...form.transitionRules,
                activation: {
                  ...form.transitionRules.activation,
                  impediments: [],
                  triggers: [
                    {
                      id: "trigger-darkness",
                      description: "Escuridão",
                    },
                  ],
                },
                impediments: [
                  {
                    id: "imp-sunlight",
                    description: "Luz solar",
                  },
                ],
              },
            }
            : form
        )),
      },
    ],
  });
  const plan = planFormTransition(
    character,
    "set-body",
    "form-bat",
    {
      activeTriggers: ["trigger-darkness"],
      inactiveImpediments: ["imp-sunlight"],
    },
  );

  assert.equal(plan.allowed, true);

  assert.throws(
    () => executeFormTransition(character, plan, {
      context: {
        triggerResults: {
          "trigger-darkness": "inactive",
        },
        impedimentResults: {
          "imp-sunlight": "active",
        },
      },
    }),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "REVALIDATION_FAILED" &&
      error.details.reasons.includes("inactive-trigger") &&
      error.details.reasons.includes("active-impediment")
    ),
  );
});

test("invalid activation id collision leaves character unchanged", () => {
  const base = createSwitchCharacter(5);
  const character = createCharacter({
    ...base,
    alternateFormSets: [
      base.alternateFormSets[0],
      {
        id: "set-armor",
        name: "Revestimento",
        baseFormId: "armor-base",
        activeFormId: "armor-active",
        activeActivationId: "collision-id",
        forms: [
          {
            id: "armor-base",
            name: "Sem revestimento",
          },
          {
            id: "armor-active",
            name: "Blindado",
          },
        ],
      },
    ],
  });
  const plan = planFormTransition(
    character,
    "set-body",
    "form-bat",
  );
  const before = JSON.stringify(character);

  assert.throws(
    () => executeFormTransition(character, plan, {
      activationId: "collision-id",
    }),
    error => (
      error instanceof FormTransitionExecutionError &&
      error.code === "TRANSITION_FAILED"
    ),
  );

  assert.equal(JSON.stringify(character), before);
});
