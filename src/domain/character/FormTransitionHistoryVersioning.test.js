import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  recordFormRuntimeAdvance,
} from "./FormTransitionHistoryOperations.js";

function createHistoryCharacter() {
  return createCharacter({
    identity: {
      id: "char-history-version",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
  });
}

test("same timestamp can preserve distinct return request versions", () => {
  const firstRequest = {
    requestedAt: "2026-06-19T12:00:00.000Z",
    intent: "automatic",
    reasons: ["maximum-duration-reached"],
    triggerIds: [],
    targetFormId: "form-base",
  };
  const first = recordFormRuntimeAdvance(createHistoryCharacter(), {
    formSetId: "set-body",
    formId: "form-wolf",
    runtimeId: "runtime-001",
    observedAt: "2026-06-19T12:00:00.000Z",
    returnRequest: firstRequest,
  });
  const secondRequest = {
    ...firstRequest,
    reasons: [
      "maximum-duration-reached",
      "return-trigger-active",
    ],
    triggerIds: ["trigger-sunrise"],
  };
  const second = recordFormRuntimeAdvance(first, {
    formSetId: "set-body",
    formId: "form-wolf",
    runtimeId: "runtime-001",
    observedAt: "2026-06-19T12:00:00.000Z",
    previousReturnRequest: firstRequest,
    returnRequest: secondRequest,
  });

  assert.equal(second.formTransitionHistory.length, 2);
  assert.notEqual(
    second.formTransitionHistory[0].id,
    second.formTransitionHistory[1].id,
  );
  assert.deepEqual(
    second.formTransitionHistory[1].data.request.reasons,
    ["maximum-duration-reached", "return-trigger-active"],
  );
});
