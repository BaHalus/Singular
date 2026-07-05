import {
  assertEnginePortableValue,
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  requireEnginePlainObject,
} from "../EnginePortableValue.js";

const DERIVED_DEFENSE_MOVEMENT_SCHEMA_VERSION = 1;
const RESULT_IDS = Object.freeze(["basic-speed", "basic-move", "dodge"]);
const RESULT_SOURCES = Object.freeze(["secondary", "attributes"]);
const RESULT_STATUSES = Object.freeze(["resolved", "blocked"]);

export function resolveDerivedDefenseMovement(input = {}) {
  requireEnginePlainObject(input, "Derived defense/movement input");
  requireEnginePlainObject(input.attributeLevels, "Derived defense/movement attributeLevels");
  requireEnginePlainObject(
    input.attributeLevels.results,
    "Derived defense/movement attribute level results",
  );
  requireEnginePlainObject(
    input.secondaryCharacteristics,
    "Derived defense/movement secondary characteristics",
  );

  const basicSpeed = resolveBasicSpeed({
    characteristic: input.secondaryCharacteristics.BasicSpeed,
    attributeResults: input.attributeLevels.results,
  });
  const basicMove = resolveBasicMove({
    characteristic: input.secondaryCharacteristics.BasicMove,
    basicSpeed,
  });
  const dodge = resolveDodge(basicSpeed);

  const report = {
    schemaVersion: DERIVED_DEFENSE_MOVEMENT_SCHEMA_VERSION,
    authority: "engine.derived-defense-movement",
    results: {
      "basic-speed": createResult({
        id: "basic-speed",
        label: "Velocidade Básica",
        value: basicSpeed.value,
        source: basicSpeed.source,
        status: basicSpeed.status,
      }),
      "basic-move": createResult({
        id: "basic-move",
        label: "Deslocamento Básico",
        value: basicMove.value,
        source: basicMove.source,
        status: basicMove.status,
      }),
      dodge: createResult({
        id: "dodge",
        label: "Esquiva",
        value: dodge.value,
        source: dodge.source,
        status: dodge.status,
      }),
    },
  };

  validateDerivedDefenseMovementReport(report);
  return deepFreezeEngineValue(report);
}

export function validateDerivedDefenseMovementReport(report) {
  requireEnginePlainObject(report, "Derived defense/movement report");
  if (report.schemaVersion !== DERIVED_DEFENSE_MOVEMENT_SCHEMA_VERSION) {
    throw new Error("Derived defense/movement report schemaVersion is invalid");
  }
  if (report.authority !== "engine.derived-defense-movement") {
    throw new Error("Derived defense/movement report authority is invalid");
  }
  requireEnginePlainObject(report.results, "Derived defense/movement results");
  const resultKeys = Object.keys(report.results);
  if (
    resultKeys.length !== RESULT_IDS.length ||
    RESULT_IDS.some(resultId => !resultKeys.includes(resultId))
  ) {
    throw new Error(
      "Derived defense/movement results must contain basic-speed, basic-move and dodge",
    );
  }
  for (const resultId of RESULT_IDS) validateResult(report.results[resultId], resultId);
  assertEnginePortableValue(report, "Derived defense/movement report");
  return true;
}

export function serializeDerivedDefenseMovementReport(report) {
  validateDerivedDefenseMovementReport(report);
  return cloneEnginePortableValue(report, "Derived defense/movement report");
}

export function getDerivedDefenseMovementSchemaVersion() {
  return DERIVED_DEFENSE_MOVEMENT_SCHEMA_VERSION;
}

function resolveBasicSpeed({ characteristic, attributeResults }) {
  const declared = resolveDeclaredSecondaryValue("BasicSpeed", characteristic);
  if (declared) return declared;

  const dx = readResolvedAttributeLevel(attributeResults.DX, "DX");
  const ht = readResolvedAttributeLevel(attributeResults.HT, "HT");
  if (dx.status !== "resolved" || ht.status !== "resolved") {
    return blockedResult("attributes");
  }
  return resolvedResult((dx.value + ht.value) / 4, "attributes");
}

function resolveBasicMove({ characteristic, basicSpeed }) {
  const declared = resolveDeclaredSecondaryValue("BasicMove", characteristic);
  if (declared) return declared;
  if (basicSpeed.status !== "resolved") return blockedResult("attributes");
  return resolvedResult(Math.floor(basicSpeed.value), "attributes");
}

function resolveDodge(basicSpeed) {
  if (basicSpeed.status !== "resolved") return blockedResult(basicSpeed.source);
  return resolvedResult(Math.floor(basicSpeed.value) + 3, basicSpeed.source);
}

function createResult(input) {
  const result = {
    id: normalizeResultId(input.id),
    label: normalizeNonEmptyString(input.label, `Derived defense/movement ${input.id} label`),
    value: normalizeNullableFiniteNumber(input.value, `Derived defense/movement ${input.id} value`),
    source: normalizeResultSource(input.source),
    status: normalizeResultStatus(input.status),
  };
  validateResult(result, result.id);
  return result;
}

function validateResult(result, expectedId) {
  requireEnginePlainObject(result, `Derived defense/movement result ${expectedId}`);
  if (result.id !== expectedId) {
    throw new Error("Derived defense/movement result id mismatch");
  }
  normalizeNonEmptyString(result.label, `Derived defense/movement ${expectedId} label`);
  normalizeNullableFiniteNumber(result.value, `Derived defense/movement ${expectedId} value`);
  normalizeResultSource(result.source);
  const status = normalizeResultStatus(result.status);
  if (status === "resolved" && result.value === null) {
    throw new Error(`Derived defense/movement ${expectedId} resolved value is invalid`);
  }
  if (status === "blocked" && result.value !== null) {
    throw new Error(`Derived defense/movement ${expectedId} blocked value is invalid`);
  }
  assertEnginePortableValue(result, `Derived defense/movement result ${expectedId}`);
  return true;
}

function readResolvedAttributeLevel(result, key) {
  requireEnginePlainObject(result, `Derived defense/movement ${key} attribute level`);
  if (result.status !== "resolved" || !Number.isFinite(result.level)) {
    return { status: "blocked", value: null };
  }
  return { status: "resolved", value: result.level };
}

function resolveDeclaredSecondaryValue(key, characteristic) {
  requireEnginePlainObject(characteristic, `Derived defense/movement ${key}`);
  if (Number.isFinite(characteristic.override)) {
    return resolvedResult(characteristic.override, "secondary");
  }
  if (Number.isFinite(characteristic.base)) {
    return resolvedResult(characteristic.base, "secondary");
  }
  return null;
}

function resolvedResult(value, source) {
  return { value: normalizeZero(value), source, status: "resolved" };
}

function blockedResult(source) {
  return { value: null, source, status: "blocked" };
}

function normalizeResultId(value) {
  if (!RESULT_IDS.includes(value)) {
    throw new Error("Derived defense/movement result id is invalid");
  }
  return value;
}

function normalizeResultSource(value) {
  if (!RESULT_SOURCES.includes(value)) {
    throw new Error("Derived defense/movement result source is invalid");
  }
  return value;
}

function normalizeResultStatus(value) {
  if (!RESULT_STATUSES.includes(value)) {
    throw new Error("Derived defense/movement result status is invalid");
  }
  return value;
}

function normalizeNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeNullableFiniteNumber(value, label) {
  if (value === null) return null;
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number or null`);
  return normalizeZero(value);
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}
