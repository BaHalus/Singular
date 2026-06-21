import { normalizeGcsTraitTree } from "./GcsTraitTreeNormalizer.js";

export function importTraits(source = []) {
  const tree = isNormalizedTraitTree(source)
    ? source
    : normalizeGcsTraitTree(source);

  const result = createEmptyTraitsImport();

  importTraitNodes(tree, result, {
    containerIds: [],
  });

  return result;
}

function createEmptyTraitsImport() {
  return {
    advantages: [],
    perks: [],
    disadvantages: [],
    quirks: [],
    languageNodes: [],
    familiarityNodes: [],
    containers: [],
    unknownNodes: [],
  };
}

function importTraitNodes(nodes, result, context) {
  for (const node of nodes) {
    importTraitNode(node, result, context);
  }
}

function importTraitNode(node, result, context) {
  if (node.nodeKind === "container") {
    result.containers.push(mapContainerNode(node, context));

    importTraitNodes(node.children, result, {
      containerIds: [...context.containerIds, node.id],
    });

    return;
  }

  if (node.nodeKind === "trait") {
    const specialKind = inferSpecialTraitKind(node);

    if (specialKind === "language") {
      result.languageNodes.push(mapSpecialNode(node, context, specialKind));
      return;
    }

    if (specialKind === "familiarity") {
      result.familiarityNodes.push(mapSpecialNode(node, context, specialKind));
      return;
    }

    const importedTrait = mapTraitNode(node, context);

    switch (node.role) {
      case "advantage":
        result.advantages.push(importedTrait);
        break;
      case "perk":
        result.perks.push(importedTrait);
        break;
      case "disadvantage":
        result.disadvantages.push(importedTrait);
        break;
      case "quirk":
        result.quirks.push(importedTrait);
        break;
      default:
        result.unknownNodes.push(mapUnknownNode(node, context));
        break;
    }

    return;
  }

  result.unknownNodes.push(mapUnknownNode(node, context));
}

function inferSpecialTraitKind(node) {
  const normalizedTags = node.tags.map(tag => normalizeForComparison(tag));
  const name = normalizeForComparison(node.name);

  if (
    normalizedTags.includes("idioma") ||
    name.startsWith("idioma:") ||
    name.startsWith("language:") ||
    name.startsWith("linguagem de sinais:") ||
    name.startsWith("sign language:")
  ) {
    return "language";
  }

  if (
    name.startsWith("familiaridade cultural") ||
    name.startsWith("cultural familiarity")
  ) {
    return "familiarity";
  }

  return null;
}

function mapTraitNode(node, context) {
  return {
    id: node.id,
    externalIds: { ...node.externalIds },
    name: node.name,
    notes: node.notes ?? normalizeNotes(node.raw?.notes ?? node.raw?.local_notes),
    tags: buildTraitTags(node),

    points: node.points,
    levels: node.levels,

    selfControl: mapSelfControl(node),
    frequency: mapFrequency(node),
    roundCostDown: mapRoundCostDown(node),

    modifiers: [...node.modifiers],
    features: [...node.features],
    weapons: [...node.weapons],
    prereqs: node.prereqs,

    importMeta: {
      source: "gcs",
      role: node.role,
      reference: node.reference ?? node.raw?.reference ?? null,
      calc: node.calc ?? node.raw?.calc ?? null,
      containerIds: [...context.containerIds],
    },

    raw: node.raw,
  };
}

function mapSelfControl(node) {
  if (node.selfControl !== undefined && node.selfControl !== null) {
    if (isPlainObject(node.selfControl)) return node.selfControl;
    return {
      roll: node.selfControl,
      adjustment: node.selfControlAdjustment ?? node.raw?.cr_adj ?? "none",
      raw: node.selfControl,
    };
  }

  const raw = isPlainObject(node.raw) ? node.raw : {};
  const hasRoll = hasOwn(raw, "cr");
  const hasAdjustment = hasOwn(raw, "cr_adj");
  if (!hasRoll && !hasAdjustment) return null;

  return {
    roll: raw.cr ?? 0,
    adjustment: raw.cr_adj ?? "none",
    raw: {
      cr: hasRoll ? raw.cr : null,
      cr_adj: hasAdjustment ? raw.cr_adj : null,
    },
  };
}

function mapFrequency(node) {
  if (node.frequency !== undefined && node.frequency !== null) {
    return node.frequency;
  }

  const raw = isPlainObject(node.raw) ? node.raw : {};
  if (!hasOwn(raw, "frequency")) return null;

  return {
    roll: raw.frequency ?? 0,
    raw: raw.frequency ?? null,
  };
}

function mapRoundCostDown(node) {
  if (typeof node.roundCostDown === "boolean") return node.roundCostDown;
  const raw = isPlainObject(node.raw) ? node.raw : {};
  return hasOwn(raw, "round_down") ? raw.round_down : false;
}

function mapSpecialNode(node, context, specialKind) {
  return {
    id: node.id,
    externalIds: { ...node.externalIds },
    nodeKind: node.nodeKind,
    specialKind,
    name: node.name,
    points: node.points,
    levels: node.levels,
    modifiers: [...node.modifiers],
    features: [...node.features],
    weapons: [...node.weapons],
    prereqs: node.prereqs,
    tags: buildTraitTags(node),
    importMeta: {
      source: "gcs",
      role: node.role,
      specialKind,
      reference: node.reference ?? node.raw?.reference ?? null,
      calc: node.calc ?? node.raw?.calc ?? null,
      containerIds: [...context.containerIds],
    },
    raw: node.raw,
  };
}

function mapContainerNode(node, context) {
  return {
    id: node.id,
    externalIds: { ...node.externalIds },
    name: node.name,
    containerType: node.containerType,
    ancestry: node.raw?.ancestry ?? null,
    reference: node.reference ?? node.raw?.reference ?? null,
    points: node.points,
    calc: node.calc ?? node.raw?.calc ?? null,
    tags: buildTraitTags(node),

    importMeta: {
      source: "gcs",
      nodeKind: node.nodeKind,
      containerIds: [...context.containerIds],
    },

    raw: node.raw,
  };
}

function mapUnknownNode(node, context) {
  return {
    id: node.id,
    externalIds: { ...node.externalIds },
    name: node.name,
    nodeKind: node.nodeKind,
    containerType: node.containerType,
    role: node.role,
    reference: node.reference ?? node.raw?.reference ?? null,
    points: node.points,
    calc: node.calc ?? node.raw?.calc ?? null,
    tags: buildTraitTags(node),

    importMeta: {
      source: "gcs",
      containerIds: [...context.containerIds],
    },

    raw: node.raw,
  };
}

function buildTraitTags(node) {
  return [
    ...node.tags,
    "import:gcs",
    `node:${node.nodeKind}`,
    `role:${node.role}`,
  ];
}

function normalizeNotes(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");

  return String(value);
}

function normalizeForComparison(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function isNormalizedTraitTree(source) {
  return (
    Array.isArray(source) &&
    source.every(item => (
      item &&
      typeof item === "object" &&
      typeof item.nodeKind === "string" &&
      Array.isArray(item.children)
    ))
  );
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
