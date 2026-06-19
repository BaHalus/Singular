import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeGcsTraitTree,
  normalizeGcsTraitNode,
} from "./GcsTraitTreeNormalizer.js";

test("normalizes GCS rows source", () => {
  const tree = normalizeGcsTraitTree({
    rows: [
      {
        id: "adv-001",
        name: "Reflexos em Combate",
        base_points: 15,
        tags: ["Vantagem"],
      },
    ],
  });

  assert.equal(tree.length, 1);
  assert.equal(tree[0].id, "adv-001");
  assert.equal(tree[0].externalIds.gcs, "adv-001");
  assert.equal(tree[0].nodeKind, "trait");
  assert.equal(tree[0].role, "advantage");
  assert.equal(tree[0].points, 15);
});

test("normalizes perk using official Qualidade tag", () => {
  const node = normalizeGcsTraitNode({
    id: "perk-001",
    name: "Acessório",
    base_points: 1,
    tags: ["Qualidade"],
  });

  assert.equal(node.nodeKind, "trait");
  assert.equal(node.role, "perk");
});

test("normalizes quirk from tag", () => {
  const node = normalizeGcsTraitNode({
    id: "quirk-001",
    name: "Hábito Menor",
    base_points: -1,
    tags: ["Peculiaridade"],
  });

  assert.equal(node.nodeKind, "trait");
  assert.equal(node.role, "quirk");
});

test("normalizes disadvantage from negative points", () => {
  const node = normalizeGcsTraitNode({
    id: "disadv-001",
    name: "Mau Humor",
    base_points: -10,
  });

  assert.equal(node.nodeKind, "trait");
  assert.equal(node.role, "disadvantage");
});

test("normalizes explicit container with children", () => {
  const node = normalizeGcsTraitNode({
    id: "container-001",
    type: "trait_container",
    name: "Raça",
    children: [
      {
        id: "adv-001",
        name: "Visão Noturna",
        base_points: 1,
        tags: ["Vantagem"],
      },
    ],
  });

  assert.equal(node.nodeKind, "container");
  assert.equal(node.containerType, "race");
  assert.equal(node.children.length, 1);
  assert.equal(node.children[0].role, "advantage");
});

test("normalizes alternative abilities container", () => {
  const node = normalizeGcsTraitNode({
    id: "aa-001",
    type: "trait_container",
    name: "Habilidades Alternativas do Fogo",
    children: [],
  });

  assert.equal(node.nodeKind, "container");
  assert.equal(node.containerType, "alternativeAbilities");
});

test("preserves rich trait data", () => {
  const raw = {
    id: "adv-001",
    name: "Ataque Inato",
    base_points: 20,
    tags: ["Vantagem"],
    modifiers: [{ name: "Poder", cost: -10 }],
    features: [{ type: "skill_bonus", amount: 1 }],
    weapons: [{ type: "ranged_weapon" }],
    prereqs: { type: "trait_prereq" },
  };

  const node = normalizeGcsTraitNode(raw);

  assert.deepEqual(node.modifiers, raw.modifiers);
  assert.deepEqual(node.features, raw.features);
  assert.deepEqual(node.weapons, raw.weapons);
  assert.deepEqual(node.prereqs, raw.prereqs);
  assert.equal(node.raw, raw);
});

test("returns unknown node when classification is ambiguous", () => {
  const node = normalizeGcsTraitNode({
    id: "unknown-001",
    name: "Sem classificação",
  });

  assert.equal(node.nodeKind, "unknown");
  assert.equal(node.role, "unknown");
  assert.equal(node.containerType, null);
});

test("accepts array source", () => {
  const tree = normalizeGcsTraitTree([
    {
      id: "adv-001",
      name: "Reflexos em Combate",
      base_points: 15,
    },
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].role, "advantage");
});

test("rejects invalid source", () => {
  assert.throws(() => {
    normalizeGcsTraitTree("traits");
  });
});

test("rejects invalid node", () => {
  assert.throws(() => {
    normalizeGcsTraitNode([]);
  });
});

test("rejects invalid array fields", () => {
  assert.throws(() => {
    normalizeGcsTraitNode({
      id: "adv-001",
      name: "Reflexos em Combate",
      tags: "Vantagem",
    });
  });
});
