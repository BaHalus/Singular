import test from "node:test";
import assert from "node:assert/strict";

import { createAttributes } from "../../domain/character/Attributes.js";
import {
  createAttributeLevelResult,
  getAttributeLevelKeys,
  getAttributeLevelSchemaVersion,
  resolveAttributeLevel,
  resolveAttributeLevels,
  serializeAttributeLevelResult,
  serializeAttributeLevelsReport,
  validateAttributeLevelResult,
  validateAttributeLevelsReport,
} from "./AttributeLevelResolver.js";

test("uses base when override is null", () => {
  const result = resolveAttributeLevel({
    attributeKey: "DX",
    attribute: { base: 11, override: null },
  });

  assert.equal(result.schemaVersion, getAttributeLevelSchemaVersion());
  assert.equal(result.attribute, "DX");
  assert.equal(result.status, "resolved");
  assert.equal(result.level, 11);
  assert.equal(result.source, "base");
  assert.deepEqual(result.diagnostics, []);
});

test("uses override without altering base", () => {
  const attribute = { base: 11, override: 13 };
  const before = structuredClone(attribute);

  const result = resolveAttributeLevel({
    attributeKey: "DX",
    attribute,
  });

  assert.equal(result.level, 13);
  assert.equal(result.source, "override");
  assert.deepEqual(attribute, before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.diagnostics), true);
});

test("treats zero override as present and normalizes negative zero", () => {
  const zero = resolveAttributeLevel({
    attributeKey: "ST",
    attribute: { base: 10, override: 0 },
  });
  assert.equal(zero.level, 0);
  assert.equal(zero.source, "override");

  const negativeZero = resolveAttributeLevel({
    attributeKey: "HT",
    attribute: { base: -0, override: null },
  });
  assert.equal(negativeZero.level, 0);
  assert.equal(Object.is(negativeZero.level, -0), false);
});

test("blocks non-finite effective values with portable diagnostics", () => {
  const cases = [
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
    [Number.NEGATIVE_INFINITY, "-Infinity"],
  ];

  for (const [value, expected] of cases) {
    const result = resolveAttributeLevel({
      attributeKey: "IQ",
      attribute: { base: 10, override: value },
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.level, null);
    assert.equal(result.source, "override");
    assert.deepEqual(result.diagnostics, [{
      code: "ATTRIBUTE_EFFECTIVE_LEVEL_INVALID",
      severity: "blocked",
      source: "override",
      value: expected,
    }]);
  }
});

test("resolves all four attributes in canonical order", () => {
  const attributes = createAttributes({
    ST: { base: 12, override: null },
    DX: { base: 11, override: 13 },
    IQ: { base: 14, override: null },
    HT: { base: 10, override: 9 },
  });

  const report = resolveAttributeLevels(attributes);

  assert.deepEqual(Object.keys(report.results), ["ST", "DX", "IQ", "HT"]);
  assert.equal(report.results.ST.level, 12);
  assert.equal(report.results.ST.source, "base");
  assert.equal(report.results.DX.level, 13);
  assert.equal(report.results.DX.source, "override");
  assert.equal(report.results.IQ.level, 14);
  assert.equal(report.results.HT.level, 9);
  assert.equal(validateAttributeLevelsReport(report), true);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.results), true);
  assert.equal(Object.isFrozen(report.results.DX), true);
});

test("keeps partial blocked results in the aggregate report", () => {
  const attributes = createAttributes({
    ST: { base: 10, override: null },
    DX: { base: 11, override: Number.NaN },
    IQ: { base: 12, override: null },
    HT: { base: 13, override: null },
  });

  const report = resolveAttributeLevels(attributes);

  assert.equal(report.results.ST.status, "resolved");
  assert.equal(report.results.DX.status, "blocked");
  assert.equal(report.results.IQ.status, "resolved");
  assert.equal(report.results.HT.status, "resolved");
});

test("serializes detached unit and aggregate results", () => {
  const result = resolveAttributeLevel({
    attributeKey: "DX",
    attribute: { base: 11, override: 13 },
  });
  const serializedResult = serializeAttributeLevelResult(result);
  assert.deepEqual(serializedResult, result);
  assert.notEqual(serializedResult, result);
  assert.equal(Object.isFrozen(serializedResult), false);

  const report = resolveAttributeLevels(createAttributes());
  const serializedReport = serializeAttributeLevelsReport(report);
  assert.deepEqual(serializedReport, report);
  assert.notEqual(serializedReport, report);
  assert.notEqual(serializedReport.results, report.results);
  assert.equal(Object.isFrozen(serializedReport), false);
});

test("validates resolved and blocked result consistency", () => {
  assert.throws(
    () => createAttributeLevelResult({
      attribute: "DX",
      status: "resolved",
      source: "base",
    }),
    /must contain level/,
  );

  assert.throws(
    () => createAttributeLevelResult({
      attribute: "DX",
      status: "blocked",
      level: 10,
      source: "base",
      diagnostics: [{
        code: "BLOCKED",
        severity: "blocked",
      }],
    }),
    /must not contain level/,
  );

  assert.throws(
    () => createAttributeLevelResult({
      attribute: "DX",
      status: "blocked",
      source: "base",
      diagnostics: [],
    }),
    /must contain a blocked diagnostic/,
  );
});

test("rejects invalid keys, structures and report ownership", () => {
  assert.throws(
    () => resolveAttributeLevel({
      attributeKey: "PER",
      attribute: { base: 10, override: null },
    }),
    /attribute is invalid/,
  );

  assert.throws(
    () => resolveAttributeLevel({
      attributeKey: "DX",
      attribute: { base: "10", override: null },
    }),
    /Invalid base value/,
  );

  const report = serializeAttributeLevelsReport(
    resolveAttributeLevels(createAttributes()),
  );
  report.results.DX = serializeAttributeLevelResult(report.results.ST);
  assert.throws(
    () => validateAttributeLevelsReport(report),
    /belongs to another attribute/,
  );
});

test("exposes detached canonical attribute keys", () => {
  const keys = getAttributeLevelKeys();
  assert.deepEqual(keys, ["ST", "DX", "IQ", "HT"]);
  keys.push("PER");
  assert.deepEqual(getAttributeLevelKeys(), ["ST", "DX", "IQ", "HT"]);
});

test("direct validation accepts a reconstructed portable result", () => {
  const result = {
    diagnostics: [],
    source: "override",
    level: 12,
    status: "resolved",
    attribute: "DX",
    schemaVersion: 1,
  };

  assert.equal(validateAttributeLevelResult(result), true);
});
