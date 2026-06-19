const EQUIPMENT_STATES = [
  "equipped",
  "carried",
  "stored",
  "dropped",
  "ignored",
];

export function importEquipment(source = []) {
  const collections = readEquipmentCollections(source);
  const result = {
    equipment: [],
    unknownNodes: [],
  };

  for (const collection of collections) {
    for (const node of collection.rows) {
      const imported = importEquipmentNode(node, result, {
        section: collection.section,
        defaultState: collection.defaultState,
        containerIds: [],
      });

      if (imported) {
        result.equipment.push(imported);
      }
    }
  }

  return result;
}

function importEquipmentNode(source, result, context) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("GCS equipment node must be object");
  }

  const childrenSource = readChildRows(source);
  const nodeKind = inferEquipmentNodeKind(source, childrenSource);

  if (nodeKind === "unknown") {
    result.unknownNodes.push(mapUnknownNode(source, context));
    return null;
  }

  const kind = nodeKind === "container" ? "container" : "item";
  const containerKind = kind === "container"
    ? inferContainerKind(source, childrenSource)
    : null;
  const id = source.id ?? source.uuid ?? generateEquipmentId();
  const state = inferEquipmentState(source, {
    defaultState: context.defaultState,
    kind,
    containerKind,
  });
  const children = [];

  for (const childSource of childrenSource) {
    const child = importEquipmentNode(childSource, result, {
      section: context.section,
      defaultState: state === "stored" ? "stored" : context.defaultState,
      containerIds: [...context.containerIds, id],
    });

    if (child) children.push(child);
  }

  return {
    id,
    externalIds: createExternalIds(source),

    kind,
    containerKind,

    name: source.name ?? source.description ?? "",
    quantity: normalizeNonNegativeNumber(source.quantity, 1, "GCS equipment quantity must be non-negative number"),

    techLevel: normalizeNullableString(source.techLevel ?? source.tech_level),
    legalityClass: normalizeNullableString(
      source.legalityClass ?? source.legality_class,
    ),
    reference: normalizeNullableString(source.reference),

    cost: normalizeNonNegativeNumber(
      source.cost ?? source.value,
      0,
      "GCS equipment cost must be non-negative number",
    ),
    weightKg: normalizeWeightKg(source.weightKg ?? source.weight),

    state,
    uses: normalizeNullableNonNegativeNumber(
      source.uses,
      "GCS equipment uses must be non-negative number or null",
    ),
    maxUses: normalizeNullableNonNegativeNumber(
      source.maxUses ?? source.max_uses,
      "GCS equipment maxUses must be non-negative number or null",
    ),

    categories: normalizeArray(
      source.categories,
      "GCS equipment categories must be array",
    ),
    notes: normalizeNotes(source.notes),
    tags: [
      ...normalizeArray(source.tags, "GCS equipment tags must be array"),
      "import:gcs",
      `node:${kind}`,
      ...(containerKind ? [`container:${containerKind}`] : []),
      `section:${context.section}`,
    ],

    weapons: normalizeArray(
      source.weapons,
      "GCS equipment weapons must be array",
    ),
    features: normalizeArray(
      source.features,
      "GCS equipment features must be array",
    ),
    modifiers: normalizeArray(
      source.modifiers,
      "GCS equipment modifiers must be array",
    ),
    prereqs: source.prereqs ?? null,
    calc: source.calc ?? null,

    importMeta: {
      source: "gcs",
      section: context.section,
      containerIds: [...context.containerIds],
      sourceType: source.type ?? null,
    },

    children,
    raw: source,
  };
}

function readEquipmentCollections(source) {
  if (Array.isArray(source)) {
    return [{
      rows: source,
      section: "equipment",
      defaultState: "carried",
    }];
  }

  if (!source || typeof source !== "object") {
    throw new Error("GCS equipment source must be array or object");
  }

  const collections = [];

  if (Array.isArray(source.rows)) {
    collections.push({
      rows: source.rows,
      section: "equipment",
      defaultState: "carried",
    });
  }

  if (Array.isArray(source.equipment)) {
    collections.push({
      rows: source.equipment,
      section: "equipment",
      defaultState: "carried",
    });
  }

  const otherEquipment = source.otherEquipment ?? source.other_equipment;

  if (Array.isArray(otherEquipment)) {
    collections.push({
      rows: otherEquipment,
      section: "otherEquipment",
      defaultState: "stored",
    });
  }

  return collections;
}

function readChildRows(source) {
  if (Array.isArray(source.children)) return source.children;
  if (Array.isArray(source.rows)) return source.rows;

  return [];
}

function inferEquipmentNodeKind(source, children) {
  const type = String(source.type ?? source.kind ?? "").toLowerCase();

  if (
    type === "equipment_container" ||
    type === "equipment_group" ||
    type.includes("equipment_container") ||
    children.length > 0
  ) {
    return "container";
  }

  if (
    type === "equipment" ||
    type === "item" ||
    source.description !== undefined ||
    source.name !== undefined ||
    source.weight !== undefined ||
    source.value !== undefined ||
    source.quantity !== undefined
  ) {
    return "item";
  }

  return "unknown";
}

function inferContainerKind(source, children) {
  const explicit = source.containerKind ?? source.container_kind;

  if (explicit === "physical" || explicit === "group") {
    return explicit;
  }

  const type = String(source.type ?? source.kind ?? "").toLowerCase();

  if (type === "equipment_group" || source.isGroup === true || source.is_group === true) {
    return "group";
  }

  if (hasContainedWeightPrereq(source.prereqs)) {
    return "physical";
  }

  const cost = normalizeNonNegativeNumber(
    source.cost ?? source.value,
    0,
    "GCS equipment cost must be non-negative number",
  );
  const weightKg = normalizeWeightKg(source.weightKg ?? source.weight);

  if (cost > 0 || weightKg > 0) {
    return "physical";
  }

  if (children.length > 0) {
    return "group";
  }

  return "group";
}

function hasContainedWeightPrereq(prereqs) {
  if (!prereqs || typeof prereqs !== "object") {
    return false;
  }

  if (prereqs.type === "contained_weight_prereq") {
    return true;
  }

  if (Array.isArray(prereqs.prereqs)) {
    return prereqs.prereqs.some(hasContainedWeightPrereq);
  }

  return false;
}

function inferEquipmentState(source, context) {
  const explicit = source.state;

  if (EQUIPMENT_STATES.includes(explicit)) {
    return explicit;
  }

  if (context.kind === "container" && context.containerKind === "group") {
    return "ignored";
  }

  if (source.dropped === true) return "dropped";
  if (source.equipped === true) return "equipped";
  if (source.carried === false) return "stored";
  if (source.carried === true) return "carried";

  return context.defaultState ?? "carried";
}

function mapUnknownNode(source, context) {
  return {
    id: source.id ?? source.uuid ?? generateUnknownEquipmentId(),
    externalIds: createExternalIds(source),
    name: source.name ?? source.description ?? "",
    importMeta: {
      source: "gcs",
      section: context.section,
      containerIds: [...context.containerIds],
      sourceType: source.type ?? null,
    },
    raw: source,
  };
}

function createExternalIds(source) {
  const externalIds = {};

  if (source.id) externalIds.gcs = source.id;
  if (source.uuid) externalIds.gcsUuid = source.uuid;

  return externalIds;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeNonNegativeNumber(value, fallback, errorMessage) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(errorMessage);
  }

  return parsed;
}

function normalizeNullableNonNegativeNumber(value, errorMessage) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return normalizeNonNegativeNumber(value, null, errorMessage);
}

function normalizeWeightKg(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    if (value < 0) {
      throw new Error("GCS equipment weight must be non-negative");
    }

    return value;
  }

  if (typeof value !== "string") {
    throw new Error("GCS equipment weight must be number or supported string");
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|kg)?$/);

  if (!match) {
    throw new Error("GCS equipment weight must be number or supported string");
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "kg";

  return unit === "kg" ? amount : amount / 2;
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");

  return String(value);
}

function generateEquipmentId() {
  return `import_equipment_${Math.random().toString(36).slice(2, 10)}`;
}

function generateUnknownEquipmentId() {
  return `import_equipment_unknown_${Math.random().toString(36).slice(2, 10)}`;
}
