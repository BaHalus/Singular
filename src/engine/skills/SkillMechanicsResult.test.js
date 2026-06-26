import test from "node:test";
import assert from "node:assert/strict";

import {
  createSkillMechanicsResult,
  getSkillMechanicsResultSchemaVersion,
  serializeSkillMechanicsResult,
  validateSkillMechanicsResult,
} from "./SkillMechanicsResult.js";

test("creates an immutable resolved Skill mechanics result", () => {
  const result = createSkillMechanicsResult({
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
    appliedModifierIds: ["modifier-flexibility"],
    diagnostics: [
      {
        code: "IMPORTED_LEVEL_DIFFERS",
        severity: "warning",
        importedLevel: 11,
        calculatedLevel: 12,
      },
    ],
  });

  assert.equal(result.schemaVersion, getSkillMechanicsResultSchemaVersion());
  assert.equal(result.entityId, "skill-stealth");
  assert.equal(result.entityType, "skill");
  assert.equal(result.status, "resolved");
  assert.equal(result.level, 12);
  assert.equal(result.relativeLevel, 1);
  assert.deepEqual(result.basis, {
    kind: "trained",
    sourceId: null,
    attribute: "DX",
  });
  assert.deepEqual(result.appliedModifierIds, ["modifier-flexibility"]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.basis), true);
  assert.equal(Object.isFrozen(result.diagnostics), true);
  assert.equal(Object.isFrozen(result.diagnostics[0]), true);
  assert.equal(validateSkillMechanicsResult(result), true);
});

test("supports a resolved Technique result with explicit source identity", () => {
  const result = createSkillMechanicsResult({
    entityId: "technique-arm-lock",
    entityType: "technique",
    status: "resolved",
    level: 14,
    relativeLevel: 0,
    basis: {
      kind: "technique",
      sourceId: "skill-judo",
      attribute: null,
    },
  });

  assert.equal(result.entityType, "technique");
  assert.equal(result.basis.kind, "technique");
  assert.equal(result.basis.sourceId, "skill-judo");
  assert.deepEqual(result.appliedModifierIds, []);
  assert.deepEqual(result.diagnostics, []);
});

test("creates a blocked result without resolved values", () => {
  const result = createSkillMechanicsResult({
    entityId: "skill-hidden-lore",
    entityType: "skill",
    status: "blocked",
    diagnostics: [
      {
        code: "ATTRIBUTE_NOT_FOUND",
        severity: "blocked",
        attribute: "UNKNOWN",
      },
    ],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.level, null);
  assert.equal(result.relativeLevel, null);
  assert.equal(result.basis, null);
  assert.equal(result.diagnostics[0].severity, "blocked");
});

test("serializes to a detached portable object", () => {
  const result = createSkillMechanicsResult({
    entityId: "skill-stealth",
    entityType: "skill",
    status: "resolved",
    level: 12,
    relativeLevel: 1,
    basis: {
      kind: "default",
      sourceId: "skill-shadowing",
      attribute: "DX",
    },
    diagnostics: [
      {
        code: "DEFAULT_SELECTED",
        severity: "info",
      },
    ],
  });

  const serialized = serializeSkillMechanicsResult(result);

  assert.deepEqual(serialized, result);
  assert.notEqual(serialized, result);
  assert.notEqual(serialized.basis, result.basis);
  assert.notEqual(serialized.diagnostics, result.diagnostics);
  assert.equal(Object.isFrozen(serialized), false);
});

test("rejects invalid entity types, statuses and basis kinds", () => {
  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "spell-fireball",
      entityType: "spell",
      status: "resolved",
      level: 12,
      relativeLevel: 1,
      basis: {
        kind: "trained",
        sourceId: null,
        attribute: "IQ",
      },
    }),
    /entityType is invalid/,
  );

  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "pending",
    }),
    /status is invalid/,
  );

  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "resolved",
      level: 12,
      relativeLevel: 1,
      basis: {
        kind: "imported",
        sourceId: null,
        attribute: "DX",
      },
    }),
    /basis kind is invalid/,
  );
});

test("rejects resolved results without complete resolved values", () => {
  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "resolved",
      level: 12,
      basis: {
        kind: "trained",
        sourceId: null,
        attribute: "DX",
      },
    }),
    /must contain level and relativeLevel/,
  );

  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "resolved",
      level: 12,
      relativeLevel: 1,
    }),
    /must contain basis/,
  );

  assert.throws(
    () => createSkillMechanicsResult({
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
      diagnostics: [
        {
          code: "UNRESOLVED_REFERENCE",
          severity: "blocked",
        },
      ],
    }),
    /must not contain blocked diagnostics/,
  );
});

test("rejects blocked results with resolved values or no blocking diagnostic", () => {
  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "blocked",
      level: 12,
      diagnostics: [
        {
          code: "ATTRIBUTE_NOT_FOUND",
          severity: "blocked",
        },
      ],
    }),
    /must not contain resolved values/,
  );

  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "blocked",
      diagnostics: [
        {
          code: "INCOMPLETE_INPUT",
          severity: "warning",
        },
      ],
    }),
    /must contain a blocked diagnostic/,
  );
});

test("rejects duplicate modifier ids and non-portable diagnostics", () => {
  assert.throws(
    () => createSkillMechanicsResult({
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
      appliedModifierIds: ["modifier-1", "modifier-1"],
    }),
    /must not contain duplicates/,
  );

  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "blocked",
      diagnostics: [
        {
          code: "INVALID_INPUT",
          severity: "blocked",
          detail: undefined,
        },
      ],
    }),
    /must be JSON portable/,
  );
});

test("rejects non-finite levels", () => {
  assert.throws(
    () => createSkillMechanicsResult({
      entityId: "skill-stealth",
      entityType: "skill",
      status: "resolved",
      level: Number.NaN,
      relativeLevel: 1,
      basis: {
        kind: "trained",
        sourceId: null,
        attribute: "DX",
      },
    }),
    /level must be a finite number or null/,
  );
});
