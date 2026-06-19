import test from "node:test";
import assert from "node:assert/strict";

import { normalizeGcsTraitNode } from "./GcsTraitTreeNormalizer.js";

test("uses calculated GCT points before base points", () => {
  const node = normalizeGcsTraitNode({
    type: "advantage",
    id: "adv-001",
    name: "Insubstancialidade",
    base_points: 80,
    modifiers: [
      {
        type: "modifier",
        name: "Permanentemente Ativo",
        cost_type: "percentage",
        cost: -50,
      },
    ],
    calc: { points: 40 },
    categories: ["Vantagem"],
  });

  assert.equal(node.points, 40);
  assert.equal(node.role, "advantage");
  assert.deepEqual(node.calc, { points: 40 });
});

test("merges GCT categories into normalized tags", () => {
  const node = normalizeGcsTraitNode({
    type: "advantage",
    id: "adv-001",
    name: "Mente Digital",
    base_points: 5,
    tags: ["Mental"],
    categories: ["Advantage", "Mental"],
    calc: { points: 5 },
  });

  assert.deepEqual(node.tags, ["Mental", "Advantage"]);
  assert.equal(node.role, "advantage");
});

test("classifies zero-point GCT traits by category", () => {
  const node = normalizeGcsTraitNode({
    type: "advantage",
    id: "disadv-001",
    name: "Sem Pernas (Aquático)",
    calc: { points: 0 },
    categories: ["Desvantagem"],
  });

  assert.equal(node.nodeKind, "trait");
  assert.equal(node.role, "disadvantage");
  assert.equal(node.points, 0);
});

test("preserves GCT notes and reference", () => {
  const node = normalizeGcsTraitNode({
    type: "advantage",
    id: "adv-001",
    name: "Forma Alternativa",
    base_points: 15,
    reference: "B71",
    notes: "Morcego",
    calc: { points: 15 },
    categories: ["Vantagem"],
  });

  assert.equal(node.reference, "B71");
  assert.equal(node.notes, "Morcego");
});
