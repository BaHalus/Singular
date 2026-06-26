import {
  assertEnginePortableValue,
  cloneEnginePortableValue,
  deepFreezeEngineValue,
  validateEngineDenseArray,
} from "../EnginePortableValue.js";

const SCHEMA_VERSION = 1;
const LOAD_STATES = new Set(["equipped", "carried", "stored"]);
const COUNTED_STATES = new Set(["equipped", "carried", "stored", "dropped"]);
const KNOWN_STATES = new Set([
  "equipped",
  "carried",
  "stored",
  "dropped",
  "ignored",
]);

export function resolveEquipmentTotals(equipment = []) {
  validateEngineDenseArray(equipment, "Equipment totals input");

  const context = {
    ids: new Set(),
    ancestors: new WeakSet(),
    diagnostics: [],
  };

  const entries = equipment.map((item, index) =>
    resolveEquipmentEntry(item, context, [`${index}`]),
  );
  const report = createEquipmentTotalsReport({
    entries,
    totals: sumEntryTotals(entries),
    diagnostics: context.diagnostics,
  });

  return deepFreezeEngineValue(report);
}

export function createEquipmentTotalsReport(input = {}) {
  const report = {
    schemaVersion: SCHEMA_VERSION,
    status: input.diagnostics?.length > 0 ? "blocked" : "resolved",
    totals: normalizeTotals(input.totals ?? createEmptyTotals()),
    entries: cloneEnginePortableValue(input.entries ?? [], "Equipment totals entries"),
    diagnostics: cloneEnginePortableValue(
      input.diagnostics ?? [],
      "Equipment totals diagnostics",
    ),
  };

  validateEquipmentTotalsReport(report);
  return deepFreezeEngineValue(report);
}

export function validateEquipmentTotalsReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Equipment totals report must be an object");
  }
  if (report.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Equipment totals report schemaVersion is invalid");
  }
  if (!["resolved", "blocked"].includes(report.status)) {
    throw new Error("Equipment totals report status is invalid");
  }
  validateTotals(report.totals, "Equipment totals report totals");
  validateEngineDenseArray(report.entries, "Equipment totals report entries");
  for (const [index, entry] of report.entries.entries()) {
    validateEquipmentEntryReport(entry, `Equipment totals report entries[${index}]`);
  }
  validateEngineDenseArray(report.diagnostics, "Equipment totals report diagnostics");
  for (const [index, diagnostic] of report.diagnostics.entries()) {
    validateDiagnostic(diagnostic, `Equipment totals report diagnostics[${index}]`);
  }
  assertEnginePortableValue(report, "Equipment totals report");
  return true;
}

export function serializeEquipmentTotalsReport(report) {
  validateEquipmentTotalsReport(report);
  return cloneEnginePortableValue(report, "Equipment totals report");
}

function resolveEquipmentEntry(item, context, path) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    const diagnostic = createDiagnostic(
      "equipment.item.invalid",
      "Equipment item must be an object",
      path,
      null,
    );
    context.diagnostics.push(diagnostic);
    return createBlockedEntry(path, null, [diagnostic]);
  }

  if (context.ancestors.has(item)) {
    const diagnostic = createDiagnostic(
      "equipment.item.cycle",
      "Equipment item must not contain cycles",
      path,
      item.id ?? null,
    );
    context.diagnostics.push(diagnostic);
    return createBlockedEntry(path, item.id ?? null, [diagnostic]);
  }

  context.ancestors.add(item);

  const diagnostics = [];
  const id = normalizeItemId(item.id, path, diagnostics);
  if (id !== null) {
    if (context.ids.has(id)) {
      diagnostics.push(createDiagnostic(
        "equipment.item.duplicateId",
        "Equipment item ids must be unique",
        path,
        id,
      ));
    } else {
      context.ids.add(id);
    }
  }

  const quantity = normalizeNonNegativeFiniteNumber(
    item.quantity,
    "equipment.quantity.invalid",
    "Equipment quantity must be non-negative finite number",
    path,
    id,
    diagnostics,
  );
  const cost = normalizeNonNegativeFiniteNumber(
    item.cost,
    "equipment.cost.invalid",
    "Equipment cost must be non-negative finite number",
    path,
    id,
    diagnostics,
  );
  const weightKg = normalizeNonNegativeFiniteNumber(
    item.weightKg,
    "equipment.weight.invalid",
    "Equipment weightKg must be non-negative finite number",
    path,
    id,
    diagnostics,
  );
  const state = normalizeState(item.state, path, id, diagnostics);

  const childrenInput = Array.isArray(item.children) ? item.children : [];
  if (!Array.isArray(item.children)) {
    diagnostics.push(createDiagnostic(
      "equipment.children.invalid",
      "Equipment children must be an array",
      path,
      id,
    ));
  } else {
    try {
      validateEngineDenseArray(item.children, "Equipment children");
    } catch (error) {
      diagnostics.push(createDiagnostic(
        "equipment.children.invalid",
        error.message,
        path,
        id,
      ));
    }
  }

  const children = childrenInput.map((child, index) =>
    resolveEquipmentEntry(child, context, [...path, "children", `${index}`]),
  );

  context.ancestors.delete(item);

  diagnostics.forEach(diagnostic => context.diagnostics.push(diagnostic));

  const status = diagnostics.length > 0 ? "blocked" : "resolved";
  const selfTotals = status === "resolved"
    ? calculateSelfTotals({ quantity, cost, weightKg, state })
    : createEmptyTotals();
  const childrenTotals = sumEntryTotals(children);
  const totals = addTotals(selfTotals, childrenTotals);

  const entry = {
    schemaVersion: SCHEMA_VERSION,
    status,
    id,
    name: typeof item.name === "string" ? item.name : "",
    state: state ?? null,
    quantity: quantity ?? null,
    unitCost: cost ?? null,
    unitWeightKg: weightKg ?? null,
    selfTotals,
    totals,
    children,
    diagnostics,
  };

  validateEquipmentEntryReport(entry, "Equipment totals entry");
  return deepFreezeEngineValue(entry);
}

function calculateSelfTotals({ quantity, cost, weightKg, state }) {
  const counted = COUNTED_STATES.has(state);
  const load = LOAD_STATES.has(state);
  const totalQuantity = counted ? quantity : 0;
  const totalCost = counted ? roundMetric(quantity * cost) : 0;
  const totalWeightKg = counted ? roundMetric(quantity * weightKg) : 0;

  return normalizeTotals({
    itemCount: counted ? 1 : 0,
    quantity: totalQuantity,
    cost: totalCost,
    weightKg: totalWeightKg,
    loadWeightKg: load ? totalWeightKg : 0,
    byState: {
      equipped: createStateTotals(),
      carried: createStateTotals(),
      stored: createStateTotals(),
      dropped: createStateTotals(),
      ignored: createStateTotals(),
      [state]: createStateTotals({
        itemCount: 1,
        quantity,
        cost: roundMetric(quantity * cost),
        weightKg: roundMetric(quantity * weightKg),
        loadWeightKg: load ? roundMetric(quantity * weightKg) : 0,
      }),
    },
  });
}

function sumEntryTotals(entries) {
  return entries.reduce(
    (accumulator, entry) => addTotals(accumulator, entry.totals),
    createEmptyTotals(),
  );
}

function addTotals(left, right) {
  const totals = {
    itemCount: left.itemCount + right.itemCount,
    quantity: roundMetric(left.quantity + right.quantity),
    cost: roundMetric(left.cost + right.cost),
    weightKg: roundMetric(left.weightKg + right.weightKg),
    loadWeightKg: roundMetric(left.loadWeightKg + right.loadWeightKg),
    byState: {},
  };

  for (const state of KNOWN_STATES) {
    totals.byState[state] = addStateTotals(left.byState[state], right.byState[state]);
  }

  return normalizeTotals(totals);
}

function addStateTotals(left, right) {
  return createStateTotals({
    itemCount: left.itemCount + right.itemCount,
    quantity: roundMetric(left.quantity + right.quantity),
    cost: roundMetric(left.cost + right.cost),
    weightKg: roundMetric(left.weightKg + right.weightKg),
    loadWeightKg: roundMetric(left.loadWeightKg + right.loadWeightKg),
  });
}

function createEmptyTotals() {
  return normalizeTotals({
    itemCount: 0,
    quantity: 0,
    cost: 0,
    weightKg: 0,
    loadWeightKg: 0,
    byState: {
      equipped: createStateTotals(),
      carried: createStateTotals(),
      stored: createStateTotals(),
      dropped: createStateTotals(),
      ignored: createStateTotals(),
    },
  });
}

function createStateTotals(input = {}) {
  return {
    itemCount: input.itemCount ?? 0,
    quantity: input.quantity ?? 0,
    cost: input.cost ?? 0,
    weightKg: input.weightKg ?? 0,
    loadWeightKg: input.loadWeightKg ?? 0,
  };
}

function normalizeTotals(totals) {
  const normalized = {
    itemCount: normalizeMetric(totals.itemCount, "itemCount"),
    quantity: normalizeMetric(totals.quantity, "quantity"),
    cost: normalizeMetric(totals.cost, "cost"),
    weightKg: normalizeMetric(totals.weightKg, "weightKg"),
    loadWeightKg: normalizeMetric(totals.loadWeightKg, "loadWeightKg"),
    byState: {},
  };

  for (const state of KNOWN_STATES) {
    normalized.byState[state] = normalizeStateTotals(
      totals.byState?.[state] ?? createStateTotals(),
      state,
    );
  }

  return normalized;
}

function normalizeStateTotals(totals, state) {
  return {
    itemCount: normalizeMetric(totals.itemCount, `${state}.itemCount`),
    quantity: normalizeMetric(totals.quantity, `${state}.quantity`),
    cost: normalizeMetric(totals.cost, `${state}.cost`),
    weightKg: normalizeMetric(totals.weightKg, `${state}.weightKg`),
    loadWeightKg: normalizeMetric(totals.loadWeightKg, `${state}.loadWeightKg`),
  };
}

function validateTotals(totals, label) {
  normalizeTotals(totals);
  return true;
}

function validateEquipmentEntryReport(entry, label) {
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
  if (entry.state !== null && !KNOWN_STATES.has(entry.state)) {
    throw new Error(`${label} state is invalid`);
  }
  for (const field of ["quantity", "unitCost", "unitWeightKg"]) {
    if (entry[field] !== null) normalizeMetric(entry[field], `${label}.${field}`);
  }
  validateTotals(entry.selfTotals, `${label}.selfTotals`);
  validateTotals(entry.totals, `${label}.totals`);
  validateEngineDenseArray(entry.children, `${label}.children`);
  for (const [index, child] of entry.children.entries()) {
    validateEquipmentEntryReport(child, `${label}.children[${index}]`);
  }
  validateEngineDenseArray(entry.diagnostics, `${label}.diagnostics`);
  for (const [index, diagnostic] of entry.diagnostics.entries()) {
    validateDiagnostic(diagnostic, `${label}.diagnostics[${index}]`);
  }
  return true;
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
  validateEngineDenseArray(diagnostic.path, `${label}.path`);
  if (!diagnostic.path.every(segment => typeof segment === "string")) {
    throw new Error(`${label}.path must contain only strings`);
  }
  if (diagnostic.itemId !== null && typeof diagnostic.itemId !== "string") {
    throw new Error(`${label}.itemId must be string or null`);
  }
  return true;
}

function normalizeItemId(id, path, diagnostics) {
  if (typeof id === "string" && id.trim() !== "") return id.trim();
  diagnostics.push(createDiagnostic(
    "equipment.id.invalid",
    "Equipment item id must be non-empty string",
    path,
    null,
  ));
  return null;
}

function normalizeNonNegativeFiniteNumber(value, code, message, path, itemId, diagnostics) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Object.is(value, -0) ? 0 : value;
  }
  diagnostics.push(createDiagnostic(code, message, path, itemId));
  return null;
}

function normalizeState(state, path, itemId, diagnostics) {
  if (KNOWN_STATES.has(state)) return state;
  diagnostics.push(createDiagnostic(
    "equipment.state.invalid",
    "Equipment state is invalid",
    path,
    itemId,
  ));
  return null;
}

function normalizeMetric(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative finite number`);
  }
  return Object.is(value, -0) ? 0 : roundMetric(value);
}

function roundMetric(value) {
  return Number(value.toFixed(6));
}

function createDiagnostic(code, message, path, itemId) {
  return {
    code,
    message,
    path: [...path],
    itemId,
  };
}

function createBlockedEntry(path, itemId, diagnostics) {
  const entry = {
    schemaVersion: SCHEMA_VERSION,
    status: "blocked",
    id: itemId,
    name: "",
    state: null,
    quantity: null,
    unitCost: null,
    unitWeightKg: null,
    selfTotals: createEmptyTotals(),
    totals: createEmptyTotals(),
    children: [],
    diagnostics,
  };
  validateEquipmentEntryReport(entry, `Equipment totals blocked entry at ${path.join(".")}`);
  return deepFreezeEngineValue(entry);
}
