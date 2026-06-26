import {
  validateAttribute,
  validateAttributes,
} from "../../domain/character/Attributes.js";

const ATTRIBUTE_LEVEL_SCHEMA_VERSION = 1;
const ATTRIBUTE_KEYS = Object.freeze(["ST", "DX", "IQ", "HT"]);
const RESULT_STATUSES = Object.freeze(["resolved", "blocked"]);
const RESULT_SOURCES = Object.freeze(["base", "override"]);

export function resolveAttributeLevel(input = {}) {
  requirePlainObject(input, "Attribute level input");

  const attributeKey = normalizeAttributeKey(input.attributeKey);
  validateAttribute(attributeKey, input.attribute);

  const source = input.attribute.override !== null ? "override" : "base";
  const candidate = input.attribute[source];

  if (!Number.isFinite(candidate)) {
    return createAttributeLevelResult({
      attribute: attributeKey,
      status: "blocked",
      level: null,
      source,
      diagnostics: [
        {
          code: "ATTRIBUTE_EFFECTIVE_LEVEL_INVALID",
          severity: "blocked",
          source,
          value: normalizePortableInvalidValue(candidate),
        },
      ],
    });
  }

  return createAttributeLevelResult({
    attribute: attributeKey,
    status: "resolved",
    level: normalizeZero(candidate),
    source,
    diagnostics: [],
  });
}

export function resolveAttributeLevels(attributes) {
  validateAttributes(attributes);

  const results = Object.fromEntries(
    ATTRIBUTE_KEYS.map(attributeKey => [
      attributeKey,
      resolveAttributeLevel({
        attributeKey,
        attribute: attributes[attributeKey],
      }),
    ]),
  );

  const report = {
    schemaVersion: ATTRIBUTE_LEVEL_SCHEMA_VERSION,
    results,
  };

  validateAttributeLevelsReport(report);
  return deepFreeze(report);
}

export function createAttributeLevelResult(input = {}) {
  requirePlainObject(input, "Attribute level result");

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
  return deepFreeze(result);
}

export function validateAttributeLevelResult(result) {
  requirePlainObject(result, "Attribute level result");

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

  assertPortableValue(result, "Attribute level result", new WeakSet());
  return true;
}

export function serializeAttributeLevelResult(result) {
  validateAttributeLevelResult(result);
  return clonePortableValue(result);
}

export function validateAttributeLevelsReport(report) {
  requirePlainObject(report, "Attribute levels report");

  if (report.schemaVersion !== ATTRIBUTE_LEVEL_SCHEMA_VERSION) {
    throw new Error("Attribute levels report schemaVersion is invalid");
  }

  requirePlainObject(report.results, "Attribute levels report results");
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

  assertPortableValue(report, "Attribute levels report", new WeakSet());
  return true;
}

export function serializeAttributeLevelsReport(report) {
  validateAttributeLevelsReport(report);
  return clonePortableValue(report);
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
  if (!Array.isArray(value)) {
    throw new Error("Attribute level diagnostics must be an array");
  }
  ensureDenseArray(value, "Attribute level diagnostics");
  return value.map((diagnostic, index) => {
    const label = `Attribute level diagnostic[${index}]`;
    requirePlainObject(diagnostic, label);
    const cloned = clonePortableValue(diagnostic, label);
    normalizeRequiredString(cloned.code, `${label} code`);
    normalizeEnum(
      cloned.severity,
      ["info", "warning", "blocked"],
      `${label} severity`,
    );
    return cloned;
  });
}

function validateDiagnostics(value) {
  if (!Array.isArray(value)) {
    throw new Error("Attribute level diagnostics must be an array");
  }
  ensureDenseArray(value, "Attribute level diagnostics");
  value.forEach((diagnostic, index) => {
    const label = `Attribute level diagnostic[${index}]`;
    requirePlainObject(diagnostic, label);
    normalizeRequiredString(diagnostic.code, `${label} code`);
    normalizeEnum(
      diagnostic.severity,
      ["info", "warning", "blocked"],
      `${label} severity`,
    );
    assertPortableValue(diagnostic, label, new WeakSet());
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

function clonePortableValue(value, label = "Value") {
  assertPortableValue(value, label, new WeakSet());
  return JSON.parse(JSON.stringify(value));
}

function assertPortableValue(value, label, ancestors) {
  if (value === null) return;

  const type = typeof value;
  if (type === "string" || type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error(`${label} must be JSON portable`);
    }
    return;
  }
  if (type !== "object") {
    throw new Error(`${label} must be JSON portable`);
  }

  if (ancestors.has(value)) {
    throw new Error(`${label} must be JSON portable`);
  }
  ancestors.add(value);

  if (Array.isArray(value)) {
    ensureDenseArray(value, label);
    value.forEach((item, index) =>
      assertPortableValue(item, `${label}[${index}]`, ancestors),
    );
    ancestors.delete(value);
    return;
  }

  requirePlainObject(value, label);
  for (const [key, item] of Object.entries(value)) {
    assertPortableValue(item, `${label}.${key}`, ancestors);
  }
  ancestors.delete(value);
}

function ensureDenseArray(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new Error(`${label} must not contain sparse entries`);
    }
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be an object`);
  }
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
