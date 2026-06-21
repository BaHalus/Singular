import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import {
  evaluateTraitModifierCost,
  projectTraitCostModifiers,
} from "./TraitModifierCost.js";

test("disabled modifier containers suppress every descendant", () => {
  const trait = createTrait({
    id: "trait-disabled-modifier-container",
    role: "advantage",
    name: "Pacote desabilitado",
    pointValue: { basePoints: 10 },
    modifiers: [{
      id: "disabled-package",
      disabled: true,
      children: [
        { id: "child-percentage", cost_adj: "+100%" },
        {
          id: "nested-package",
          children: [
            { id: "nested-addition", cost_adj: "+5" },
          ],
        },
      ],
    }],
  });

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.deepEqual(projected.map(item => item.enabled), [false, false, false, false]);
  assert.equal(result.status, "ready");
  assert.equal(result.calculatedPoints, 10);
});

test("enabled containers retain each child's local disabled state", () => {
  const trait = createTrait({
    id: "trait-locally-disabled-child",
    role: "advantage",
    name: "Filho desabilitado",
    pointValue: { basePoints: 10 },
    modifiers: [{
      id: "enabled-package",
      children: [
        { id: "disabled-child", disabled: true, cost_adj: "+100%" },
        { id: "enabled-child", cost_adj: "+20%" },
      ],
    }],
  });

  const projected = projectTraitCostModifiers(trait);
  const result = evaluateTraitModifierCost(trait);

  assert.deepEqual(projected.map(item => item.enabled), [true, false, true]);
  assert.equal(result.calculatedPoints, 12);
});
