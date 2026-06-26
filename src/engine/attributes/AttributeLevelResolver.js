import {
  validateAttribute,
  validateAttributes,
} from "../../domain/character/Attributes.js";
import {
  assertEnginePortableValue,
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  requireEnginePlainObject,
  validateEngineDenseArray,
} from "../EnginePortableValue.js";

const ATTRIBUTE_LEVEL_SCHEMA_VERSION = 1;
const ATTRIBUTE_KEYS = Object.freeze(["ST", "DX", "IQ", "HT"]);
const RESULT_STATUSES = Object.freeze(["resolved", "blocked"]);
const RESULT_SOURCES = Object.freeze(["base", "override"]);
const DIAGNOSTIC_SEVERITIES = Object.freeze(["info", "warning", "blocked"]);

export function resolveAttributeLevel(input = {}) {
  requireEnginePlainObject(input, "Attribute level input");

  const attributeKey = normalizeAttributeKey(input.attributeKey);
  validateAttribute(attributeKey, input.attribute);

  const source = input.attribute.override !== null ? "override" : "base";
  const candidate = input.attribute[source];

  if (!Number.isFinite(candidate)) {
    return createAttributeLevelResult({
      attribute: attributeKey,
      status: "blocked",
      source,
      diagnostics: [{
        code: "ATTRIBUTE_EFFECTIVE_LEVEL_INVALID",
        severity: "blocked",
        source,
        value: normalizePortableInvalidValue(candidate),
      }],
    });
  }

  return createAttributeLevelResult({
    attribute: attributeKey,
    status: "resolved",
    level: normalizeZero(candidate),
    source,
  });
}

export function resolveAttributeLevels(attributes) {
  validateAttributes(attributes);

  const report = {
    schemaVersion: ATTRIBUTE_LEVEL_SCHEMA_VERSION,
    results: Object.fromEntries(
      ATTRIBUTE_KEYS.map(attributeKey => [
        attributeKey,
        resolveAttributeLevel({
          attributeKey,
          attribute: attributes[attributeKey],
        }),
      ]),
    ),
  };

  validateAttributeLevelsReport(report);
  return deepFreezeEngineValue(report);
}

export function createAttributeLevelResult(input = {}) {
  requireEnginePlainObject(input, "Attribute level result");

  const result = {
    schemaVersion: normalizeSchemaVersion(input.schemaVersion),
    attribute: normalizeAttributeKey(input.attribute),
    status: normalizeEnum(
      input.status,
      RESULT_STATUSES,
      "Attribute level result status",
    ),
    level: normalizeNullableFiniteNumber(
      input.level,
      "Attribute level result level",
    ),
    source: normalizeEnum(
      input.source,
      RESULT_SOURCES,
      "Attribute level result source",
    ),
    diagnostics: normalizeDiagnostics(input.diagnostics),
  };

  validateAttributeLevelResult(result);
  return deepFreezeEngineValue(result);
}

export function validateAttributeLevelResult(result) {
  requireEnginePlainObject(result, "Attribute level result");

  normalizeSchemaVersion(result.schemaVersion);
  normalizeAttributeKey(result.attribute);
  const status = normalizeEnum(
    result.status,
    RESULT_STATUSES,
    "Attribute level result status",
  );
  normalizeNullableFiniteNumber(
    result.level,
    "Attribute level result level",
  );
  normalizeEnum(
    result.source,
    RESULT_SOURCES,
    "Attribute level result source",
  );
  validateDiagnostics(result.diagnostics);

  const blockedDiagnostics = result.diagnostics.filter(
    diagnostic => diagnostic.severity === "blocked",
  );

  if (status === "resolved") {
    if (result.level === null) {
      throw new Error("Resolved attribute level result must contain level");
    }
    if (blockedDiagnostics.length !== 0) {
      throw new Error(
        "Resolved attribute level result must not contain blocked diagnostics",
      );
    }
  } else {
    if (result.level !== null) {
      throw new Error("Blocked attribute level result must not contain level");
    }
    if (blockedDiagnostics.length === 0) {
      throw new Error(
        "Blocked attribute level result must contain a blocked diagnostic",
      );
    }
  }

  assertEnginePortableValue(result, "Attribute level result");
  return true;
}

export function serializeAttributeLevelResult(result) {
  validateAttributeLevelResult(result);
  return cloneEnginePortableValue(result, "Attribute level result");
}

export function validateAttributeLevelsReport(report) {
  requireEnginePlainObject(report, "Attribute levels report");

  if (report.schemaVersion !== ATTRIBUTE_LEVEL_SCHEMA_VERSION) {
    throw new Error("Attribute levels report schemaVersion is invalid");
  }

  requireEnginePlainObject(report.results, "Attribute levels report results");
  const resultKeys = Object.keys(report.results);
  if (
    resultKeys.length !== ATTRIBUTE_KEYS.length ||
    ATTRIBUTE_KEYS.some(attributeKey => !resultKeys.includes(attributeKey))
  ) {
    throw new Error(
      "Attribute levels report results must contain ST, DX, IQ and HT",
    );
  }

  for (const attributeKey of ATTRIBUTE_KEYS) {
    const result = report.results[attributeKey];
    validateAttributeLevelResult(result);
    if (result.attribute !== attributeKey) {
      throw new Error(
        "Attribute levels report result belongs to another attribute",
      );
    }
  }

  assertEnginePortableValue(report, "Attribute levels report");
  return true;
}

export function serializeAttributeLevelsReport(report) {
  validateAttributeLevelsReport(report);
  return cloneEnginePortableValue(report, "Attribute levels report");
}

export function getAttributeLevelSchemaVersion() {
  return ATTRIBUTE_LEVEL_SCHEMA_VERSION;
}

export function getAttributeLevelKeys() {
  return [...ATTRIBUTE_KEYS];
}

function normalizeSchemaVersion(value) {
  const normalized = value ?? ATTRIBUTE_LEVEL_SCHEMA_VERSION;
  if (normalized !== ATTRIBUTE_LEVEL_SCHEMA_VERSION) {
    throw new Error("Attribute level result schemaVersion is invalid");
  }
  return normalized;
}

function normalizeAttributeKey(value) {
  if (!ATTRIBUTE_KEYS.includes(value)) {
    throw new Error("Attribute level attribute is invalid");
  }
  return value;
}

function normalizeDiagnostics(value) {
  if (value === undefined || value === null) return [];
  validateEngineDenseArray(value, "Attribute level diagnostics");

  return value.map((diagnostic, index) => {
    const label = `Attribute level diagnostic[${index}]`;
    requireEnginePlainObject(diagnostic, label);
    const cloned = cloneEnginePortableValue(diagnostic, label);
    normalizeRequiredString(cloned.code, `${label} code`);
    normalizeEnum(
      cloned.severity,
      DIAGNOSTIC_SEVERITIES,
      `${label} severity`,
    );
    return cloned;
  });
}

function validateDiagnostics(value) {
  validateEngineDenseArray(value, "Attribute level diagnostics");
  value.forEach((diagnostic, index) => {
    const label = `Attribute level diagnostic[${index}]`;
    requireEnginePlainObject(diagnostic, label);
    normalizeRequiredString(diagnostic.code, `${label} code`);
    normalizeEnum(
      diagnostic.severity,
      DIAGNOSTIC_SEVERITIES,
      `${label} severity`,
    );
    assertEnginePortableValue(diagnostic, label);
  });
}

function normalizeEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeNullableFiniteNumber(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number or null`);
  }
  return normalizeZero(value);
}

function normalizePortableInvalidValue(value) {
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  return typeof value;
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}
