import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";
import {
  analyzeTraitCostAuthority,
  validateTraitCostAuthorityAnalysis,
} from "./TraitCostAuthorityAnalysis.js";
import {
  planTraitCostAuthority,
  validateTraitCostAuthorityPlan,
} from "./TraitCostAuthorityPlan.js";
import {
  createTraitCostSourceFingerprint,
  createTraitCostTargetFingerprint,
} from "./TraitCostSourceProjection.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-integrity",
      name: "Integridade",
    },
    traits: [{
      id: "trait-integrity",
      role: "advantage",
      name: "Trait",
      source: {
        kind: "imported",
        provider: "gcs",
        format: "gcs",
        reference: "P1",
        version: 5,
      },
      pointValue: {
        mode: "total",
        importedPoints: 10,
      },
    }],
  });
}

function rebuild(original, mutate) {
  const input = structuredClone(serializeCharacter(original));
  mutate(input);
  input.advantages = null;
  input.perks = null;
  input.disadvantages = null;
  input.quirks = null;
  return createCharacter(input);
}

test("non-mechanical provenance changes do not alter the source fingerprint", () => {
  const original = character();
  const changed = rebuild(original, input => {
    input.traits[0].source.reference = "P2";
  });

  assert.equal(
    createTraitCostSourceFingerprint(original),
    createTraitCostSourceFingerprint(changed),
  );
});

test("target-only changes alter only the target fingerprint", () => {
  const original = character();
  const changed = rebuild(original, input => {
    input.traits[0].pointValue.calculatedPoints = 10;
  });

  assert.equal(
    createTraitCostSourceFingerprint(original),
    createTraitCostSourceFingerprint(changed),
  );
  assert.notEqual(
    createTraitCostTargetFingerprint(original),
    createTraitCostTargetFingerprint(changed),
  );
});

test("analysis validation rejects a modified embedded evaluation", () => {
  const analysis = structuredClone(analyzeTraitCostAuthority(character()));
  analysis.groups.contributions[0].contributionPoints = 999;

  assert.throws(
    () => validateTraitCostAuthorityAnalysis(analysis),
    /fingerprint is inconsistent|stale or inconsistent/,
  );
});

test("plan validation rejects a modified embedded analysis", () => {
  const plan = structuredClone(planTraitCostAuthority(character(), {
    now: "2026-06-21T17:20:00.000Z",
    operationId: "operation-integrity",
    planId: "plan-integrity",
  }));
  plan.analysis.groups.contributions[0].contributionPoints = 999;

  assert.throws(
    () => validateTraitCostAuthorityPlan(plan),
    /fingerprint is inconsistent|stale or inconsistent/,
  );
});
