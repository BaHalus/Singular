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
    notes: "",
    tags: buildTraitTags(node),

    points: node.points,
    levels: node.levels,

    modifiers: [...node.modifiers],
    features: [...node.features],
    weapons: [...node.weapons],
    prereqs: node.prereqs,

    importMeta: {
      source: "gcs",
      role: node.role,
      containerIds: [...context.containerIds],
    },

    raw: node.raw,
  };
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
    points: node.points,
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
    points: node.points,
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
