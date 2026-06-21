import test from "node:test";
import assert from "node:assert/strict";

import {
  createTraitModifiers,
  flattenEnabledTraitModifiers,
  serializeTraitModifiers,
} from "./TraitModifiers.js";

test("normalizes legacy and current GCS cost adjustments", () => {
  const modifiers = createTraitModifiers([
    { id: "lim", name: "Limitado", cost: -10 },
    { id: "enh", name: "Ampliado", cost_adj: "+25%" },
    { id: "flat", name: "Ajuste", cost_adj: "5", affects: "base_only" },
    { id: "mult", name: "Dobro", cost_adj: "x2" },
  ], { traitId: "trait-gcs", source: { kind: "imported" } });

  assert.equal(modifiers[0].costType, "percentage");
  assert.equal(modifiers[0].costValue, -10);
  assert.equal(modifiers[0].kind, "limitation");
  assert.equal(modifiers[1].costValue, 25);
  assert.equal(modifiers[2].costType, "points");
  assert.equal(modifiers[2].affects, "base-only");
  assert.equal(modifiers[3].costType, "multiplier");
  assert.equal(modifiers[3].costValue, 2);
});

test("preserves textual and unknown modifiers without inventing mechanics", () => {
  const modifiers = createTraitModifiers([
    { name: "Descrição livre", cost_adj: "especial" },
  ], { traitId: "trait-text" });

  assert.equal(modifiers[0].costType, "text");
  assert.equal(modifiers[0].costValue, null);
  assert.equal(modifiers[0].affectsCost, false);
  assert.equal(modifiers[0].raw.cost_adj, "especial");
});

test("creates stable anonymous ids and preserves round trip", () => {
  const input = [{ name: "Sem ID", cost_adj: "-20%" }];
  const first = createTraitModifiers(input, { traitId: "trait-stable" });
  const second = createTraitModifiers(structuredClone(input), {
    traitId: "trait-stable",
  });
  const restored = createTraitModifiers(serializeTraitModifiers(first), {
    traitId: "trait-stable",
  });

  assert.equal(first[0].id, second[0].id);
  assert.deepEqual(serializeTraitModifiers(restored), serializeTraitModifiers(first));
});

test("disabled containers disable descendants and levels are explicit", () => {
  const modifiers = createTraitModifiers([{
    id: "group",
    type: "trait_modifier_container",
    disabled: true,
    children: [{
      id: "leveled",
      cost_adj: "+10%",
      levels: 3,
    }],
  }], { traitId: "trait-container" });
  const flattened = flattenEnabledTraitModifiers(modifiers, 7);

  assert.equal(modifiers[0].container, true);
  assert.equal(flattened.length, 1);
  assert.equal(flattened[0].enabled, false);
  assert.equal(flattened[0].levelMultiplier, 3);
});

test("useLevelFromTrait uses the owning Trait level", () => {
  const modifiers = createTraitModifiers([{
    id: "trait-level",
    cost_adj: "+5%",
    use_level_from_trait: true,
  }], { traitId: "trait-owner-level" });
  const flattened = flattenEnabledTraitModifiers(modifiers, 4);

  assert.equal(flattened[0].levelMultiplier, 4);
});
