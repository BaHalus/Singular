const EQUIPMENT_KINDS = ["item", "container"];
const CONTAINER_KINDS = ["physical", "group"];
const EQUIPMENT_STATES = ["equipped", "carried", "stored", "dropped", "ignored"];

export function createEquipment(input = []) {
  const equipment = input.map(createEquipmentItem);

  validateEquipment(equipment);

  return equipment;
}

export function createEquipmentItem(input = {}) {
  const kind = input.kind ?? inferKind(input);
  const containerKind = normalizeContainerKind(input.containerKind, kind);

  return {
    id: input.id ?? generateEquipmentId(),
    externalIds: normalizeExternalIds(input.externalIds),

    kind,
    containerKind,

    name: input.name ?? input.description ?? "",
    quantity: input.quantity ?? 1,

    techLevel: input.techLevel ?? input.tech_level ?? null,
    legalityClass: input.legalityClass ?? input.legality_class ?? null,
    reference: input.reference ?? null,

    value: input.value ?? "0",
    weight: input.weight ?? "0 lb",

    state: input.state ?? inferState(kind, containerKind),

    categories: normalizeArray(input.categories, "Equipment categories must be array"),
    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Equipment tags must be array"),

    weapons: normalizeArray(input.weapons, "Equipment weapons must be array"),
    features: normalizeArray(input.features, "Equipment features must be array"),
    modifiers: normalizeArray(input.modifiers, "Equipment modifiers must be array"),
    prereqs: input.prereqs ?? null,
    calc: input.calc ?? null,

    children: createEquipment(input.children ?? []),
    raw: input.raw ?? null,
  };
}

export function validateEquipment(equipment) {
  if (!Array.isArray(equipment)) {
    throw new Error("Equipment must be an array");
  }

  for (const item of equipment) {
    validateEquipmentItem(item);
  }

  return true;
}

export function validateEquipmentItem(item) {
  if (!item || typeof item !== "object") {
    throw new Error("Equipment item must be an object");
  }

  if (!item.id) {
    throw new Error("Equipment item must have id");
  }

  if (!isPlainObject(item.externalIds)) {
    throw new Error("Equipment externalIds must be object");
  }

  if (!EQUIPMENT_KINDS.includes(item.kind)) {
    throw new Error("Equipment kind is invalid");
  }

  if (
    item.containerKind !== null &&
    !CONTAINER_KINDS.includes(item.containerKind)
  ) {
    throw new Error("Equipment containerKind is invalid");
  }

  if (item.kind !== "container" && item.containerKind !== null) {
    throw new Error("Only containers can have containerKind");
  }

  if (typeof item.name !== "string") {
    throw new Error("Equipment name must be string");
  }

  if (typeof item.quantity !== "number" || item.quantity < 0) {
    throw new Error("Equipment quantity must be non-negative number");
  }

  if (item.techLevel !== null && typeof item.techLevel !== "string") {
    throw new Error("Equipment techLevel must be string or null");
  }

  if (item.legalityClass !== null && typeof item.legalityClass !== "string") {
    throw new Error("Equipment legalityClass must be string or null");
  }

  if (item.reference !== null && typeof item.reference !== "string") {
    throw new Error("Equipment reference must be string or null");
  }

  if (typeof item.value !== "string") {
    throw new Error("Equipment value must be string");
  }

  if (typeof item.weight !== "string") {
    throw new Error("Equipment weight must be string");
  }

  if (!EQUIPMENT_STATES.includes(item.state)) {
    throw new Error("Equipment state is invalid");
  }

  if (!Array.isArray(item.categories)) {
    throw new Error("Equipment categories must be array");
  }

  if (typeof item.notes !== "string") {
    throw new Error("Equipment notes must be string");
  }

  if (!Array.isArray(item.tags)) {
    throw new Error("Equipment tags must be array");
  }

  if (!Array.isArray(item.weapons)) {
    throw new Error("Equipment weapons must be array");
  }

  if (!Array.isArray(item.features)) {
    throw new Error("Equipment features must be array");
  }

  if (!Array.isArray(item.modifiers)) {
    throw new Error("Equipment modifiers must be array");
  }

  validateEquipment(item.children);

  return true;
}

export function serializeEquipment(equipment) {
  validateEquipment(equipment);

  return equipment.map(item => ({
    id: item.id,
    externalIds: { ...item.externalIds },

    kind: item.kind,
    containerKind: item.containerKind,

    name: item.name,
    quantity: item.quantity,

    techLevel: item.techLevel,
    legalityClass: item.legalityClass,
    reference: item.reference,

    value: item.value,
    weight: item.weight,

    state: item.state,

    categories: [...item.categories],
    notes: item.notes,
    tags: [...item.tags],

    weapons: [...item.weapons],
    features: [...item.features],
    modifiers: [...item.modifiers],
    prereqs: item.prereqs,
    calc: item.calc,

    children: serializeEquipment(item.children),
    raw: item.raw,
  }));
}

function inferKind(input) {
  if (input.type === "equipment_container" || Array.isArray(input.children)) {
    return "container";
  }

  return "item";
}

function normalizeContainerKind(containerKind, kind) {
  if (
    kind !== "container" &&
    containerKind !== undefined &&
    containerKind !== null
  ) {
    throw new Error("Only containers can have containerKind");
  }

  if (kind !== "container") {
    return null;
  }

  if (containerKind !== undefined && containerKind !== null) {
    return containerKind;
  }

  return null;
}

function inferState(kind, containerKind) {
  if (kind === "container" && containerKind === "group") {
    return "ignored";
  }

  return "carried";
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Equipment externalIds must be object");
  }

  return { ...externalIds };
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function generateEquipmentId() {
  return `eq_${Math.random().toString(36).slice(2, 10)}`;
}
