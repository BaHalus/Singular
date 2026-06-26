import test from "node:test";
import assert from "node:assert/strict";

import {
  createSkillDefaultCandidate,
  getSkillDefaultCandidateSchemaVersion,
  getSkillDefaultCandidateSourceTypes,
  serializeSkillDefaultCandidate,
  validateSkillDefaultCandidate,
} from "./SkillDefaultCandidate.js";

function skillSourceInput(overrides = {}) {
  return {
    id: "default-stealth-from-shadowing",
    targetSkillId: "skill-stealth",
    sourceType: "skill",
    sourceId: "skill-shadowing",
    attribute: null,
    modifier: -4,
    metadata: {
      source: "gcs",
      externalId: "default-001",
    },
    ...overrides,
  };
}

test("creates an immutable Skill-source default candidate", () => {
  const candidate = createSkillDefaultCandidate(skillSourceInput());

  assert.equal(
    candidate.schemaVersion,
    getSkillDefaultCandidateSchemaVersion(),
  );
  assert.equal(candidate.id, "default-stealth-from-shadowing");
  assert.equal(candidate.targetSkillId, "skill-stealth");
  assert.equal(candidate.sourceType, "skill");
  assert.equal(candidate.sourceId, "skill-shadowing");
  assert.equal(candidate.attribute, null);
  assert.equal(candidate.modifier, -4);
  assert.deepEqual(candidate.metadata, {
    source: "gcs",
    externalId: "default-001",
  });
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(Object.isFrozen(candidate.metadata), true);
  assert.equal(validateSkillDefaultCandidate(candidate), true);
});

test("creates an attribute default candidate", () => {
  const candidate = createSkillDefaultCandidate({
    id: "default-stealth-from-dx",
    targetSkillId: "skill-stealth",
    sourceType: "attribute",
    sourceId: null,
    attribute: "DX",
    modifier: -5,
  });

  assert.equal(candidate.sourceType, "attribute");
  assert.equal(candidate.sourceId, null);
  assert.equal(candidate.attribute, "DX");
  assert.equal(candidate.modifier, -5);
  assert.deepEqual(candidate.metadata, {});
});

test("serializes to a detached portable object", () => {
  const candidate = createSkillDefaultCandidate(skillSourceInput());

  const serialized = serializeSkillDefaultCandidate(candidate);

  assert.deepEqual(serialized, candidate);
  assert.notEqual(serialized, candidate);
  assert.notEqual(serialized.metadata, candidate.metadata);
  assert.equal(Object.isFrozen(serialized), false);
});

test("exposes detached source types", () => {
  const first = getSkillDefaultCandidateSourceTypes();
  assert.deepEqual(first, ["attribute", "skill"]);
  first.push("name");
  assert.deepEqual(
    getSkillDefaultCandidateSourceTypes(),
    ["attribute", "skill"],
  );
});

test("requires explicit candidate and target identities", () => {
  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({ id: "" })),
    /id must be a non-empty string/,
  );
  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({ targetSkillId: null })),
    /targetSkillId must be a non-empty string/,
  );
});

test("rejects unsupported source types", () => {
  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({
      sourceType: "name",
    })),
    /sourceType is invalid/,
  );
});

test("enforces attribute-source exclusivity", () => {
  assert.throws(
    () => createSkillDefaultCandidate({
      id: "default-stealth-from-dx",
      targetSkillId: "skill-stealth",
      sourceType: "attribute",
      sourceId: "skill-dx",
      attribute: "DX",
      modifier: -5,
    }),
    /must not contain sourceId/,
  );

  assert.throws(
    () => createSkillDefaultCandidate({
      id: "default-stealth-from-dx",
      targetSkillId: "skill-stealth",
      sourceType: "attribute",
      modifier: -5,
    }),
    /attribute must be a non-empty string/,
  );
});

test("enforces Skill-source exclusivity", () => {
  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({
      sourceId: null,
    })),
    /sourceId must be a non-empty string/,
  );

  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({
      attribute: "DX",
    })),
    /must not contain attribute/,
  );
});

test("rejects direct self references", () => {
  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({
      sourceId: "skill-stealth",
    })),
    /must not reference its target directly/,
  );
});

test("requires a finite integer modifier", () => {
  for (const modifier of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => createSkillDefaultCandidate(skillSourceInput({ modifier })),
      /modifier must be a finite integer/,
    );
  }
});

test("normalizes negative zero modifier", () => {
  const candidate = createSkillDefaultCandidate(skillSourceInput({
    modifier: -0,
  }));

  assert.equal(candidate.modifier, 0);
  assert.equal(Object.is(candidate.modifier, -0), false);
});

test("rejects unsupported schema versions", () => {
  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({
      schemaVersion: 2,
    })),
    /schemaVersion is unsupported/,
  );
});

test("rejects non-portable metadata", () => {
  const sparse = [];
  sparse.length = 1;

  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({
      metadata: { sparse },
    })),
    /must not contain sparse entries/,
  );

  assert.throws(
    () => createSkillDefaultCandidate(skillSourceInput({
      metadata: { observedAt: new Date() },
    })),
    /must be JSON portable/,
  );
});

test("direct validation protects source invariants", () => {
  assert.throws(
    () => validateSkillDefaultCandidate({
      schemaVersion: 1,
      id: "default-stealth-from-shadowing",
      targetSkillId: "skill-stealth",
      sourceType: "skill",
      sourceId: "skill-shadowing",
      attribute: "DX",
      modifier: -4,
      metadata: {},
    }),
    /must not contain attribute/,
  );
});
