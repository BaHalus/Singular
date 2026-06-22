import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../character/Character.js";
import {
  executeTraitCostAuthorityPlan,
} from "../character/TraitCostAuthorityExecutor.js";
import {
  planTraitCostAuthority,
} from "../character/TraitCostAuthorityPlan.js";
import { evaluateTraitPointDomain } from "./TraitPointDomain.js";

function baseCharacter() {
  return createCharacter({
    identity: {
      id: "character-trait-provider",
      name: "Trait Provider",
    },
    traits: [
      {
        id: "advantage-primary",
        role: "advantage",
        name: "Primary",
        alternateGroupId: "group-a",
        pointValue: {
          mode: "total",
          importedPoints: 20,
        },
      },
      {
        id: "advantage-alternative",
        role: "advantage",
        name: "Alternative",
        alternateGroupId: "group-a",
        pointValue: {
          mode: "total",
          importedPoints: 7,
        },
      },
      {
        id: "disadvantage-a",
        role: "disadvantage",
        name: "Disadvantage",
        pointValue: {
          mode: "total",
          importedPoints: -10,
        },
      },
    ],
    traitAlternativeGroups: [{
      id: "group-a",
      alternativeFactor: 0.2,
      roundCostDown: false,
    }],
  });
}

function promote(character) {
  const plan = planTraitCostAuthority(character, {
    now: "2026-06-21T18:00:00.000Z",
    operationId: "operation-trait-provider",
    planId: "plan-trait-provider",
  });
  return executeTraitCostAuthorityPlan(character, plan, {
    now: "2026-06-21T18:01:00.000Z",
  }).character;
}

test("unpromoted Traits remain pending and do not expose points", () => {
  const result = evaluateTraitPointDomain(baseCharacter());

  assert.equal(result.report.status, "pending");
  assert.equal(result.report.knownPoints, 0);
  assert.equal(result.report.totalPoints, null);
  assert.ok(result.report.contributions.every(item => (
    item.status === "pending" && item.points === null
  )));
  assert.equal(result.discrepancies.length, 3);
  assert.ok(result.discrepancies.every(item => item.status === "pending"));
});

test("promoted Traits publish only their authorized final contribution", () => {
  const result = evaluateTraitPointDomain(promote(baseCharacter()));
  const contributions = new Map(
    result.report.contributions.map(item => [item.sourceId, item]),
  );

  assert.equal(result.report.status, "ready");
  assert.equal(result.report.totalPoints, 12);
  assert.equal(contributions.get("advantage-primary").points, 20);
  assert.equal(contributions.get("advantage-primary").category, "advantages");
  assert.equal(contributions.get("advantage-alternative").points, 2);
  assert.equal(
    contributions.get("advantage-alternative").provenance.individualPoints,
    7,
  );
  assert.equal(contributions.get("disadvantage-a").points, -10);
  assert.equal(contributions.get("disadvantage-a").category, "disadvantages");
  assert.ok(result.report.contributions.every(item => (
    typeof item.authorityFingerprint === "string" &&
    item.authorityFingerprint !== ""
  )));
});

test("preserves expected imported divergence for an alternative ability", () => {
  const result = evaluateTraitPointDomain(promote(baseCharacter()));
  const discrepancy = result.discrepancies.find(item => (
    item.sourceId === "advantage-alternative"
  ));

  assert.equal(discrepancy.status, "divergent");
  assert.equal(discrepancy.importedPoints, 7);
  assert.equal(discrepancy.calculatedPoints, 2);
  assert.equal(discrepancy.difference, -5);
  assert.equal(discrepancy.provenance.groupRole, "alternative");
});

test("an empty Trait domain is complete at zero", () => {
  const character = createCharacter({
    identity: {
      id: "character-no-traits",
      name: "No Traits",
    },
  });
  const result = evaluateTraitPointDomain(character);

  assert.equal(result.report.status, "ready");
  assert.equal(result.report.totalPoints, 0);
  assert.deepEqual(result.report.contributions, []);
  assert.deepEqual(result.discrepancies, []);
});
