import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import {
  createFormTransitionHistory,
  appendFormTransitionHistory,
} from "./FormTransitionHistory.js";

function transitionEntry(overrides = {}) {
  return {
    id: "history-transition-001",
    type: "transition-executed",
    occurredAt: "2026-06-19T12:00:00.000Z",
    characterId: "char-001",
    formSetId: "set-body",
    formId: "form-wolf",
    fromFormId: "form-base",
    targetFormId: "form-wolf",
    activationId: "activation-001",
    runtimeId: "runtime-001",
    executionId: "execution-001",
    data: {
      consumedCostIds: ["cost-fp"],
    },
    ...overrides,
  };
}

test("creates serializable persistent transition history", () => {
  const character = createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    formTransitionHistory: [transitionEntry()],
  });

  assert.equal(character.formTransitionHistory.length, 1);
  assert.equal(character.formTransitionHistory[0].type, "transition-executed");

  const json = serializeCharacter(character);
  assert.deepEqual(json.formTransitionHistory, character.formTransitionHistory);
  assert.notEqual(json.formTransitionHistory, character.formTransitionHistory);
});

test("append is idempotent for identical event and rejects conflicting duplicate", () => {
  const history = createFormTransitionHistory([transitionEntry()]);
  const repeated = appendFormTransitionHistory(history, transitionEntry());

  assert.equal(repeated, history);

  assert.throws(() => appendFormTransitionHistory(
    history,
    transitionEntry({
      data: { consumedCostIds: ["different"] },
    }),
  ));
});

test("rejects event from another character through Character invariant", () => {
  assert.throws(() => createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    formTransitionHistory: [
      transitionEntry({ characterId: "char-other" }),
    ],
  }));
});

test("validates type-specific required references", () => {
  assert.throws(() => createFormTransitionHistory([
    transitionEntry({ executionId: null }),
  ]));

  assert.throws(() => createFormTransitionHistory([
    {
      id: "history-maintenance-001",
      type: "maintenance-charged",
      occurredAt: "2026-06-19T12:01:00.000Z",
      characterId: "char-001",
      formSetId: "set-body",
      formId: null,
      runtimeId: "runtime-001",
      data: {},
    },
  ]));
});
