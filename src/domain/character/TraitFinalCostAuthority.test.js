import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  createTraitChoices,
  evaluateTraitChoices,
} from "./TraitChoices.js";
import { evaluateTraitFinalCost } from "./TraitFinalCost.js";
import {
  createTraitFinalCostAuthority,
  serializeTraitFinalCostAuthority,
  validateTraitFinalCostAuthority,
} from "./TraitFinalCostAuthority.js";

function authorityInput(overrides = {}) {
  const trait = createTrait({
    id: "trait-authority",
    role: "advantage",
    name: "Trait com autoridade",
    pointValue: { basePoints: 10 },
  });
  const finalCost = evaluateTraitFinalCost(trait);
  const choices = evaluateTraitChoices(createTraitChoices([
    { key: "especializacao", value: "Fogo", required: true },
  ]));

  return {
    operationId: "operation-1",
    appliedAt: "2026-06-21T16:00:00.000Z",
    characterId: "character-1",
    traitId: trait.id,
    sourceFingerprint: "source-1",
    analysisFingerprint: "analysis-1",
    planFingerprint: "plan-1",
    groupId: null,
    groupRole: "standalone",
    individualPoints: finalCost.calculatedPoints,
    contributionPoints: finalCost.calculatedPoints,
    finalCost,
    choices,
    groupPolicy: null,
    ...overrides,
  };
}

test("creates a deeply frozen, serializable and self-validating authority", () => {
  const authority = createTraitFinalCostAuthority(authorityInput());
  const serialized = serializeTraitFinalCostAuthority(authority);

  assert.equal(authority.schemaVersion, 1);
  assert.equal(validateTraitFinalCostAuthority(authority), true);
  assert.equal(Object.isFrozen(authority), true);
  assert.equal(Object.isFrozen(authority.finalCost), true);
  assert.equal(Object.isFrozen(authority.choices), true);
  assert.deepEqual(serialized, authority);
  assert.notEqual(serialized, authority);
  assert.notEqual(serialized.finalCost, authority.finalCost);
});

test("accepts an explicit alternative-group contribution and policy snapshot", () => {
  const authority = createTraitFinalCostAuthority(authorityInput({
    groupId: "group-1",
    groupRole: "alternative",
    contributionPoints: 2,
    groupPolicy: {
      alternativeFactor: 0.2,
      roundCostDown: false,
    },
  }));

  assert.equal(authority.groupId, "group-1");
  assert.equal(authority.groupRole, "alternative");
  assert.equal(authority.contributionPoints, 2);
  assert.deepEqual(authority.groupPolicy, {
    alternativeFactor: 0.2,
    roundCostDown: false,
  });
});

test("rejects identity and individual-cost inconsistencies", () => {
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({ traitId: "other-trait" })),
    /traitId mismatch/,
  );
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({ individualPoints: 9 })),
    /individualPoints is inconsistent/,
  );
});

test("enforces standalone and grouped role invariants", () => {
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({
      groupId: "group-1",
    })),
    /cannot have group data/,
  );
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({
      groupRole: "primary",
    })),
    /requires groupId/,
  );
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({
      contributionPoints: 2,
    })),
    /Standalone Trait contribution is inconsistent/,
  );
});

test("rejects invalid timestamps, roles, choices and policy snapshots", () => {
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({ appliedAt: "not-a-date" })),
    /appliedAt must be timestamp/,
  );
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({ groupRole: "secondary" })),
    /groupRole is invalid/,
  );
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({
      groupId: "group-invalid",
      groupRole: "alternative",
      contributionPoints: 2,
      groupPolicy: {
        alternativeFactor: 1.2,
        roundCostDown: false,
      },
    })),
    /groupPolicy is invalid/,
  );
  const incompleteChoices = evaluateTraitChoices(createTraitChoices([
    { key: "especializacao", value: null, required: true },
  ]));
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({
      choices: incompleteChoices,
    })),
    /requires ready choices/,
  );
});

test("validates primary and alternative contributions against the group policy", () => {
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({
      groupId: "group-primary",
      groupRole: "primary",
      contributionPoints: 2,
      groupPolicy: {
        alternativeFactor: 0.2,
        roundCostDown: false,
      },
    })),
    /Primary Trait contribution is inconsistent/,
  );
  assert.throws(
    () => createTraitFinalCostAuthority(authorityInput({
      groupId: "group-alternative",
      groupRole: "alternative",
      contributionPoints: 3,
      groupPolicy: {
        alternativeFactor: 0.2,
        roundCostDown: false,
      },
    })),
    /Alternative Trait contribution is inconsistent/,
  );
});
