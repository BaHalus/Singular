import {
  assertEquipmentPortableValue,
  cloneEquipmentPortableValue,
  requireEquipmentPlainObject,
  validateEquipmentDenseArray,
} from "./EquipmentPortableValue.js";

const EQUIPMENT_MODIFIER_SCHEMA_VERSION = 1;
const EQUIPMENT_MODIFIER_NODE_KINDS = ["modifier", "container"];
const ADJUSTMENT_KINDS = ["multiplier", "addition", "percentage", "unsupported"];
const ADJUSTMENT_TARGETS = ["baseCost", "baseWeight"];

export function createEquipmentModifierList(input = {}) {
  requireEquipmentPlainObject(input, "Equipment modifier list input");
  const context = {
    ancestors: new WeakSet(),
    ids: new Set(),
  };

  const list = {
    schemaVersion: EQUIPMENT_MODIFIER_SCHEMA_VERSION,
    id: normalizeRequiredString(
      input.id,
      "Equipment modifier list id must be non-empty string",
    ),
    version: normalizeNullableNonNegativeFiniteNumber(
      input.version,
      "Equipment modifier list version must be non-negative finite number or null",
    ),
    rows: createEquipmentModifierNodes(input.rows ?? [], context, "rows"),
    source: normalizeSource(input.source, {
      type: input.type,
      version: input.version,
    }),
    raw: clonePortableNullableValue(
      getCanonicalRawInput(input),
      "Equipment modifier list raw",
    ),
  };

  validateEquipmentModifierList(list);
  return deepFreeze(list);
}

export function validateEquipmentModifierList(list) {
  requireEquipmentPlainObject(list, "Equipment modifier list");
  if (list.schemaVersion !== EQUIPMENT_MODIFIER_SCHEMA_VERSION) {
    throw new Error("Equipment modifier list schemaVersion is invalid");
  }
  normalizeRequiredString(
    list.id,
    "Equipment modifier list id must be non-empty string",
  );
  validateNullableNonNegativeFiniteNumber(
    list.version,
    "Equipment modifier list version must be non-negative finite number or null",
  );
  validateSource(list.source, "Equipment modifier list source");
  assertEquipmentPortableValue(list.raw, "Equipment modifier list raw");

  const context = {
    ancestors: new WeakSet(),
    ids: new Set(),
  };
  validateEquipmentModifierNodes(list.rows, context, "Equipment modifier list rows");
  assertEquipmentPortableValue(list, "Equipment modifier list");
  return true;
}

export function serializeEquipmentModifierList(list) {
  validateEquipmentModifierList(list);
  return cloneEquipmentPortableValue(list, "Equipment modifier list");
}

export function createEquipmentModifier(input = {}) {
  requireEquipmentPlainObject(input, "Equipment modifier input");
  const context = {
    ancestors: new WeakSet(),
    ids: new Set(),
  };
  const modifier = createEquipmentModifierNode(input, context, "modifier");
  if (modifier.kind !== "modifier") {
    throw new Error("Equipment modifier input must be eqp_modifier");
  }
  return deepFreeze(modifier);
}

export function validateEquipmentModifier(modifier) {
  const context = {
    ancestors: new WeakSet(),
    ids: new Set(),
  };
  validateEquipmentModifierNode(modifier, context, "Equipment modifier");
  if (modifier.kind !== "modifier") {
    throw new Error("Equipment modifier kind must be modifier");
  }
  assertEquipmentPortableValue(modifier, "Equipment modifier");
  return true;
}

export function serializeEquipmentModifier(modifier) {
  validateEquipmentModifier(modifier);
  return cloneEquipmentPortableValue(modifier, "Equipment modifier");
}

export function getEquipmentModifierSchemaVersion() {
  return EQUIPMENT_MODIFIER_SCHEMA_VERSION;
}

export function getEquipmentModifierNodeKinds() {
  return [...EQUIPMENT_MODIFIER_NODE_KINDS];
}

function createEquipmentModifierNodes(nodes, context, label) {
  validateEquipmentDenseArray(nodes, `Equipment modifier ${label}`);
  return nodes.map((node, index) =>
    createEquipmentModifierNode(node, context, `${label}[${index}]`),
  );
}

function createEquipmentModifierNode(input, context, label) {
  requireEquipmentPlainObject(input, `Equipment modifier ${label}`);
  if (context.ancestors.has(input)) {
    throw new Error("Equipment modifier input must not contain cycles");
  }
  context.ancestors.add(input);

  const node = input.type === "eqp_modifier_container" ||
    Array.isArray(input.children)
    ? createEquipmentModifierContainer(input, context, label)
    : createEquipmentModifierLeaf(input);

  context.ancestors.delete(input);
  return node;
}

function createEquipmentModifierContainer(input, context, label) {
  return {
    schemaVersion: EQUIPMENT_MODIFIER_SCHEMA_VERSION,
    kind: "container",
    id: normalizeRequiredString(
      input.id,
      "Equipment modifier container id must be non-empty string",
    ),
    name: normalizeString(input.name),
    reference: normalizeNullableString(input.reference),
    notes: normalizeString(input.notes),
    enabled: isEnabled(input),
    open: input.open === true,
    children: createEquipmentModifierNodes(
      input.children ?? [],
      context,
      `${label}.children`,
    ),
    source: normalizeSource(input.source, { type: input.type }),
    raw: clonePortableNullableValue(
      getCanonicalRawInput(input),
      "Equipment modifier container raw",
    ),
  };
}

function createEquipmentModifierLeaf(input) {
  const features = clonePortableArray(input.features, "Equipment modifier features");
  const costAdjustment = normalizeEquipmentAdjustment(
    input.costAdjustment,
    {
      type: input.cost_type ?? input.costType,
      expression: input.cost,
      target: "baseCost",
    },
    "Equipment modifier costAdjustment",
  );
  const weightAdjustment = normalizeEquipmentAdjustment(
    input.weightAdjustment,
    {
      type: input.weight_type ?? input.weightType,
      expression: input.weight,
      target: "baseWeight",
    },
    "Equipment modifier weightAdjustment",
  );
  return {
    schemaVersion: EQUIPMENT_MODIFIER_SCHEMA_VERSION,
    kind: "modifier",
    id: normalizeRequiredString(
      input.id,
      "Equipment modifier id must be non-empty string",
    ),
    name: normalizeString(input.name),
    reference: normalizeNullableString(input.reference),
    notes: normalizeString(input.notes),
    enabled: isEnabled(input),
    costAdjustment,
    weightAdjustment,
    features,
    applicability: normalizeApplicability(input, features),
    source: normalizeSource(input.source, {
      type: input.type,
      costType: input.cost_type ?? input.costType,
      costExpression: input.cost,
      weightType: input.weight_type ?? input.weightType,
      weightExpression: input.weight,
    }),
    raw: clonePortableNullableValue(
      getCanonicalRawInput(input),
      "Equipment modifier raw",
    ),
  };
}

function validateEquipmentModifierNodes(nodes, context, label) {
  validateEquipmentDenseArray(nodes, label);
  if (context.ancestors.has(nodes)) {
    throw new Error("Equipment modifier nodes must not contain cycles");
  }
  context.ancestors.add(nodes);
  nodes.forEach((node, index) =>
    validateEquipmentModifierNode(node, context, `${label}[${index}]`),
  );
  context.ancestors.delete(nodes);
}

function validateEquipmentModifierNode(node, context, label) {
  requireEquipmentPlainObject(node, label);
  if (context.ancestors.has(node)) {
    throw new Error("Equipment modifier nodes must not contain cycles");
  }
  context.ancestors.add(node);

  if (node.schemaVersion !== EQUIPMENT_MODIFIER_SCHEMA_VERSION) {
    throw new Error(`${label} schemaVersion is invalid`);
  }
  if (!EQUIPMENT_MODIFIER_NODE_KINDS.includes(node.kind)) {
    throw new Error(`${label} kind is invalid`);
  }
  const id = normalizeRequiredString(
    node.id,
    `${label} id must be non-empty string`,
  );
  if (context.ids.has(id)) {
    throw new Error("Equipment modifier ids must be unique");
  }
  context.ids.add(id);
  if (typeof node.name !== "string") {
    throw new Error(`${label} name must be string`);
  }
  validateNullableString(node.reference, `${label} reference`);
  if (typeof node.notes !== "string") {
    throw new Error(`${label} notes must be string`);
  }
  if (typeof node.enabled !== "boolean") {
    throw new Error(`${label} enabled must be boolean`);
  }
  validateSource(node.source, `${label} source`);
  assertEquipmentPortableValue(node.raw, `${label} raw`);

  if (node.kind === "container") {
    if (typeof node.open !== "boolean") {
      throw new Error(`${label} open must be boolean`);
    }
    validateEquipmentModifierNodes(node.children, context, `${label}.children`);
  } else {
    validateAdjustment(node.costAdjustment, `${label}.costAdjustment`, true);
    validateAdjustment(node.weightAdjustment, `${label}.weightAdjustment`, true);
    validateEquipmentDenseArray(node.features, `${label}.features`);
    assertEquipmentPortableValue(node.features, `${label}.features`);
    validateApplicability(node.applicability, `${label}.applicability`);
  }

  context.ancestors.delete(node);
}

function normalizeAdjustment({ type, expression, target }) {
  if (type === undefined && expression === undefined) return null;

  const normalizedType = normalizeNullableString(type);
  const normalizedExpression = normalizeNullableString(expression);
  const parsed = parseAdjustmentExpression(normalizedExpression);

  return {
    kind: parsed.kind,
    target,
    type: normalizedType,
    expression: normalizedExpression,
    factor: parsed.factor,
    amount: parsed.amount,
    percent: parsed.percent,
  };
}

function normalizeEquipmentAdjustment(canonicalAdjustment, sourceAdjustment, label) {
  if (canonicalAdjustment !== undefined) {
    const adjustment = clonePortableNullableValue(canonicalAdjustment, label);
    validateAdjustment(adjustment, label, true);
    if (adjustment !== null && adjustment.target !== sourceAdjustment.target) {
      throw new Error(`${label} target is invalid`);
    }
    return adjustment;
  }

  return normalizeAdjustment(sourceAdjustment);
}

function parseAdjustmentExpression(expression) {
  if (expression === null || expression.trim() === "") {
    return unsupportedAdjustment();
  }

  const normalized = expression.trim().replaceAll(",", ".");
  const multiplier = normalized.match(
    /^[x×*]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/i,
  );
  if (multiplier) {
    return {
      kind: "multiplier",
      factor: Number(multiplier[1]),
      amount: null,
      percent: null,
    };
  }

  const percentage = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*%$/,
  );
  if (percentage) {
    return {
      kind: "percentage",
      factor: null,
      amount: null,
      percent: Number(percentage[1]),
    };
  }

  const addition = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/,
  );
  if (addition) {
    return {
      kind: "addition",
      factor: null,
      amount: Number(addition[1]),
      percent: null,
    };
  }

  return unsupportedAdjustment();
}

function unsupportedAdjustment() {
  return {
    kind: "unsupported",
    factor: null,
    amount: null,
    percent: null,
  };
}

function validateAdjustment(adjustment, label, nullable = false) {
  if (adjustment === null && nullable) return;
  requireEquipmentPlainObject(adjustment, label);
  if (!ADJUSTMENT_KINDS.includes(adjustment.kind)) {
    throw new Error(`${label} kind is invalid`);
  }
  if (!ADJUSTMENT_TARGETS.includes(adjustment.target)) {
    throw new Error(`${label} target is invalid`);
  }
  validateNullableString(adjustment.type, `${label}.type`);
  validateNullableString(adjustment.expression, `${label}.expression`);
  validateNullableFiniteNumber(adjustment.factor, `${label}.factor`);
  validateNullableFiniteNumber(adjustment.amount, `${label}.amount`);
  validateNullableFiniteNumber(adjustment.percent, `${label}.percent`);

  if (adjustment.kind === "multiplier" && adjustment.factor === null) {
    throw new Error(`${label} multiplier factor must be number`);
  }
  if (adjustment.kind === "addition" && adjustment.amount === null) {
    throw new Error(`${label} addition amount must be number`);
  }
  if (adjustment.kind === "percentage" && adjustment.percent === null) {
    throw new Error(`${label} percentage percent must be number`);
  }
}

function normalizeApplicability(input, features) {
  if (input.applicability !== undefined) {
    const applicability = cloneEquipmentPortableValue(
      input.applicability,
      "Equipment modifier applicability",
    );
    validateApplicability(applicability, "Equipment modifier applicability");
    return applicability;
  }

  const featureSelectionType = features
    .map(feature => feature?.selection_type ?? feature?.selectionType)
    .find(value => typeof value === "string" && value.trim() !== "");

  return {
    selectionType: normalizeNullableString(
      input.selection_type ?? input.selectionType ?? featureSelectionType,
    ),
    notes: normalizeNullableString(input.applies_to ?? input.appliesTo),
  };
}

function validateApplicability(applicability, label) {
  requireEquipmentPlainObject(applicability, label);
  validateNullableString(applicability.selectionType, `${label}.selectionType`);
  validateNullableString(applicability.notes, `${label}.notes`);
}

function createSource({
  type,
  version,
  costType,
  costExpression,
  weightType,
  weightExpression,
}) {
  return {
    type: normalizeNullableString(type),
    version: normalizeNullableNonNegativeFiniteNumber(
      version,
      "Equipment modifier source version must be non-negative finite number or null",
    ),
    costType: normalizeNullableString(costType),
    costExpression: normalizeNullableString(costExpression),
    weightType: normalizeNullableString(weightType),
    weightExpression: normalizeNullableString(weightExpression),
  };
}

function normalizeSource(source, fallback) {
  if (source !== undefined) {
    const normalized = cloneEquipmentPortableValue(source, "Equipment modifier source");
    validateSource(normalized, "Equipment modifier source");
    return normalized;
  }

  return createSource(fallback);
}

function validateSource(source, label) {
  requireEquipmentPlainObject(source, label);
  validateNullableString(source.type, `${label}.type`);
  validateNullableNonNegativeFiniteNumber(
    source.version,
    `${label}.version must be non-negative finite number or null`,
  );
  validateNullableString(source.costType, `${label}.costType`);
  validateNullableString(source.costExpression, `${label}.costExpression`);
  validateNullableString(source.weightType, `${label}.weightType`);
  validateNullableString(source.weightExpression, `${label}.weightExpression`);
}

function isEnabled(input) {
  return input.disabled !== true && input.enabled !== false;
}

function getCanonicalRawInput(input) {
  if (
    input.schemaVersion === EQUIPMENT_MODIFIER_SCHEMA_VERSION &&
    Object.prototype.hasOwnProperty.call(input, "raw")
  ) {
    return input.raw;
  }
  return input;
}

function clonePortableNullableValue(value, label) {
  if (value === undefined) return null;
  return cloneEquipmentPortableValue(value, label);
}

function clonePortableArray(value, label) {
  if (value === undefined || value === null) return [];
  validateEquipmentDenseArray(value, label);
  assertEquipmentPortableValue(value, label);
  return cloneEquipmentPortableValue(value, label);
}

function normalizeRequiredString(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
  return value;
}

function normalizeString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  return String(value);
}

function validateNullableString(value, label) {
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be string or null`);
  }
}

function normalizeNullableNonNegativeFiniteNumber(value, message) {
  if (value === undefined || value === null) return null;
  const normalized = typeof value === "string" && value.trim() !== ""
    ? Number(value.trim().replaceAll(",", "."))
    : value;
  if (
    typeof normalized !== "number" ||
    !Number.isFinite(normalized) ||
    normalized < 0
  ) {
    throw new Error(message);
  }
  return normalized;
}

function validateNullableNonNegativeFiniteNumber(value, message) {
  if (value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(message);
  }
}

function validateNullableFiniteNumber(value, label) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${label} must be finite number or null`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}
