import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  evaluateTraitAlternativeGroups,
  serializeTraitAlternativeGroupsEvaluation,
  validateTraitAlternativeGroupsEvaluation,
} from "./TraitAlternativeGroups.js";

function advantage({
  id,
  points,
  groupId = null,
  primary = null,
  roundCostDown = false,
  role = "advantage",
} = {}) {
  return createTrait({
    id,
    role,
    name: id,
    alternateGroupId: groupId,
    isPrimaryAlternative: primary,
    roundCostDown,
    pointValue: {
      mode: "total",
      basePoints: points,
    },
  });
}

test("charges the most expensive member in full and the others at one fifth", () => {
  const result = evaluateTraitAlternativeGroups([
    advantage({ id: "ability-100", points: 100, groupId: "group-a" }),
    advantage({ id: "ability-50", points: 50, groupId: "group-a" }),
    advantage({ id: "ability-25", points: 25, groupId: "group-a" }),
  ]);

  assert.equal(result.status, "ready");
  assert.equal(result.totalPoints, 115);
  assert.equal(result.groups[0].primaryTraitId, "ability-100");
  assert.deepEqual(
    result.contributions.map(item => [item.traitId, item.contributionPoints]),
    [
      ["ability-100", 100],
      ["ability-50", 10],
      ["ability-25", 5],
    ],
  );
});

test("rounds alternative contributions upward by default", () => {
  const result = evaluateTraitAlternativeGroups([
    advantage({ id: "primary", points: 10, groupId: "group-round" }),
    advantage({ id: "alternative", points: 7, groupId: "group-round" }),
  ]);

  const alternative = result.contributions.find(item => (
    item.traitId === "alternative"
  ));
  assert.equal(alternative.individualPoints, 7);
  assert.equal(alternative.contributionPoints, 2);
});

test("accepts an explicit group rounding policy", () => {
  const result = evaluateTraitAlternativeGroups([
    advantage({ id: "primary", points: 10, groupId: "group-down" }),
    advantage({ id: "alternative", points: 7, groupId: "group-down" }),
  ], {
    groupPolicies: {
      "group-down": {
        alternativeFactor: 0.2,
        roundCostDown: true,
      },
    },
  });

  assert.equal(
    result.contributions.find(item => item.traitId === "alternative")
      .contributionPoints,
    1,
  );
});

test("selects a deterministic primary among equal maximum costs", () => {
  const result = evaluateTraitAlternativeGroups([
    advantage({ id: "zeta", points: 20, groupId: "group-tie" }),
    advantage({ id: "alpha", points: 20, groupId: "group-tie" }),
  ]);

  assert.equal(result.groups[0].primaryTraitId, "alpha");
  assert.equal(
    result.groups[0].diagnostics[0].code,
    "trait-alternative-group-primary-selected-automatically",
  );
});

test("uses an explicit primary only when it is among the maximum-cost members", () => {
  const ready = evaluateTraitAlternativeGroups([
    advantage({
      id: "zeta",
      points: 20,
      groupId: "group-explicit",
      primary: true,
    }),
    advantage({ id: "alpha", points: 20, groupId: "group-explicit" }),
  ]);
  const conflict = evaluateTraitAlternativeGroups([
    advantage({
      id: "cheap",
      points: 10,
      groupId: "group-conflict",
      primary: true,
    }),
    advantage({ id: "expensive", points: 20, groupId: "group-conflict" }),
  ]);

  assert.equal(ready.groups[0].primaryTraitId, "zeta");
  assert.equal(conflict.status, "conflict");
  assert.equal(
    conflict.groups[0].diagnostics[0].code,
    "trait-alternative-group-primary-not-most-expensive",
  );
});

test("rejects multiple explicit primaries in the same maximum tier", () => {
  const result = evaluateTraitAlternativeGroups([
    advantage({
      id: "first",
      points: 20,
      groupId: "group-multiple",
      primary: true,
    }),
    advantage({
      id: "second",
      points: 20,
      groupId: "group-multiple",
      primary: true,
    }),
  ]);

  assert.equal(result.status, "conflict");
  assert.equal(
    result.groups[0].diagnostics[0].code,
    "trait-alternative-group-multiple-primary",
  );
});

test("rejects one-member groups, non-advantages and negative costs", () => {
  const singleton = evaluateTraitAlternativeGroups([
    advantage({ id: "alone", points: 10, groupId: "group-alone" }),
  ]);
  const wrongRole = evaluateTraitAlternativeGroups([
    advantage({ id: "adv", points: 10, groupId: "group-role" }),
    advantage({
      id: "disadv",
      points: -10,
      groupId: "group-role",
      role: "disadvantage",
    }),
  ]);
  const negative = evaluateTraitAlternativeGroups([
    advantage({ id: "positive", points: 10, groupId: "group-negative" }),
    advantage({ id: "negative", points: -5, groupId: "group-negative" }),
  ]);

  assert.equal(singleton.status, "conflict");
  assert.equal(wrongRole.status, "conflict");
  assert.equal(negative.status, "conflict");
});

test("propagates incomplete individual costs and keeps standalone costs in full", () => {
  const incomplete = createTrait({
    id: "incomplete",
    role: "advantage",
    name: "incomplete",
    alternateGroupId: "group-pending",
    pointValue: {
      mode: "per-level",
      pointsPerLevel: 5,
      levels: null,
    },
  });
  const result = evaluateTraitAlternativeGroups([
    advantage({ id: "standalone", points: 12 }),
    advantage({ id: "ready", points: 20, groupId: "group-pending" }),
    incomplete,
  ]);

  assert.equal(result.status, "incomplete");
  assert.equal(result.totalPoints, null);
  assert.equal(
    result.contributions.find(item => item.traitId === "standalone")
      .contributionPoints,
    12,
  );
});

test("returns a frozen serializable self-validating evaluation", () => {
  const result = evaluateTraitAlternativeGroups([
    advantage({ id: "full", points: 10, groupId: "group-frozen" }),
    advantage({ id: "discount", points: 5, groupId: "group-frozen" }),
  ]);
  const serialized = serializeTraitAlternativeGroupsEvaluation(result);

  assert.equal(validateTraitAlternativeGroupsEvaluation(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.groups[0]), true);
  assert.deepEqual(serialized, result);
  assert.notEqual(serialized, result);
});
