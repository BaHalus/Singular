import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";
import {
  analyzeTraitCostAuthority,
} from "./TraitCostAuthorityAnalysis.js";
import {
  executeTraitCostAuthorityPlan,
  TraitCostAuthorityExecutionError,
} from "./TraitCostAuthorityExecutor.js";
import {
  planTraitCostAuthority,
  validateTraitCostAuthorityPlan,
} from "./TraitCostAuthorityPlan.js";

const PLANNED_AT = "2026-06-21T17:00:00.000Z";
const EXECUTED_AT = "2026-06-21T17:01:00.000Z";

function readyCharacter(identityId = "character-trait-cost") {
  return createCharacter({
    identity: {
      id: identityId,
      name: "Autoridade de Traits",
    },
    traits: [
      trait("standalone", 12),
      trait("primary", 20, "group-power"),
      trait("alternative", 7, "group-power"),
    ],
    traitAlternativeGroups: [{
      id: "group-power",
      alternativeFactor: 0.2,
      roundCostDown: false,
    }],
  });
}

function trait(id, points, alternateGroupId = null) {
  return {
    id,
    role: "advantage",
    name: id,
    alternateGroupId,
    pointValue: {
      mode: "total",
      basePoints: points,
    },
  };
}

function rebuild(character, mutateTraits) {
  const input = structuredClone(serializeCharacter(character));
  input.traits = mutateTraits(input.traits);
  input.advantages = null;
  input.perks = null;
  input.disadvantages = null;
  input.quirks = null;
  return createCharacter(input);
}

test("analyzes individual and grouped contributions without persisting them", () => {
  const character = readyCharacter();
  const analysis = analyzeTraitCostAuthority(character);

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.complete, true);
  assert.equal(analysis.groups.totalPoints, 34);
  assert.deepEqual(
    analysis.groups.contributions.map(item => [
      item.traitId,
      item.groupRole,
      item.individualPoints,
      item.contributionPoints,
    ]),
    [
      ["standalone", "standalone", 12, 12],
      ["primary", "primary", 20, 20],
      ["alternative", "alternative", 7, 2],
    ],
  );
  assert.ok(character.traits.every(item => (
    item.pointValue.calculatedPoints === null &&
    item.pointValue.finalCostAuthority === undefined
  )));
});

test("plans, revalidates and applies every contribution atomically", () => {
  const character = readyCharacter();
  const plan = planTraitCostAuthority(character, {
    now: PLANNED_AT,
    operationId: "operation-trait-cost",
    planId: "plan-trait-cost",
  });
  const result = executeTraitCostAuthorityPlan(character, plan, {
    now: EXECUTED_AT,
  });
  const byId = new Map(result.character.traits.map(item => [item.id, item]));

  assert.equal(validateTraitCostAuthorityPlan(plan), true);
  assert.equal(plan.status, "ready");
  assert.equal(result.changed, true);
  assert.equal(byId.get("standalone").pointValue.calculatedPoints, 12);
  assert.equal(byId.get("primary").pointValue.calculatedPoints, 20);
  assert.equal(byId.get("alternative").pointValue.calculatedPoints, 2);
  assert.equal(
    byId.get("standalone").pointValue.finalCostAuthority.groupRole,
    "standalone",
  );
  assert.equal(
    byId.get("primary").pointValue.finalCostAuthority.groupRole,
    "primary",
  );
  assert.equal(
    byId.get("alternative").pointValue.finalCostAuthority.groupRole,
    "alternative",
  );
  assert.equal(
    byId.get("alternative").pointValue.finalCostAuthority.operationId,
    "operation-trait-cost",
  );
  assert.equal(result.receipt.status, "applied");
  assert.equal(result.receipt.authorities.length, 3);
  assert.notEqual(
    result.receipt.beforeTargetFingerprint,
    result.receipt.afterTargetFingerprint,
  );
  assert.ok(character.traits.every(item => item.pointValue.calculatedPoints === null));
});

test("preserves authorities through save/load and then becomes a no-op", () => {
  const character = readyCharacter();
  const applied = executeTraitCostAuthorityPlan(
    character,
    planTraitCostAuthority(character, {
      now: PLANNED_AT,
      operationId: "operation-roundtrip",
      planId: "plan-roundtrip",
    }),
    { now: EXECUTED_AT },
  );
  const serialized = serializeCharacter(applied.character);
  const restored = createCharacter(structuredClone(serialized));
  const analysis = analyzeTraitCostAuthority(restored);
  const noOpPlan = planTraitCostAuthority(restored, {
    now: "2026-06-21T17:02:00.000Z",
    operationId: "operation-no-op",
    planId: "plan-no-op",
  });
  const noOp = executeTraitCostAuthorityPlan(restored, noOpPlan, {
    now: "2026-06-21T17:03:00.000Z",
  });

  assert.deepEqual(serializeCharacter(restored), serialized);
  assert.equal(analysis.status, "no-op");
  assert.equal(noOpPlan.status, "no-op");
  assert.equal(noOp.changed, false);
  assert.equal(noOp.character, restored);
  assert.equal(noOp.receipt.status, "no-op");
  assert.equal(noOp.receipt.authorities.length, 0);
  assert.equal(Object.isFrozen(restored), false);
});

test("rejects a stale plan when a mechanical source changes", () => {
  const character = readyCharacter();
  const plan = planTraitCostAuthority(character, {
    now: PLANNED_AT,
    operationId: "operation-stale-source",
    planId: "plan-stale-source",
  });
  const changed = rebuild(character, traits => traits.map(item => (
    item.id === "primary"
      ? {
          ...item,
          pointValue: {
            ...item.pointValue,
            basePoints: 30,
          },
        }
      : item
  )));

  assert.throws(
    () => executeTraitCostAuthorityPlan(changed, plan, { now: EXECUTED_AT }),
    error => (
      error instanceof TraitCostAuthorityExecutionError &&
      error.code === "PLAN_STALE"
    ),
  );
  assert.ok(character.traits.every(item => item.pointValue.calculatedPoints === null));
});

test("rejects a stale plan when a global Power modifier changes", () => {
  const character = createCharacter({
    identity: { id: "power-stale", name: "Power stale" },
    traits: [trait("member", 20)],
    powers: [{
      id: "power",
      name: "Power",
      memberTraitIds: ["member"],
      powerModifier: { name: "Global", valuePercent: -10, notes: "" },
    }],
  });
  const plan = planTraitCostAuthority(character, {
    now: PLANNED_AT,
    operationId: "operation-stale-power",
    planId: "plan-stale-power",
  });
  const input = structuredClone(serializeCharacter(character));
  input.powers[0].powerModifier.valuePercent = -20;
  input.advantages = null;
  input.perks = null;
  input.disadvantages = null;
  input.quirks = null;
  const changed = createCharacter(input);

  assert.throws(
    () => executeTraitCostAuthorityPlan(changed, plan, { now: EXECUTED_AT }),
    error => (
      error instanceof TraitCostAuthorityExecutionError &&
      error.code === "PLAN_STALE"
    ),
  );
});

test("rejects a stale plan when only the target authority changes", () => {
  const character = readyCharacter();
  const plan = planTraitCostAuthority(character, {
    now: PLANNED_AT,
    operationId: "operation-stale-target",
    planId: "plan-stale-target",
  });
  const changed = rebuild(character, traits => traits.map(item => (
    item.id === "standalone"
      ? {
          ...item,
          pointValue: {
            ...item.pointValue,
            calculatedPoints: 99,
          },
        }
      : item
  )));

  assert.throws(
    () => executeTraitCostAuthorityPlan(changed, plan, { now: EXECUTED_AT }),
    error => (
      error instanceof TraitCostAuthorityExecutionError &&
      error.code === "PLAN_STALE"
    ),
  );
});

test("blocks execution while a required Trait choice is unresolved", () => {
  const character = createCharacter({
    identity: {
      id: "character-incomplete-choice",
      name: "Escolha incompleta",
    },
    traits: [{
      ...trait("choice-trait", 10),
      choices: [{
        key: "especializacao",
        value: null,
        required: true,
      }],
    }],
  });
  const analysis = analyzeTraitCostAuthority(character);
  const plan = planTraitCostAuthority(character, {
    now: PLANNED_AT,
    operationId: "operation-incomplete",
    planId: "plan-incomplete",
  });

  assert.equal(analysis.status, "incomplete");
  assert.equal(plan.status, "incomplete");
  assert.throws(
    () => executeTraitCostAuthorityPlan(character, plan, { now: EXECUTED_AT }),
    error => (
      error instanceof TraitCostAuthorityExecutionError &&
      error.code === "PLAN_NOT_READY"
    ),
  );
  assert.equal(character.traits[0].pointValue.calculatedPoints, null);
});

test("rejects plans belonging to another Character", () => {
  const first = readyCharacter("character-first");
  const second = readyCharacter("character-second");
  const plan = planTraitCostAuthority(first, {
    now: PLANNED_AT,
    operationId: "operation-other-character",
    planId: "plan-other-character",
  });

  assert.throws(
    () => executeTraitCostAuthorityPlan(second, plan, { now: EXECUTED_AT }),
    error => (
      error instanceof TraitCostAuthorityExecutionError &&
      error.code === "PLAN_CHARACTER_MISMATCH"
    ),
  );
});
