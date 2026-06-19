import test from "node:test";
import assert from "node:assert/strict";

import {
  createFormTransitionRuntime,
  serializeFormTransitionRuntime,
} from "./FormTransitionRuntime.js";

test("creates and serializes transition runtime", () => {
  const runtime = createFormTransitionRuntime({
    activationId: "activation-001",
    formId: "form-wolf",
    startedAt: "2026-06-19T12:00:00.000Z",
    maintenance: [
      {
        costId: "maintenance-fp",
        resource: "FP",
        resourceKey: "FP",
        amount: 1,
        intervalSeconds: 60,
        nextDueAt: "2026-06-19T12:01:00.000Z",
      },
    ],
    duration: {
      minimumSeconds: 30,
      maximumSeconds: 600,
    },
  });

  assert.equal(runtime.status, "active");
  assert.equal(runtime.elapsedSeconds, 0);
  assert.equal(runtime.maintenance[0].chargedIntervals, 0);
  assert.equal(runtime.duration.minimumReached, false);
  assert.equal(runtime.returnRequest, null);

  const json = serializeFormTransitionRuntime(runtime);
  assert.deepEqual(json, runtime);
  assert.notEqual(json, runtime);
  assert.notEqual(json.maintenance, runtime.maintenance);
});

test("accepts null runtime", () => {
  assert.equal(createFormTransitionRuntime(), null);
  assert.equal(serializeFormTransitionRuntime(null), null);
});

test("rejects invalid runtime clocks and maintenance", () => {
  assert.throws(() => createFormTransitionRuntime({
    activationId: "activation-001",
    formId: "form-wolf",
    startedAt: "2026-06-19T12:00:00.000Z",
    observedAt: "2026-06-19T11:59:00.000Z",
  }));

  assert.throws(() => createFormTransitionRuntime({
    activationId: "activation-001",
    formId: "form-wolf",
    startedAt: "2026-06-19T12:00:00.000Z",
    maintenance: [
      {
        costId: "maintenance-fp",
        intervalSeconds: 0,
      },
    ],
  }));

  assert.throws(() => createFormTransitionRuntime({
    activationId: "activation-001",
    formId: "form-wolf",
    startedAt: "2026-06-19T12:00:00.000Z",
    duration: {
      minimumSeconds: 100,
      maximumSeconds: 50,
    },
  }));
});
