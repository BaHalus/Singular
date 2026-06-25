import test from "node:test";
import assert from "node:assert/strict";

import {
  createLibraryAdapter,
  createLibraryAdapterRegistry,
} from "./LibraryAdapter.js";
import { orchestrateLibraryInstantiation } from "./LibraryInstantiationOrchestrator.js";

function createOrchestrationAdapter(domain, calls, overrides = {}) {
  return createLibraryAdapter({
    domain,
    validateDefinitionPayload: () => true,
    serializeDefinitionPayload: payload => payload,
    analyzeInstantiation: args => {
      calls.push({ phase: "analyze", definitionId: args.definition.id });
      return overrides.analyzeInstantiation?.(args) ?? { status: "ready" };
    },
    planInstantiation: args => {
      calls.push({ phase: "plan", definitionId: args.definition.id });
      return overrides.planInstantiation?.(args) ?? {
        status: "ready",
        actions: [
          {
            id: `action-${args.definition.id}`,
            definitionId: args.definition.id,
            domain: args.definition.domain,
            type: `${args.definition.domain}.create`,
            payload: {
              name: args.definition.name,
            },
          },
        ],
      };
    },
    executeInstantiationPlan: args => {
      calls.push({ phase: "execute", actionId: args.action.id });
      return overrides.executeInstantiationPlan?.(args) ?? {
        createdRef: `${args.action.domain}:${args.action.definitionId}`,
      };
    },
  });
}

function createSpellDefinition(id = "spell-light") {
  return {
    id,
    domain: "spell",
    name: "Luz",
    payload: {
      cost: 1,
    },
  };
}

test("orchestrates Library definition analysis, planning and execution", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createOrchestrationAdapter("spell", calls),
  ]);

  const result = orchestrateLibraryInstantiation({
    adapterRegistry,
    definitions: [createSpellDefinition()],
    rootDefinitionIds: ["spell-light"],
    context: {
      mode: "creation",
    },
  });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.rootDefinitionIds, ["spell-light"]);
  assert.deepEqual(
    calls.map(call => call.phase),
    ["analyze", "plan", "execute"],
  );
  assert.equal(result.analysisResults[0].definitionId, "spell-light");
  assert.equal(result.plan.rootDefinitionIds[0], "spell-light");
  assert.equal(result.execution.actionResults[0].result.createdRef, "spell:spell-light");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.execution.actionResults[0].result), true);
});

test("returns blocked without planning or executing when analysis blocks", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createOrchestrationAdapter("spell", calls, {
      analyzeInstantiation: () => ({
        status: "blocked",
        diagnostics: [
          {
            code: "library-missing-required-choice",
            severity: "blocked",
          },
        ],
      }),
    }),
  ]);

  const result = orchestrateLibraryInstantiation({
    adapterRegistry,
    definitions: [createSpellDefinition()],
    rootDefinitionIds: ["spell-light"],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.plan, null);
  assert.equal(result.execution, null);
  assert.deepEqual(
    calls.map(call => call.phase),
    ["analyze"],
  );
  assert.deepEqual(result.diagnostics, [
    {
      code: "library-missing-required-choice",
      severity: "blocked",
    },
  ]);
});

test("preflights all definitions before running adapter side effects", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createOrchestrationAdapter("spell", calls),
  ]);

  assert.throws(
    () => orchestrateLibraryInstantiation({
      adapterRegistry,
      definitions: [
        createSpellDefinition(),
        {
          id: "trait-combat-reflexes",
          domain: "trait",
          name: "Reflexos em Combate",
        },
      ],
      rootDefinitionIds: ["spell-light"],
    }),
    /adapter not found for domain: trait/,
  );
  assert.deepEqual(calls, []);
});

test("rejects missing roots and adapters without full instantiation capability", () => {
  const emptyRegistry = createLibraryAdapterRegistry([]);

  assert.throws(
    () => orchestrateLibraryInstantiation({
      adapterRegistry: emptyRegistry,
      definitions: [createSpellDefinition()],
      rootDefinitionIds: ["spell-unknown"],
    }),
    /root not found: spell-unknown/,
  );

  const adapterRegistry = createLibraryAdapterRegistry([
    createLibraryAdapter({
      domain: "spell",
      validateDefinitionPayload: () => true,
      serializeDefinitionPayload: payload => payload,
    }),
  ]);

  assert.throws(
    () => orchestrateLibraryInstantiation({
      adapterRegistry,
      definitions: [createSpellDefinition()],
      rootDefinitionIds: ["spell-light"],
    }),
    /adapter spell cannot orchestrate instantiation/,
  );
});
