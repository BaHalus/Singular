import test from "node:test";
import assert from "node:assert/strict";

import {
  createFormTransitionRules,
  serializeFormTransitionRules,
} from "./FormTransitionRules.js";

test("creates conservative default transition rules", () => {
  const rules = createFormTransitionRules();

  assert.equal(rules.activation.baseTimeSeconds, null);
  assert.equal(rules.activation.timeStepsDelta, 0);
  assert.equal(rules.activation.maneuver, null);
  assert.deepEqual(rules.activation.costs, []);
  assert.deepEqual(rules.activation.tests, []);
  assert.deepEqual(rules.activation.requirements, []);
  assert.deepEqual(rules.activation.triggers, []);
  assert.equal(rules.activation.involuntary, false);
  assert.equal(rules.activation.interruptible, true);

  assert.equal(rules.deactivation.baseTimeSeconds, null);
  assert.equal(rules.return.mode, "manual");
  assert.equal(rules.return.targetFormId, null);
  assert.deepEqual(rules.impediments, []);
});

test("normalizes complete transition rules", () => {
  const rules = createFormTransitionRules({
    activation: {
      baseTimeSeconds: 10,
      timeStepsDelta: -1,
      maneuver: "Concentrate",
      involuntary: true,
      interruptible: false,
      costs: [
        {
          id: "cost-fp",
          resource: "FP",
          amount: 2,
          timing: "activation",
        },
      ],
      tests: [
        {
          id: "test-will",
          kind: "attribute",
          target: "Will",
          modifier: -3,
        },
      ],
      requirements: [
        {
          id: "req-moon",
          kind: "environment",
          description: "Lua cheia",
        },
      ],
      triggers: [
        {
          id: "trigger-blood",
          kind: "trigger",
          description: "Sentir sangue",
        },
      ],
    },
    deactivation: {
      baseTimeSeconds: 1,
      maneuver: "Ready",
    },
    duration: {
      minimumSeconds: 60,
      maximumSeconds: 3600,
    },
    return: {
      mode: "automatic",
      targetFormId: "form-base",
      triggers: [
        {
          id: "return-sunrise",
          description: "Nascer do sol",
        },
      ],
    },
    impediments: [
      {
        id: "imp-silver",
        description: "Prata consagrada",
      },
    ],
  });

  assert.equal(rules.activation.baseTimeSeconds, 10);
  assert.equal(rules.activation.timeStepsDelta, -1);
  assert.equal(rules.activation.maneuver, "Concentrate");
  assert.equal(rules.activation.involuntary, true);
  assert.equal(rules.activation.interruptible, false);
  assert.equal(rules.activation.costs[0].amount, 2);
  assert.equal(rules.activation.tests[0].modifier, -3);
  assert.equal(rules.activation.requirements[0].description, "Lua cheia");
  assert.equal(rules.duration.maximumSeconds, 3600);
  assert.equal(rules.return.mode, "automatic");
  assert.equal(rules.return.targetFormId, "form-base");
  assert.equal(rules.impediments[0].description, "Prata consagrada");
});

test("serializes transition rules without loss", () => {
  const rules = createFormTransitionRules({
    activation: {
      costs: [
        {
          id: "cost-fp",
          resource: "FP",
          amount: 1,
          timing: "activation",
          intervalSeconds: null,
          notes: "",
        },
      ],
    },
    return: {
      mode: "locked",
    },
  });

  const json = serializeFormTransitionRules(rules);

  assert.deepEqual(json, rules);
  assert.notEqual(json, rules);
  assert.notEqual(json.activation.costs, rules.activation.costs);
});

test("rejects invalid transition rules", () => {
  assert.throws(() => {
    createFormTransitionRules({
      duration: {
        minimumSeconds: 10,
        maximumSeconds: 5,
      },
    });
  });

  assert.throws(() => {
    createFormTransitionRules({
      return: {
        mode: "random",
      },
    });
  });

  assert.throws(() => {
    createFormTransitionRules({
      activation: {
        timeStepsDelta: 1.5,
      },
    });
  });

  assert.throws(() => {
    createFormTransitionRules({
      activation: {
        costs: [
          {
            resource: "FP",
            amount: -1,
          },
        ],
      },
    });
  });

  assert.throws(() => {
    createFormTransitionRules({
      activation: {
        tests: [
          {
            kind: "unknown",
          },
        ],
      },
    });
  });
});
