import {
  assertEnginePortableValue,
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  requireEnginePlainObject,
} from "../EnginePortableValue.js";

const DERIVED_DEFENSE_MOVEMENT_SCHEMA_VERSION = 1;
const RESULT_IDS = Object.freeze(["basic-speed", "basic-move", "dodge"]);
const RESULT_SOURCES = Object.freeze(["secondary", "attributes"]);

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

  const dx = requireResolvedAttributeLevel(input.attributeLevels.results.DX, "DX");
  const ht = requireResolvedAttributeLevel(input.attributeLevels.results.HT, "HT");
  const basicSpeed = resolveSecondaryValue({
    key: "BasicSpeed",
    characteristic: input.secondaryCharacteristics.BasicSpeed,
    fallback: () => (dx + ht) / 4,
  });
  const basicMove = resolveSecondaryValue({
    key: "BasicMove",
    characteristic: input.secondaryCharacteristics.BasicMove,
    fallback: () => Math.floor(basicSpeed.value),
  });
  const dodge = Math.floor(basicSpeed.value) + 3;

  const report = {
    schemaVersion: DERIVED_DEFENSE_MOVEMENT_SCHEMA_VERSION,
    authority: "engine.derived-defense-movement",
    results: {
      "basic-speed": createResult({
        id: "basic-speed",
        label: "Velocidade Básica",
        value: normalizeZero(basicSpeed.value),
        source: basicSpeed.source,
      }),
      "basic-move": createResult({
        id: "basic-move",
        label: "Deslocamento Básico",
        value: normalizeZero(basicMove.value),
        source: basicMove.source,
      }),
      dodge: createResult({
        id: "dodge",
        label: "Esquiva",
        value: normalizeZero(dodge),
        source: basicSpeed.source,
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

function createResult(input) {
  const result = {
    id: normalizeResultId(input.id),
    label: normalizeNonEmptyString(input.label, `Derived defense/movement ${input.id} label`),
    value: normalizeFiniteNumber(input.value, `Derived defense/movement ${input.id} value`),
    source: normalizeResultSource(input.source),
    status: "resolved",
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
  normalizeFiniteNumber(result.value, `Derived defense/movement ${expectedId} value`);
  normalizeResultSource(result.source);
  if (result.status !== "resolved") {
    throw new Error(`Derived defense/movement ${expectedId} status is invalid`);
  }
  assertEnginePortableValue(result, `Derived defense/movement result ${expectedId}`);
  return true;
}

function requireResolvedAttributeLevel(result, key) {
  requireEnginePlainObject(result, `Derived defense/movement ${key} attribute level`);
  if (result.status !== "resolved" || !Number.isFinite(result.level)) {
    throw new Error(`Derived defense/movement requires resolved ${key}`);
  }
  return result.level;
}

function resolveSecondaryValue({ key, characteristic, fallback }) {
  requireEnginePlainObject(characteristic, `Derived defense/movement ${key}`);
  if (Number.isFinite(characteristic.override)) {
    return { value: characteristic.override, source: "secondary" };
  }
  if (Number.isFinite(characteristic.base)) {
    return { value: characteristic.base, source: "secondary" };
  }
  return { value: fallback(), source: "attributes" };
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

function normalizeNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeFiniteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return normalizeZero(value);
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}
