import {
  cloneEnginePortableValue,
  deepFreezeEngineValue,
} from "../EnginePortableValue.js";
import {
  serializeEquipmentTotalsReport,
  validateEquipmentTotalsReport,
} from "./EquipmentTotalsResolver.js";

const SCHEMA_VERSION = 1;
const EQUIPMENT_STATES = ["equipped", "carried", "stored", "dropped", "ignored"];
const LOAD_STATES = ["equipped", "carried", "stored"];
const COUNTED_STATES = ["equipped", "carried", "stored", "dropped"];
const NON_LOAD_STATES = ["dropped", "ignored"];
const ENTRY_FIELDS = [
  "schemaVersion",
  "status",
  "id",
  "name",
  "state",
  "quantity",
  "unitCost",
  "unitWeightKg",
  "selfTotals",
  "totals",
  "children",
  "diagnostics",
];
const TOTAL_FIELDS = ["itemCount", "quantity", "cost", "weightKg", "loadWeightKg", "byState"];
const DIAGNOSTIC_FIELDS = ["code", "message", "path", "itemId"];

export function getEquipmentMvpContract() {
  return deepFreezeEngineValue({
    schemaVersion: SCHEMA_VERSION,
    states: {
      known: [...EQUIPMENT_STATES],
      counted: [...COUNTED_STATES],
      loadBearing: [...LOAD_STATES],
      nonLoadBearing: [...NON_LOAD_STATES],
    },
    entryFields: [...ENTRY_FIELDS],
    totalFields: [...TOTAL_FIELDS],
    diagnosticFields: [...DIAGNOSTIC_FIELDS],
    semantics: {
      quantity: "Number of units declared on the canonical equipment item.",
      unitCost: "Cost per unit declared on the canonical equipment item.",
      unitWeightKg: "Weight in kilograms per unit declared on the canonical equipment item.",
      weightKg: "Deterministic inventory weight: quantity multiplied by unitWeightKg.",
      loadWeightKg: "Deterministic carried load weight; excludes dropped and ignored entries.",
      children: "Nested contents of a container or grouping entry, preserving containment order.",
      diagnostics: "Portable blocking diagnostics produced by the equipment engine.",
    },
  });
}

export function createEquipmentMvpProjection(report) {
  validateEquipmentTotalsReport(report);
  const serialized = serializeEquipmentTotalsReport(report);
  return deepFreezeEngineValue({
    schemaVersion: SCHEMA_VERSION,
    status: serialized.status,
    contract: getEquipmentMvpContract(),
    totals: cloneEnginePortableValue(serialized.totals, "Equipment MVP totals"),
    entries: serialized.entries.map(projectEntry),
    diagnostics: cloneEnginePortableValue(
      serialized.diagnostics,
      "Equipment MVP diagnostics",
    ),
  });
}

export function validateEquipmentMvpProjection(projection) {
  if (!projection || typeof projection !== "object" || Array.isArray(projection)) {
    throw new Error("Equipment MVP projection must be an object");
  }
  if (projection.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Equipment MVP projection schemaVersion is invalid");
  }
  if (!["resolved", "blocked"].includes(projection.status)) {
    throw new Error("Equipment MVP projection status is invalid");
  }
  validateContract(projection.contract);
  validateTotals(projection.totals, "Equipment MVP projection totals");
  validateDenseArray(projection.entries, "Equipment MVP projection entries");
  projection.entries.forEach((entry, index) =>
    validateProjectedEntry(entry, `Equipment MVP projection entries[${index}]`),
  );
  validateDenseArray(projection.diagnostics, "Equipment MVP projection diagnostics");
  projection.diagnostics.forEach((diagnostic, index) =>
    validateDiagnostic(diagnostic, `Equipment MVP projection diagnostics[${index}]`),
  );
  return true;
}

function projectEntry(entry) {
  return {
    schemaVersion: SCHEMA_VERSION,
    status: entry.status,
    id: entry.id,
    name: entry.name,
    state: entry.state,
    quantity: entry.quantity,
    unitCost: entry.unitCost,
    unitWeightKg: entry.unitWeightKg,
    selfTotals: cloneEnginePortableValue(entry.selfTotals, "Equipment MVP entry self totals"),
    totals: cloneEnginePortableValue(entry.totals, "Equipment MVP entry totals"),
    children: entry.children.map(projectEntry),
    diagnostics: cloneEnginePortableValue(
      entry.diagnostics,
      "Equipment MVP entry diagnostics",
    ),
  };
}

function validateContract(contract) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new Error("Equipment MVP contract must be an object");
  }
  if (contract.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Equipment MVP contract schemaVersion is invalid");
  }
  validateExactStringArray(
    contract.states?.known,
    EQUIPMENT_STATES,
    "Equipment MVP contract states.known",
  );
  validateExactStringArray(
    contract.states?.counted,
    COUNTED_STATES,
    "Equipment MVP contract states.counted",
  );
  validateExactStringArray(
    contract.states?.loadBearing,
    LOAD_STATES,
    "Equipment MVP contract states.loadBearing",
  );
  validateExactStringArray(
    contract.states?.nonLoadBearing,
    NON_LOAD_STATES,
    "Equipment MVP contract states.nonLoadBearing",
  );
  validateExactStringArray(
    contract.entryFields,
    ENTRY_FIELDS,
    "Equipment MVP contract entryFields",
  );
  validateExactStringArray(
    contract.totalFields,
    TOTAL_FIELDS,
    "Equipment MVP contract totalFields",
  );
  validateExactStringArray(
    contract.diagnosticFields,
    DIAGNOSTIC_FIELDS,
    "Equipment MVP contract diagnosticFields",
  );
}

function validateProjectedEntry(entry, label) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`${label} must be an object`);
  }
  if (entry.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`${label} schemaVersion is invalid`);
  }
  if (!["resolved", "blocked"].includes(entry.status)) {
    throw new Error(`${label} status is invalid`);
  }
  if (entry.id !== null && typeof entry.id !== "string") {
    throw new Error(`${label} id must be string or null`);
  }
  if (typeof entry.name !== "string") {
    throw new Error(`${label} name must be string`);
  }
  if (entry.state !== null && !EQUIPMENT_STATES.includes(entry.state)) {
    throw new Error(`${label} state is invalid`);
  }
  for (const field of ["quantity", "unitCost", "unitWeightKg"]) {
    if (entry[field] !== null) validateMetric(entry[field], `${label}.${field}`);
  }
  validateTotals(entry.selfTotals, `${label}.selfTotals`);
  validateTotals(entry.totals, `${label}.totals`);
  validateDenseArray(entry.children, `${label}.children`);
  entry.children.forEach((child, index) =>
    validateProjectedEntry(child, `${label}.children[${index}]`),
  );
  validateDenseArray(entry.diagnostics, `${label}.diagnostics`);
  entry.diagnostics.forEach((diagnostic, index) =>
    validateDiagnostic(diagnostic, `${label}.diagnostics[${index}]`),
  );
}

function validateTotals(totals, label) {
  if (!totals || typeof totals !== "object" || Array.isArray(totals)) {
    throw new Error(`${label} must be an object`);
  }
  for (const field of ["itemCount", "quantity", "cost", "weightKg", "loadWeightKg"]) {
    validateMetric(totals[field], `${label}.${field}`);
  }
  if (!totals.byState || typeof totals.byState !== "object" || Array.isArray(totals.byState)) {
    throw new Error(`${label}.byState must be an object`);
  }
  for (const state of EQUIPMENT_STATES) {
    validateStateTotals(totals.byState[state], `${label}.byState.${state}`);
  }
}

function validateStateTotals(totals, label) {
  if (!totals || typeof totals !== "object" || Array.isArray(totals)) {
    throw new Error(`${label} must be an object`);
  }
  for (const field of ["itemCount", "quantity", "cost", "weightKg", "loadWeightKg"]) {
    validateMetric(totals[field], `${label}.${field}`);
  }
}

function validateDiagnostic(diagnostic, label) {
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    throw new Error(`${label} must be an object`);
  }
  if (typeof diagnostic.code !== "string" || diagnostic.code.trim() === "") {
    throw new Error(`${label}.code must be non-empty string`);
  }
  if (typeof diagnostic.message !== "string" || diagnostic.message.trim() === "") {
    throw new Error(`${label}.message must be non-empty string`);
  }
  validateStringArray(diagnostic.path, `${label}.path`);
  if (diagnostic.itemId !== null && typeof diagnostic.itemId !== "string") {
    throw new Error(`${label}.itemId must be string or null`);
  }
}

function validateMetric(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative finite number`);
  }
}

function validateDenseArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length !== Object.keys(value).length) {
    throw new Error(`${label} must be dense`);
  }
}

function validateStringArray(value, label) {
  validateDenseArray(value, label);
  if (!value.every(item => typeof item === "string")) {
    throw new Error(`${label} must contain only strings`);
  }
}

function validateExactStringArray(value, expected, label) {
  validateStringArray(value, label);
  if (
    value.length !== expected.length ||
    value.some((item, index) => item !== expected[index])
  ) {
    throw new Error(`${label} must match the canonical contract`);
  }
}
