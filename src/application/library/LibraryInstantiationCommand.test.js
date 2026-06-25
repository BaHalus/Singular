import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createLibraryAdapter,
  createLibraryAdapterRegistry,
} from "../../library/LibraryAdapter.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import {
  createSequentialIdGenerator,
} from "../../infrastructure/runtime/SequentialIdGenerator.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createLibraryInstantiationCommandHandler,
  LIBRARY_INSTANTIATION_COMMAND_TYPE,
} from "./LibraryInstantiationCommand.js";

const TIMESTAMP = "2026-06-25T21:00:00.000Z";

function createTestCharacter(name = "Antes") {
  return createCharacter({
    identity: {
      id: "character-1",
      name,
      concept: "",
      playerId: null,
      campaignId: null,
    },
    metadata: {
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      source: "singular",
    },
  });
}

function createTestRuntime() {
  return {
    clock: createFixedClock(TIMESTAMP),
    idGenerator: createSequentialIdGenerator(),
  };
}

function createSpellDefinition() {
  return {
    id: "spell-light",
    domain: "spell",
    name: "Luz",
    payload: {
      cost: 1,
    },
  };
}

function createInstantiationAdapter(
  calls,
  analyzeInstantiation,
  planInstantiation,
) {
  return createLibraryAdapter({
    domain: "spell",
    validateDefinitionPayload: () => true,
    serializeDefinitionPayload: payload => payload,
    analyzeInstantiation: args => {
      calls.push({ phase: "analyze", definitionId: args.definition.id });
      assert.equal(args.context.applicationSession.id, "session-1");
      assert.equal(args.context.applicationSession.revision, 0);
      assert.equal(
        args.context.applicationSession.character.identity.id,
        "character-1",
      );
      assert.deepEqual(args.context.request, { mode: "creation" });
      return analyzeInstantiation?.(args) ?? { status: "ready" };
    },
    planInstantiation: args => {
      calls.push({ phase: "plan", definitionId: args.definition.id });
      if (planInstantiation) return planInstantiation(args);
      return {
        status: "ready",
        actions: [
          {
            id: "action-spell-light",
            definitionId: args.definition.id,
            domain: args.definition.domain,
            type: "spell.create",
            payload: {
              name: args.definition.name,
            },
          },
        ],
      };
    },
    executeInstantiationPlan: args => {
      calls.push({ phase: "execute", actionId: args.action.id });
      return {
        proposal: {
          type: args.action.type,
          payload: args.action.payload,
        },
      };
    },
  });
}

function executeLibraryCommand({ adapterRegistry, applyInstantiation }) {
  const session = createApplicationSession({
    id: "session-1",
    character: createTestCharacter(),
  });
  const handler = createLibraryInstantiationCommandHandler({
    adapterRegistry,
    applyInstantiation,
  });
  const registry = createCommandRegistry([
    {
      type: LIBRARY_INSTANTIATION_COMMAND_TYPE,
      handler,
    },
  ]);

  const result = executeCommand(
    session,
    {
      id: "command-1",
      type: LIBRARY_INSTANTIATION_COMMAND_TYPE,
      expectedRevision: 0,
      issuedAt: TIMESTAMP,
      payload: {
        definitions: [createSpellDefinition()],
        rootDefinitionIds: ["spell-light"],
        context: {
          mode: "creation",
        },
      },
    },
    registry,
    createTestRuntime(),
  );

  return { result, session };
}

test("applies Library orchestration through the canonical command executor", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createInstantiationAdapter(calls),
  ]);
  let applicationInput = null;

  const { result } = executeLibraryCommand({
    adapterRegistry,
    applyInstantiation: input => {
      applicationInput = input;
      return {
        status: "applied",
        character: createCharacter({
          ...serializeCharacter(input.character),
          identity: {
            ...input.character.identity,
            name: "Depois",
          },
        }),
        receipt: {
          createdDefinitionIds: ["spell-light"],
        },
        diagnostics: [
          {
            code: "library-instantiation-applied",
            severity: "info",
          },
        ],
      };
    },
  });

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.character.identity.name, "Depois");
  assert.equal(result.session.history.length, 1);
  assert.equal(result.receipt.domainReceipt.kind, "library-instantiation");
  assert.equal(result.receipt.domainReceipt.status, "applied");
  assert.deepEqual(
    result.receipt.domainReceipt.application.createdDefinitionIds,
    ["spell-light"],
  );
  assert.deepEqual(
    calls.map(call => call.phase),
    ["analyze", "plan", "execute"],
  );
  assert.equal(
    applicationInput.orchestration.execution.actionResults[0].result.proposal.type,
    "spell.create",
  );
  assert.equal(applicationInput.command.id, "command-1");
});

test("returns no-op without calling the application boundary when analysis blocks", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createInstantiationAdapter(calls, () => ({
      status: "blocked",
      diagnostics: [
        {
          code: "library-choice-required",
          severity: "blocked",
        },
      ],
    })),
  ]);
  let applicationCalls = 0;

  const { result, session } = executeLibraryCommand({
    adapterRegistry,
    applyInstantiation: () => {
      applicationCalls += 1;
      throw new Error("unexpected application call");
    },
  });

  assert.equal(result.status, "no-op");
  assert.equal(result.session, session);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.receipt.domainReceipt.status, "blocked");
  assert.equal(applicationCalls, 0);
  assert.deepEqual(
    calls.map(call => call.phase),
    ["analyze"],
  );
  assert.deepEqual(result.diagnostics, [
    {
      code: "library-choice-required",
      severity: "blocked",
    },
  ]);
});

test("returns no-op without calling the application boundary when planning blocks", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createInstantiationAdapter(calls, null, () => ({
      status: "blocked",
      diagnostics: [
        {
          code: "library-plan-choice-required",
          severity: "blocked",
        },
      ],
    })),
  ]);
  let applicationCalls = 0;

  const { result, session } = executeLibraryCommand({
    adapterRegistry,
    applyInstantiation: () => {
      applicationCalls += 1;
      throw new Error("unexpected application call");
    },
  });

  assert.equal(result.status, "no-op");
  assert.equal(result.session, session);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.receipt.domainReceipt.status, "blocked");
  assert.equal(result.receipt.domainReceipt.plan.status, "blocked");
  assert.equal(result.receipt.domainReceipt.application, null);
  assert.equal(applicationCalls, 0);
  assert.deepEqual(
    calls.map(call => call.phase),
    ["analyze", "plan"],
  );
  assert.deepEqual(result.diagnostics, [
    {
      code: "library-plan-choice-required",
      severity: "blocked",
    },
  ]);
});

test("preserves the session atomically when the application boundary fails", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createInstantiationAdapter(calls),
  ]);

  const { result, session } = executeLibraryCommand({
    adapterRegistry,
    applyInstantiation: () => {
      throw new Error("application failed");
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.session, session);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics[0].message, /application failed/);
  assert.deepEqual(
    calls.map(call => call.phase),
    ["analyze", "plan", "execute"],
  );
});

test("rejects invalid application boundary results before committing", () => {
  const calls = [];
  const adapterRegistry = createLibraryAdapterRegistry([
    createInstantiationAdapter(calls),
  ]);

  const { result, session } = executeLibraryCommand({
    adapterRegistry,
    applyInstantiation: () => ({
      status: "applied",
      receipt: {},
    }),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.session, session);
  assert.equal(result.session.revision, 0);
  assert.match(
    result.diagnostics[0].message,
    /must return character/,
  );
});
