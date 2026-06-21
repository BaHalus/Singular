const COST_TYPES = ["percentage", "points", "multiplier", "text", "unknown"];
const AFFECTS_VALUES = ["total", "base-only", "levels-only", "unknown"];
const MODIFIER_KINDS = ["enhancement", "limitation", "neutral", "unknown"];

export function createTraitModifiers(input = [], context = {}) {
  if (!Array.isArray(input)) {
    throw new Error("Trait modifiers must be an array");
  }
  if (!isPlainObject(context)) {
    throw new Error("Trait modifier context must be object");
  }

  const traitId = normalizeRequiredString(context.traitId ?? "trait", "Trait modifier traitId");
  const source = normalizeSource(context.source);
  const modifiers = input.map((item, index) => createTraitModifier(item, {
    traitId,
    source,
    path: [index],
  }));

  validateTraitModifiers(modifiers);
  return deepFreeze(modifiers);
}

export function createTraitModifier(input = {}, context = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Trait modifier must be object");
  }

  const raw = cloneValue(input.raw ?? input);
  const traitId = normalizeRequiredString(context.traitId ?? "trait", "Trait modifier traitId");
  const path = Array.isArray(context.path) ? context.path : [0];
  const childrenInput = readChildren(input);
  const container = inferContainer(input, childrenInput);
  const parsedCost = parseCost(input, container);
  const id = normalizeModifierId(input, traitId, path, raw);
  const externalIds = normalizeExternalIds(input);
  const source = normalizeSource(input.source ?? context.source);
  const enabled = normalizeEnabled(input);
  const affects = normalizeAffects(
    input.affects ?? input.affectsCostScope ?? input.affects_cost,
  );
  const levels = normalizeNullableNumber(input.levels, "Trait modifier levels");
  const useLevelFromTrait = normalizeBoolean(
    input.useLevelFromTrait ?? input.use_level_from_trait,
    false,
    "Trait modifier useLevelFromTrait",
  );
  const affectsCost = normalizeBoolean(
    input.affectsCost,
    !container && ["percentage", "points", "multiplier"].includes(parsedCost.type),
    "Trait modifier affectsCost",
  );
  const kind = normalizeKind(
    input.kind ?? input.modifierKind ?? inferKind(parsedCost),
  );
  const modifier = {
    id,
    externalIds,
    name: normalizeString(input.name ?? input.description ?? ""),
    kind,
    container,
    enabled,
    affectsCost,
    costType: parsedCost.type,
    costValue: parsedCost.value,
    costExpression: parsedCost.expression,
    affects,
    levels,
    useLevelFromTrait,
    notes: normalizeNotes(input.notes ?? input.local_notes),
    tags: normalizeStringArray(input.tags ?? input.categories),
    source,
    importMeta: normalizeNullableObject(input.importMeta),
    raw,
    children: childrenInput.map((child, index) => createTraitModifier(child, {
      traitId,
      source,
      path: [...path, index],
    })),
  };

  validateTraitModifier(modifier);
  return deepFreeze(modifier);
}

export function validateTraitModifiers(modifiers) {
  if (!Array.isArray(modifiers)) {
    throw new Error("Trait modifiers must be an array");
  }
  const ids = new Set();
  traverseModifiers(modifiers, modifier => {
    validateTraitModifier(modifier);
    if (ids.has(modifier.id)) {
      throw new Error(`Duplicate Trait modifier id: ${modifier.id}`);
    }
    ids.add(modifier.id);
  });
  return true;
}

export function validateTraitModifier(modifier) {
  if (!isPlainObject(modifier)) throw new Error("Trait modifier must be object");
  normalizeRequiredString(modifier.id, "Trait modifier id");
  if (!isPlainObject(modifier.externalIds)) {
    throw new Error("Trait modifier externalIds must be object");
  }
  if (typeof modifier.name !== "string") {
    throw new Error("Trait modifier name must be string");
  }
  if (!MODIFIER_KINDS.includes(modifier.kind)) {
    throw new Error("Trait modifier kind is invalid");
  }
  if (typeof modifier.container !== "boolean") {
    throw new Error("Trait modifier container must be boolean");
  }
  if (typeof modifier.enabled !== "boolean") {
    throw new Error("Trait modifier enabled must be boolean");
  }
  if (typeof modifier.affectsCost !== "boolean") {
    throw new Error("Trait modifier affectsCost must be boolean");
  }
  if (!COST_TYPES.includes(modifier.costType)) {
    throw new Error("Trait modifier costType is invalid");
  }
  validateNullableFiniteNumber(modifier.costValue, "Trait modifier costValue");
  if (modifier.costExpression !== null && typeof modifier.costExpression !== "string") {
    throw new Error("Trait modifier costExpression must be string or null");
  }
  if (!AFFECTS_VALUES.includes(modifier.affects)) {
    throw new Error("Trait modifier affects is invalid");
  }
  validateNullableFiniteNumber(modifier.levels, "Trait modifier levels");
  if (typeof modifier.useLevelFromTrait !== "boolean") {
    throw new Error("Trait modifier useLevelFromTrait must be boolean");
  }
  if (typeof modifier.notes !== "string") {
    throw new Error("Trait modifier notes must be string");
  }
  if (!Array.isArray(modifier.tags)) {
    throw new Error("Trait modifier tags must be array");
  }
  if (!isPlainObject(modifier.source)) {
    throw new Error("Trait modifier source must be object");
  }
  if (modifier.importMeta !== null && !isPlainObject(modifier.importMeta)) {
    throw new Error("Trait modifier importMeta must be object or null");
  }
  if (!Array.isArray(modifier.children)) {
    throw new Error("Trait modifier children must be array");
  }
  modifier.children.forEach(validateTraitModifier);
  if (modifier.container && modifier.affectsCost) {
    throw new Error("Trait modifier container cannot directly affect cost");
  }
  return true;
}

export function serializeTraitModifiers(modifiers) {
  validateTraitModifiers(modifiers);
  return modifiers.map(serializeTraitModifier);
}

export function serializeTraitModifier(modifier) {
  validateTraitModifier(modifier);
  return {
    id: modifier.id,
    externalIds: cloneValue(modifier.externalIds),
    name: modifier.name,
    kind: modifier.kind,
    container: modifier.container,
    enabled: modifier.enabled,
    affectsCost: modifier.affectsCost,
    costType: modifier.costType,
    costValue: modifier.costValue,
    costExpression: modifier.costExpression,
    affects: modifier.affects,
    levels: modifier.levels,
    useLevelFromTrait: modifier.useLevelFromTrait,
    notes: modifier.notes,
    tags: [...modifier.tags],
    source: cloneValue(modifier.source),
    importMeta: cloneValue(modifier.importMeta),
    raw: cloneValue(modifier.raw),
    children: modifier.children.map(serializeTraitModifier),
  };
}

export function flattenEnabledTraitModifiers(modifiers, traitLevels = null) {
  validateTraitModifiers(modifiers);
  const result = [];
  const visit = (items, ancestorsEnabled) => {
    for (const modifier of items) {
      const enabled = ancestorsEnabled && modifier.enabled;
      if (modifier.container) {
        visit(modifier.children, enabled);
        continue;
      }
      result.push({
        modifier,
        enabled,
        levelMultiplier: resolveLevelMultiplier(modifier, traitLevels),
      });
    }
  };
  visit(modifiers, true);
  return result;
}

export function getTraitModifierCostTypes() {
  return [...COST_TYPES];
}

export function getTraitModifierAffectsValues() {
  return [...AFFECTS_VALUES];
}

function parseCost(input, container) {
  if (container) return { type: "text", value: null, expression: null };

  if (isPlainObject(input.cost)) {
    return {
      type: normalizeCostType(input.cost.type),
      value: normalizeNullableNumber(input.cost.value, "Trait modifier cost value"),
      expression: normalizeNullableString(input.cost.expression),
    };
  }

  const explicitType = input.costType ?? input.cost_type ?? input.modifierCostType;
  const expression = input.costExpression ?? input.cost_adj ?? input.costAdj;
  if (expression !== undefined && expression !== null && expression !== "") {
    return parseCostExpression(expression, explicitType);
  }

  const oldCost = input.costValue ?? input.value ?? input.cost;
  if (oldCost !== undefined && oldCost !== null && oldCost !== "") {
    const type = normalizeCostType(explicitType ?? "percentage");
    if (type === "text" || type === "unknown") {
      return {
        type,
        value: null,
        expression: String(oldCost),
      };
    }
    return {
      type,
      value: normalizeNullableNumber(oldCost, "Trait modifier cost value"),
      expression: String(oldCost),
    };
  }

  return { type: normalizeCostType(explicitType), value: null, expression: null };
}

function parseCostExpression(value, explicitType) {
  const expression = String(value).trim();
  let type = normalizeCostType(explicitType);
  let numericText = expression;

  if (type === "unknown") {
    if (expression.endsWith("%")) type = "percentage";
    else if (/^[x×]/i.test(expression)) type = "multiplier";
    else if (expression !== "" && Number.isFinite(Number(expression))) type = "points";
    else type = "text";
  }

  if (type === "percentage") numericText = expression.replace(/%$/, "").trim();
  if (type === "multiplier") numericText = expression.replace(/^[x×]/i, "").trim();
  const parsed = Number(numericText);
  return {
    type,
    value: ["percentage", "points", "multiplier"].includes(type) && Number.isFinite(parsed)
      ? parsed
      : null,
    expression,
  };
}

function normalizeCostType(value) {
  const text = String(value ?? "").trim().toLowerCase().replaceAll("_", "-");
  if (["percentage", "percent", "%"].includes(text)) return "percentage";
  if (["points", "point", "pts", "addition"].includes(text)) return "points";
  if (["multiplier", "multiply", "x", "×"].includes(text)) return "multiplier";
  if (["text", "textual", "none"].includes(text)) return "text";
  return "unknown";
}

function normalizeAffects(value) {
  const text = String(value ?? "total").trim().toLowerCase().replaceAll("_", "-");
  if (["total", "all"].includes(text)) return "total";
  if (["base", "base-only", "baseonly"].includes(text)) return "base-only";
  if (["levels", "levels-only", "levelsonly"].includes(text)) return "levels-only";
  return "unknown";
}

function normalizeKind(value) {
  const text = String(value ?? "unknown").trim().toLowerCase();
  return MODIFIER_KINDS.includes(text) ? text : "unknown";
}

function inferKind(cost) {
  if (cost.type !== "percentage" || cost.value === null) return "unknown";
  if (cost.value > 0) return "enhancement";
  if (cost.value < 0) return "limitation";
  return "neutral";
}

function inferContainer(input, children) {
  if (typeof input.container === "boolean") return input.container;
  const type = String(input.type ?? input.kind ?? "").toLowerCase();
  return children.length > 0 || type.includes("container");
}

function readChildren(input) {
  const children = input.children ?? input.modifiers ?? [];
  if (!Array.isArray(children)) {
    throw new Error("Trait modifier children must be array");
  }
  return children;
}

function normalizeModifierId(input, traitId, path, raw) {
  const explicit = input.id ?? input.uuid;
  if (typeof explicit === "string" && explicit !== "") return explicit;
  const hash = stableHash(canonicalStringify(raw));
  return `${traitId}:modifier:${path.join(".")}:${hash}`;
}

function normalizeExternalIds(input) {
  const externalIds = isPlainObject(input.externalIds)
    ? cloneValue(input.externalIds)
    : {};
  if (input.id && !externalIds.gcs) externalIds.gcs = input.id;
  if (input.uuid && !externalIds.gcsUuid) externalIds.gcsUuid = input.uuid;
  return externalIds;
}

function normalizeEnabled(input) {
  if (typeof input.enabled === "boolean") return input.enabled;
  if (typeof input.disabled === "boolean") return !input.disabled;
  return true;
}

function resolveLevelMultiplier(modifier, traitLevels) {
  if (modifier.useLevelFromTrait) {
    return normalizePositiveLevel(traitLevels);
  }
  return normalizePositiveLevel(modifier.levels);
}

function normalizePositiveLevel(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
}

function normalizeSource(source) {
  if (source === undefined || source === null) {
    return { kind: "unknown", provider: null, format: null, reference: null, version: null };
  }
  if (!isPlainObject(source)) throw new Error("Trait modifier source must be object");
  return {
    ...cloneValue(source),
    kind: typeof source.kind === "string" && source.kind !== "" ? source.kind : "unknown",
    provider: normalizeNullableString(source.provider),
    format: normalizeNullableString(source.format),
    reference: normalizeNullableString(source.reference),
    version: source.version ?? null,
  };
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(String).join("\n");
  return String(value);
}

function normalizeStringArray(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Trait modifier tags must be array");
  return value.map(String);
}

function normalizeBoolean(value, fallback, label) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
  return value;
}

function normalizeNullableObject(value) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) throw new Error("Trait modifier importMeta must be object or null");
  return cloneValue(value);
}

function normalizeNullableNumber(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be finite number or null`);
  return parsed;
}

function validateNullableFiniteNumber(value, label) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${label} must be finite number or null`);
  }
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value === "") throw new Error(`${label} must be non-empty string`);
  return value;
}

function normalizeString(value) {
  return value === undefined || value === null ? "" : String(value);
}

function normalizeNullableString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function traverseModifiers(modifiers, visitor) {
  for (const modifier of modifiers) {
    visitor(modifier);
    traverseModifiers(modifier.children, visitor);
  }
}

function stableHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

function cloneValue(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    value.forEach(item => result.push(cloneValue(item, seen)));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    Object.entries(value).forEach(([key, item]) => { result[key] = cloneValue(item, seen); });
    return result;
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
