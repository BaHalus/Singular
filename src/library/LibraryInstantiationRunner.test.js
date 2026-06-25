import test from "node:test";
import assert from "node:assert/strict";

import {
  createLibraryAdapter,
  createLibraryAdapterRegistry,
} from "./LibraryAdapter.js";
import {
  createLibraryInstantiationPlan,
} from "./LibraryInstantiationPlan.js";
import {
  executeLibraryInstantiationPlan,
} from "./LibraryInstantiationRunner.js";

function createExecutableAdapter(domain, calls) {
  return createLibraryAdapter({
    domain,
    validateDefinitionPayload: () => true,
    serializeDefinitionPayload: payload => payload,
    analyzeInstantiation: () => ({ status: "ready" }),
    planInstantiation: () => ({ status: "ready" }),
    executeInstantiationPlan: ({ action, completedActions, context }) => {
      calls.push({
        actionId: action.id,
        completedActionIds: completedActions.map(result => result.actionId),
        context,
      });
      return {
        createdRef: `${action.domain}:${action.definitionId}`,
      };
    },
  });
}

test("executes a Library instantiation plan through domain adapters", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createExecutableAdapter("spell", calls),
  ]);
  const plan = createLibraryInstantiationPlan({
    id: "plan-runner-basic",
    rootDefinitionIds: ["spell-fireball"],
    resolvedDefinitionIds: ["spell-fireball"],
    actions: [
      {
        id: "action-create-spell",
        definitionId: "spell-fireball",
        domain: "spell",
        type: "spell.create",
        payload: {
          name: "Bola de Fogo",
        },
      },
    ],
  });

  const result = executeLibraryInstantiationPlan(plan, adapterRegistry, {
    mode: "creation",
  });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.planId, "plan-runner-basic");
  assert.equal(result.status, "completed");
  assert.deepEqual(result.actionResults, [
    {
      actionId: "action-create-spell",
      definitionId: "spell-fireball",
      domain: "spell",
      type: "spell.create",
      result: {
        createdRef: "spell:spell-fireball",
      },
    },
  ]);
  assert.deepEqual(calls, [
    {
      actionId: "action-create-spell",
      completedActionIds: [],
      context: {
        mode: "creation",
      },
    },
  ]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.actionResults[0].result), true);
});

test("executes dependencies before dependent actions", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createExecutableAdapter("trait", calls),
  ]);
  const plan = createLibraryInstantiationPlan({
    id: "plan-runner-dependencies",
    rootDefinitionIds: ["trait-root"],
    resolvedDefinitionIds: ["trait-root", "trait-prereq"],
    actions: [
      {
        id: "action-root",
        definitionId: "trait-root",
        domain: "trait",
        type: "trait.create",
        dependsOnActionIds: ["action-prereq"],
      },
      {
        id: "action-prereq",
        definitionId: "trait-prereq",
        domain: "trait",
        type: "trait.create",
      },
    ],
  });

  const result = executeLibraryInstantiationPlan(plan, adapterRegistry);

  assert.deepEqual(
    calls.map(call => call.actionId),
    ["action-prereq", "action-root"],
  );
  assert.deepEqual(calls[1].completedActionIds, ["action-prereq"]);
  assert.deepEqual(
    result.actionResults.map(actionResult => actionResult.actionId),
    ["action-prereq", "action-root"],
  );
});

test("preserves warning status and aggregates plan and action diagnostics", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createExecutableAdapter("equipment", calls),
  ]);
  const plan = createLibraryInstantiationPlan({
    id: "plan-runner-warnings",
    status: "ready-with-warnings",
    rootDefinitionIds: ["equipment-rope"],
    resolvedDefinitionIds: ["equipment-rope"],
    diagnostics: [
      {
        code: "library-optional-field-missing",
        severity: "warning",
      },
    ],
    actions: [
      {
        id: "action-create-equipment",
        definitionId: "equipment-rope",
        domain: "equipment",
        type: "equipment.create",
        diagnostics: [
          {
            code: "library-default-weight-used",
            severity: "info",
          },
        ],
      },
    ],
  });

  const result = executeLibraryInstantiationPlan(plan, adapterRegistry);

  assert.equal(result.status, "completed-with-warnings");
  assert.deepEqual(result.diagnostics, [
    {
      code: "library-optional-field-missing",
      severity: "warning",
    },
    {
      code: "library-default-weight-used",
      severity: "info",
    },
  ]);
});

test("rejects blocked plans and missing executable adapters", () => {
  const blockedPlan = createLibraryInstantiationPlan({
    id: "plan-runner-blocked",
    status: "blocked",
    rootDefinitionIds: ["spell-blocked"],
    resolvedDefinitionIds: ["spell-blocked"],
    diagnostics: [
      {
        code: "library-required-dependency-missing",
        severity: "blocked",
      },
    ],
  });
  const emptyRegistry = createLibraryAdapterRegistry([]);

  assert.throws(
    () => executeLibraryInstantiationPlan(blockedPlan, emptyRegistry),
    /plan is not executable/,
  );

  const readyPlan = createLibraryInstantiationPlan({
    id: "plan-runner-missing-adapter",
    rootDefinitionIds: ["spell-light"],
    resolvedDefinitionIds: ["spell-light"],
    actions: [
      {
        id: "action-create-light",
        definitionId: "spell-light",
        domain: "spell",
        type: "spell.create",
      },
    ],
  });

  assert.throws(
    () => executeLibraryInstantiationPlan(readyPlan, emptyRegistry),
    /adapter not found for domain: spell/,
  );
});

test("rejects adapters without the complete instantiation capability", () => {
  const adapterRegistry = createLibraryAdapterRegistry([
    createLibraryAdapter({
      domain: "spell",
      validateDefinitionPayload: () => true,
      serializeDefinitionPayload: payload => payload,
    }),
  ]);
  const plan = createLibraryInstantiationPlan({
    id: "plan-runner-adapter-without-instantiation",
    rootDefinitionIds: ["spell-light"],
    resolvedDefinitionIds: ["spell-light"],
    actions: [
      {
        id: "action-create-light",
        definitionId: "spell-light",
        domain: "spell",
        type: "spell.create",
      },
    ],
  });

  assert.throws(
    () => executeLibraryInstantiationPlan(plan, adapterRegistry),
    /adapter spell cannot execute instantiation plans/,
  );
});

test("rejects non-portable contexts and adapter results", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createExecutableAdapter("spell", calls),
  ]);
  const plan = createLibraryInstantiationPlan({
    id: "plan-runner-portability",
    rootDefinitionIds: ["spell-light"],
    resolvedDefinitionIds: ["spell-light"],
    actions: [
      {
        id: "action-create-light",
        definitionId: "spell-light",
        domain: "spell",
        type: "spell.create",
      },
    ],
  });

  assert.throws(
    () => executeLibraryInstantiationPlan(plan, adapterRegistry, new Date()),
    /execution context must be an object/,
  );

  const badRegistry = createLibraryAdapterRegistry([
    createLibraryAdapter({
      domain: "spell",
      validateDefinitionPayload: () => true,
      serializeDefinitionPayload: payload => payload,
      analyzeInstantiation: () => ({ status: "ready" }),
      planInstantiation: () => ({ status: "ready" }),
      executeInstantiationPlan: () => ({ createdAt: new Date() }),
    }),
  ]);

  assert.throws(
    () => executeLibraryInstantiationPlan(plan, badRegistry),
    /plain objects and arrays/,
  );
});
