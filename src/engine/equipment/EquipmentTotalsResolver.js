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
  const adjustmentBreakdown = resolveEquipmentModifierPipelines({
    item,
    baseCost: cost ?? 0,
    baseWeightKg: weightKg ?? 0,
    quantity: quantity ?? 0,
    state,
    path,
    itemId: id,
    diagnostics,
  });

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
    ? calculateSelfTotals({
      quantity,
      cost: adjustmentBreakdown.cost.finalUnitValue,
      weightKg: adjustmentBreakdown.weight.finalUnitValue,
      state,
    })
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
    adjustmentBreakdown,
    selfTotals,
    totals,
    children,
    diagnostics,
  };

  validateEquipmentEntryReport(entry, "Equipment totals entry");
  return deepFreezeEngineValue(entry);
}


function resolveEquipmentModifierPipelines({
  item,
  baseCost,
  baseWeightKg,
  quantity,
  state,
  path,
  itemId,
  diagnostics,
}) {
  const modifiers = item.modifiers ?? [];
  const orderedModifiers = [];

  if (!Array.isArray(modifiers)) {
    diagnostics.push(createDiagnostic(
      "equipment.modifiers.invalid",
      "Equipment modifiers must be an array",
      path,
      itemId,
    ));
  } else {
    try {
      validateEngineDenseArray(modifiers, "Equipment modifiers");
      collectEquipmentModifiers(
        modifiers,
        true,
        orderedModifiers,
        path,
        itemId,
        diagnostics,
      );
    } catch (error) {
      diagnostics.push(createDiagnostic(
        "equipment.modifiers.invalid",
        error.message,
        path,
        itemId,
      ));
    }
  }

  const counted = COUNTED_STATES.has(state);
  return {
    cost: resolveAdjustmentPipeline({
      baseUnitValue: baseCost,
      quantity,
      counted,
      orderedModifiers,
      adjustmentField: "costAdjustment",
      expectedTarget: "baseCost",
      item,
      path,
      itemId,
      diagnostics,
    }),
    weight: resolveAdjustmentPipeline({
      baseUnitValue: baseWeightKg,
      quantity,
      counted,
      orderedModifiers,
      adjustmentField: "weightAdjustment",
      expectedTarget: "baseWeight",
      item,
      path,
      itemId,
      diagnostics,
    }),
  };
}

function collectEquipmentModifiers(
  nodes,
  ancestorsEnabled,
  orderedModifiers,
  path,
  itemId,
  diagnostics,
) {
  for (const [index, node] of nodes.entries()) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      diagnostics.push(createDiagnostic(
        "equipment.modifier.invalid",
        "Equipment modifier node must be an object",
        [...path, "modifiers", `${index}`],
        itemId,
      ));
      continue;
    }

    const enabled = ancestorsEnabled && node.enabled !== false;
    if (node.kind === "container") {
      if (!Array.isArray(node.children)) {
        diagnostics.push(createDiagnostic(
          "equipment.modifier.children.invalid",
          "Equipment modifier container children must be an array",
          [...path, "modifiers", `${index}`, "children"],
          itemId,
        ));
        continue;
      }
      try {
        validateEngineDenseArray(node.children, "Equipment modifier children");
      } catch (error) {
        diagnostics.push(createDiagnostic(
          "equipment.modifier.children.invalid",
          error.message,
          [...path, "modifiers", `${index}`, "children"],
          itemId,
        ));
        continue;
      }
      collectEquipmentModifiers(
        node.children,
        enabled,
        orderedModifiers,
        [...path, "modifiers", `${index}`, "children"],
        itemId,
        diagnostics,
      );
      continue;
    }

    if (node.kind !== "modifier") {
      diagnostics.push(createDiagnostic(
        "equipment.modifier.kind.invalid",
        "Equipment modifier kind must be modifier or container",
        [...path, "modifiers", `${index}`],
        itemId,
      ));
      continue;
    }

    orderedModifiers.push({ modifier: node, enabled });
  }
}

function resolveAdjustmentPipeline({
  baseUnitValue,
  quantity,
  counted,
  orderedModifiers,
  adjustmentField,
  expectedTarget,
  item,
  path,
  itemId,
  diagnostics,
}) {
  let current = baseUnitValue;
  const steps = [];

  for (const { modifier, enabled } of orderedModifiers) {
    const adjustment = modifier[adjustmentField];
    if (adjustment === null || adjustment === undefined) continue;

    const before = current;
    let reason = enabled ? getApplicabilityReason(modifier, item) : "disabled";

    if (reason === null && adjustment.target !== expectedTarget) {
      reason = "incompatibleTarget";
    }
    if (reason === null && adjustment.kind === "unsupported") {
      reason = "unsupported";
    }

    let after = before;
    if (reason === null) {
      after = applyEquipmentAdjustment(before, adjustment);
      if (!Number.isFinite(after) || after < 0) {
        diagnostics.push(createDiagnostic(
          "equipment.modifier.adjustment.invalidResult",
          "Equipment modifier adjustment must produce non-negative finite total",
          path,
          itemId,
        ));
        after = before;
        reason = "invalidResult";
      } else {
        after = roundMetric(after);
        current = after;
      }
    }

    steps.push({
      modifierId: typeof modifier.id === "string" ? modifier.id : null,
      modifierName: typeof modifier.name === "string" ? modifier.name : "",
      kind: typeof adjustment.kind === "string" ? adjustment.kind : "unsupported",
      target: typeof adjustment.target === "string" ? adjustment.target : null,
      expression: typeof adjustment.expression === "string"
        ? adjustment.expression
        : null,
      before,
      after,
      applied: reason === null,
      reason,
    });
  }

  return {
    baseUnitValue,
    finalUnitValue: current,
    quantity,
    baseTotal: counted ? roundMetric(baseUnitValue * quantity) : 0,
    finalTotal: counted ? roundMetric(current * quantity) : 0,
    steps,
  };
}

function getApplicabilityReason(modifier, item) {
  const selectionType = modifier.applicability?.selectionType ?? null;
  if (selectionType === null || selectionType === "this_equipment") return null;
  if (selectionType === "this_weapon") {
    return Array.isArray(item.weapons) && item.weapons.length > 0
      ? null
      : "notApplicable";
  }
  return "notApplicable";
}

function applyEquipmentAdjustment(value, adjustment) {
  if (adjustment.kind === "multiplier") return value * adjustment.factor;
  if (adjustment.kind === "addition") return value + adjustment.amount;
  if (adjustment.kind === "percentage") {
    return value * (1 + adjustment.percent / 100);
  }
  return value;
}

function validateAdjustmentBreakdown(breakdown, label) {
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) {
    throw new Error(`${label} must be an object`);
  }
  for (const pipeline of ["cost", "weight"]) {
    const value = breakdown[pipeline];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${label}.${pipeline} must be an object`);
    }
    for (const field of [
      "baseUnitValue",
      "finalUnitValue",
      "quantity",
      "baseTotal",
      "finalTotal",
    ]) {
      normalizeMetric(value[field], `${label}.${pipeline}.${field}`);
    }
    validateEngineDenseArray(value.steps, `${label}.${pipeline}.steps`);
    assertEnginePortableValue(value.steps, `${label}.${pipeline}.steps`);
  }
  return true;
}

function createEmptyAdjustmentBreakdown() {
  return {
    cost: {
      baseUnitValue: 0,
      finalUnitValue: 0,
      quantity: 0,
      baseTotal: 0,
      finalTotal: 0,
      steps: [],
    },
    weight: {
      baseUnitValue: 0,
      finalUnitValue: 0,
      quantity: 0,
      baseTotal: 0,
      finalTotal: 0,
      steps: [],
    },
  };
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
  validateAdjustmentBreakdown(
    entry.adjustmentBreakdown,
    `${label}.adjustmentBreakdown`,
  );
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
    adjustmentBreakdown: createEmptyAdjustmentBreakdown(),
    selfTotals: createEmptyTotals(),
    totals: createEmptyTotals(),
    children: [],
    diagnostics,
  };
  validateEquipmentEntryReport(entry, `Equipment totals blocked entry at ${path.join(".")}`);
  return deepFreezeEngineValue(entry);
}
