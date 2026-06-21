import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  evaluateTraitModifierCost,
  projectTraitCostModifiers,
} from "./TraitModifierCost.js";

function traitWithModifiers(modifiers) {
  return createTrait({
    id: "trait-disabled-modifier-containers",
    role: "advantage",
    name: "Trait com contêineres de modificadores",
    pointValue: { basePoints: 10 },
    modifiers,
  });
}

test("disabled modifier containers suppress every descendant", () => {
  const trait = traitWithModifiers([
    {
      id: "disabled-container",
      disabled: true,
      children: [
        {
          id: "nested-container",
          children: [
            { id: "percentage-child", cost_adj: "+100%" },
            "+5",
          ],
        },
      ],
    },
  ]);

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.deepEqual(
    projected.map(modifier => modifier.enabled),
    [false, false, false, false],
  );
  assert.equal(result.status, "ready");
  assert.equal(result.calculatedPoints, 10);
});

test("enabled containers preserve each descendant own disabled state", () => {
  const trait = traitWithModifiers([
    {
      id: "enabled-container",
      children: [
        { id: "disabled-child", cost_adj: "+100%", enabled: false },
        { id: "enabled-child", cost_adj: "+50%" },
      ],
    },
  ]);

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.deepEqual(
    projected.map(modifier => modifier.enabled),
    [true, false, true],
  );
  assert.equal(result.status, "ready");
  assert.equal(result.calculatedPoints, 15);
});
