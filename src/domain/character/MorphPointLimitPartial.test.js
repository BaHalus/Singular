import test from "node:test";
import assert from "node:assert/strict";

import { createMorphProfile } from "./MorphProfile.js";
import {
  applyMorphPointLimitToSelection,
  evaluateMorphPointLimit,
} from "./MorphPointLimit.js";

test("partial improvisation cap keeps unknown template points pending", () => {
  const profile = createMorphProfile({
    pointLimitMode: "undeclared",
    pointLimit: null,
    pointLimitSource: "undeclared",
    improvisation: {
      mode: "allowed",
      pointLimit: 40,
      traitScope: "physicalNatural",
      availabilityScope: "settingOnly",
      compositionScope: "sameComposition",
    },
  });
  const evaluation = evaluateMorphPointLimit(profile, null, {
    targetKind: "improvised",
  });
  const selection = applyMorphPointLimitToSelection({
    status: "ready",
    reasons: [],
    templateImportedPoints: null,
    pointLimitEvaluation: null,
  }, evaluation);

  assert.equal(evaluation.enforcementMode, "partial");
  assert.equal(evaluation.enforced, true);
  assert.equal(evaluation.complete, false);
  assert.equal(evaluation.status, "pending");
  assert.equal(
    evaluation.reasons.includes("morph-template-points-unknown"),
    true,
  );
  assert.equal(selection.status, "pending");
  assert.equal(
    selection.reasons.includes("morph-template-points-unknown"),
    true,
  );
});
