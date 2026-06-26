import {
  assertEquipmentPortableValue,
  cloneEquipmentPortableValue,
  requireEquipmentPlainObject,
  validateEquipmentDenseArray,
} from "./EquipmentPortableValue.js";

const EQUIPMENT_KINDS = ["item", "container"];
const CONTAINER_KINDS = ["physical", "group"];
const EQUIPMENT_STATES = ["equipped", "carried", "stored", "dropped", "ignored"];

export function createEquipment(input = []) {
  return createEquipmentInternal(input, new WeakSet());
}

export function createEquipmentItem(input = {}) {
  return createEquipmentItemInternal(input, new WeakSet());
}

export function validateEquipment(equipment) {
  const context = {
    ancestors: new WeakSet(),
    ids: new Set(),
  };
  validateEquipmentInternal(equipment, context, "Equipment");
  assertEquipmentPortableValue(equipment, "Equipment");
  return true;
}

export function validateEquipmentItem(item) {
  return validateEquipment([item]);
}

export function serializeEquipment(equipment) {
  validateEquipment(equipment);
  return cloneEquipmentPortableValue(equipment, "Equipment");
}

export function getEquipmentStates() {
  return [...EQUIPMENT_STATES];
}

function createEquipmentInternal(input, ancestors) {
  validateEquipmentDenseArray(input, "Equipment input");
  if (ancestors.has(input)) {
    throw new Error("Equipment input must not contain cycles");
  }
  ancestors.add(input);

  const equipment = input.map(item => createEquipmentItemInternal(item, ancestors));

  ancestors.delete(input);
  validateEquipment(equipment);
  return equipment;
}

function createEquipmentItemInternal(input, ancestors) {
  requireEquipmentPlainObject(input, "Equipment item input");
  if (ancestors.has(input)) {
    throw new Error("Equipment input must not contain cycles");
  }
  ancestors.add(input);

  const kind = input.kind ?? inferKind(input);
  const containerKind = normalizeContainerKind(input.containerKind, kind);
  const item = {
    id: normalizeRequiredString(
      input.id ?? generateEquipmentId(),
      "Equipment item id must be non-empty string",
    ),
    externalIds: normalizePortableObject(
      input.externalIds,
      "Equipment externalIds must be object",
    ),
    kind,
    containerKind,
    name: input.name ?? input.description ?? "",
    quantity: normalizeNonNegativeFiniteNumber(
      input.quantity ?? 1,
      "Equipment quantity must be non-negative finite number",
    ),
    techLevel: input.techLevel ?? input.tech_level ?? null,
    legalityClass: input.legalityClass ?? input.legality_class ?? null,
    reference: input.reference ?? null,
    cost: normalizeCost(input.cost ?? input.value ?? 0),
    weightKg: normalizeWeightKg(input.weightKg ?? input.weight ?? 0),
    state: input.state ?? inferState(kind, containerKind),
    uses: normalizeNullableNonNegativeNumber(
      input.uses,
      "Equipment uses must be non-negative finite number or null",
    ),
    maxUses: normalizeNullableNonNegativeNumber(
      input.maxUses ?? input.max_uses,
      "Equipment maxUses must be non-negative finite number or null",
    ),
    categories: normalizePortableArray(
      input.categories,
      "Equipment categories must be array",
    ),
    notes: input.notes ?? "",
    tags: normalizePortableArray(input.tags, "Equipment tags must be array"),
    weapons: normalizePortableArray(
      input.weapons,
      "Equipment weapons must be array",
    ),
    features: normalizePortableArray(
      input.features,
      "Equipment features must be array",
    ),
    modifiers: normalizePortableArray(
      input.modifiers,
      "Equipment modifiers must be array",
    ),
    prereqs: normalizePortableNullableValue(input.prereqs, "Equipment prereqs"),
    calc: normalizePortableNullableValue(input.calc, "Equipment calc"),
    importMeta: normalizePortableNullableObject(
      input.importMeta,
      "Equipment importMeta must be object or null",
    ),
    children: createEquipmentInternal(input.children ?? [], ancestors),
    raw: normalizePortableNullableValue(input.raw, "Equipment raw"),
  };

  ancestors.delete(input);
  validateEquipmentItem(item);
  return item;
}

function validateEquipmentInternal(equipment, context, label) {
  validateEquipmentDenseArray(equipment, label);
  if (context.ancestors.has(equipment)) {
    throw new Error("Equipment must not contain cycles");
  }
  context.ancestors.add(equipment);

  equipment.forEach((item, index) =>
    validateEquipmentItemInternal(item, context, `${label}[${index}]`),
  );

  context.ancestors.delete(equipment);
}

function validateEquipmentItemInternal(item, context, label) {
  requireEquipmentPlainObject(item, "Equipment item");
  if (context.ancestors.has(item)) {
    throw new Error("Equipment must not contain cycles");
  }
  context.ancestors.add(item);

  const id = normalizeRequiredString(
    item.id,
    "Equipment item id must be non-empty string",
  );
  if (context.ids.has(id)) {
    throw new Error("Equipment item ids must be unique");
  }
  context.ids.add(id);

  if (!isPortablePlainObject(item.externalIds)) {
    throw new Error("Equipment externalIds must be object");
  }
  if (!EQUIPMENT_KINDS.includes(item.kind)) {
    throw new Error("Equipment kind is invalid");
  }
  if (item.containerKind !== null && !CONTAINER_KINDS.includes(item.containerKind)) {
    throw new Error("Equipment containerKind is invalid");
  }
  if (item.kind !== "container" && item.containerKind !== null) {
    throw new Error("Only containers can have containerKind");
  }
  if (typeof item.name !== "string") {
    throw new Error("Equipment name must be string");
  }
  normalizeNonNegativeFiniteNumber(
    item.quantity,
    "Equipment quantity must be non-negative finite number",
  );
  if (item.techLevel !== null && typeof item.techLevel !== "string") {
    throw new Error("Equipment techLevel must be string or null");
  }
  if (item.legalityClass !== null && typeof item.legalityClass !== "string") {
    throw new Error("Equipment legalityClass must be string or null");
  }
  if (item.reference !== null && typeof item.reference !== "string") {
    throw new Error("Equipment reference must be string or null");
  }
  normalizeNonNegativeFiniteNumber(
    item.cost,
    "Equipment cost must be non-negative finite number",
  );
  normalizeNonNegativeFiniteNumber(
    item.weightKg,
    "Equipment weightKg must be non-negative finite number",
  );
  if (!EQUIPMENT_STATES.includes(item.state)) {
    throw new Error("Equipment state is invalid");
  }
  validateNullableNonNegativeNumber(
    item.uses,
    "Equipment uses must be non-negative finite number or null",
  );
  validateNullableNonNegativeNumber(
    item.maxUses,
    "Equipment maxUses must be non-negative finite number or null",
  );
  validatePortableArray(item.categories, "Equipment categories must be array");
  if (typeof item.notes !== "string") {
    throw new Error("Equipment notes must be string");
  }
  validatePortableArray(item.tags, "Equipment tags must be array");
  validatePortableArray(item.weapons, "Equipment weapons must be array");
  validatePortableArray(item.features, "Equipment features must be array");
  validatePortableArray(item.modifiers, "Equipment modifiers must be array");
  validatePortableNullableValue(item.prereqs, "Equipment prereqs");
  validatePortableNullableValue(item.calc, "Equipment calc");
  validatePortableNullableObject(
    item.importMeta,
    "Equipment importMeta must be object or null",
  );
  validatePortableNullableValue(item.raw, "Equipment raw");
  validateEquipmentDenseArray(item.children, `${label}.children`);
  if (item.kind !== "container" && item.children.length > 0) {
    throw new Error("Only containers can have child equipment");
  }
  validateEquipmentInternal(item.children, context, `${label}.children`);

  context.ancestors.delete(item);
}

function inferKind(input) {
  if (input.type === "equipment_container" || Array.isArray(input.children)) {
    return "container";
  }
  return "item";
}

function normalizeContainerKind(containerKind, kind) {
  if (kind !== "container" && containerKind !== undefined && containerKind !== null) {
    throw new Error("Only containers can have containerKind");
  }
  if (kind !== "container") return null;
  return containerKind ?? null;
}

function inferState(kind, containerKind) {
  if (kind === "container" && containerKind === "group") return "ignored";
  return "carried";
}

function normalizePortableObject(value, errorMessage) {
  if (value === undefined || value === null) return {};
  if (!isPortablePlainObject(value)) throw new Error(errorMessage);
  assertEquipmentPortableValue(value, "Equipment object");
  return { ...value };
}

function normalizePortableArray(value, errorMessage) {
  if (value === undefined || value === null) return [];
  validatePortableArray(value, errorMessage);
  return [...value];
}

function validatePortableArray(value, errorMessage) {
  if (!Array.isArray(value)) throw new Error(errorMessage);
  validateEquipmentDenseArray(value, "Equipment array");
  assertEquipmentPortableValue(value, "Equipment array");
}

function normalizePortableNullableObject(value, errorMessage) {
  if (value === undefined || value === null) return null;
  if (!isPortablePlainObject(value)) throw new Error(errorMessage);
  assertEquipmentPortableValue(value, "Equipment object");
  return value;
}

function validatePortableNullableObject(value, errorMessage) {
  if (value === null) return;
  if (!isPortablePlainObject(value)) throw new Error(errorMessage);
  assertEquipmentPortableValue(value, "Equipment object");
}

function normalizePortableNullableValue(value, label) {
  if (value === undefined || value === null) return null;
  assertEquipmentPortableValue(value, label);
  return value;
}

function validatePortableNullableValue(value, label) {
  if (value === null) return;
  assertEquipmentPortableValue(value, label);
}

function normalizeCost(cost) {
  if (typeof cost === "number") {
    return normalizeNonNegativeFiniteNumber(
      cost,
      "Equipment cost must be non-negative finite number",
    );
  }
  if (typeof cost === "string") {
    if (cost.trim() === "") return 0;
    const parsed = Number(cost.trim());
    return normalizeNonNegativeFiniteNumber(
      parsed,
      "Equipment cost must be non-negative finite number",
    );
  }
  throw new Error("Equipment cost must be non-negative finite number");
}

function normalizeWeightKg(weight) {
  if (typeof weight === "number") {
    return normalizeNonNegativeFiniteNumber(
      weight,
      "Equipment weightKg must be non-negative finite number",
    );
  }
  if (weight === undefined || weight === null || weight === "") return 0;
  if (typeof weight !== "string") {
    throw new Error("Equipment weightKg must be non-negative finite number");
  }

  const normalized = weight.trim().toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|kg)?$/);
  if (!match) {
    throw new Error("Equipment weightKg must be non-negative finite number");
  }
  const value = Number(match[1]);
  const unit = match[2] ?? "kg";
  return unit === "kg" ? value : value / 2;
}

function normalizeNullableNonNegativeNumber(value, errorMessage) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(errorMessage);
  return Object.is(parsed, -0) ? 0 : parsed;
}

function validateNullableNonNegativeNumber(value, errorMessage) {
  if (value !== null && (
    typeof value !== "number" || !Number.isFinite(value) || value < 0 || Object.is(value, -0)
  )) {
    throw new Error(errorMessage);
  }
}

function normalizeNonNegativeFiniteNumber(value, errorMessage) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(errorMessage);
  }
  return Object.is(value, -0) ? 0 : value;
}

function normalizeRequiredString(value, errorMessage) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(errorMessage);
  }
  return value.trim();
}

function isPortablePlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function generateEquipmentId() {
  return `eq_${Math.random().toString(36).slice(2, 10)}`;
}
