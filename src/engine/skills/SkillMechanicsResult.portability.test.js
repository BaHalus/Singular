import test from "node:test";
import assert from "node:assert/strict";

import {
  createSkillMechanicsResult,
  validateSkillMechanicsResult,
} from "./SkillMechanicsResult.js";

function resolvedInput(overrides = {}) {
  return {
    entityId: "skill-stealth",
    entityType: "skill",
    status: "resolved",
    level: 12,
    relativeLevel: 1,
    basis: {
      kind: "trained",
      sourceId: null,
      attribute: "DX",
    },
    ...overrides,
  };
}

test("rejects sparse applied modifier arrays", () => {
  assert.throws(
    () => createSkillMechanicsResult(resolvedInput({
      appliedModifierIds: new Array(1),
    })),
    /must not contain sparse entries/,
  );
});

test("rejects sparse top-level diagnostics arrays", () => {
  assert.throws(
    () => createSkillMechanicsResult(resolvedInput({
      diagnostics: new Array(1),
    })),
    /must not contain sparse entries/,
  );
});

test("rejects sparse arrays nested inside diagnostics", () => {
  const sparseDetails = [];
  sparseDetails.length = 2;
  sparseDetails[1] = "known";

  assert.throws(
    () => createSkillMechanicsResult(resolvedInput({
      diagnostics: [
        {
          code: "SPARSE_DETAIL",
          severity: "warning",
          details: sparseDetails,
        },
      ],
    })),
    /must not contain sparse entries/,
  );
});

test("rejects non-index enumerable properties on arrays", () => {
  const modifierIds = ["modifier-1"];
  modifierIds.source = "legacy";

  assert.throws(
    () => createSkillMechanicsResult(resolvedInput({
      appliedModifierIds: modifierIds,
    })),
    /must not contain non-index properties/,
  );
});

test("rejects cyclic diagnostic payloads", () => {
  const diagnostic = {
    code: "CYCLIC_DETAIL",
    severity: "warning",
  };
  diagnostic.self = diagnostic;

  assert.throws(
    () => createSkillMechanicsResult(resolvedInput({
      diagnostics: [diagnostic],
    })),
    /must be JSON portable/,
  );
});

test("rejects class instances in diagnostic payloads", () => {
  assert.throws(
    () => createSkillMechanicsResult(resolvedInput({
      diagnostics: [
        {
          code: "DATE_DETAIL",
          severity: "warning",
          observedAt: new Date("2026-06-26T00:00:00Z"),
        },
      ],
    })),
    /must be JSON portable/,
  );
});

test("direct validation rejects sparse arrays too", () => {
  const result = {
    schemaVersion: 1,
    entityId: "skill-stealth",
    entityType: "skill",
    status: "resolved",
    level: 12,
    relativeLevel: 1,
    basis: {
      kind: "trained",
      sourceId: null,
      attribute: "DX",
    },
    appliedModifierIds: new Array(1),
    diagnostics: [],
  };

  assert.throws(
    () => validateSkillMechanicsResult(result),
    /must not contain sparse entries/,
  );
});
