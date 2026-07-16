import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { analyzeTraitCostAuthority } from "./TraitCostAuthorityAnalysis.js";
import {
  projectPowerTraitModifierIntegration,
} from "./PowerTraitModifierIntegration.js";

function trait(id, points, options = {}) {
  return {
    id,
    role: "advantage",
    name: id,
    alternateGroupId: options.groupId ?? null,
    modifiers: options.modifiers ?? [],
    pointValue: {
      mode: "total",
      basePoints: points,
    },
  };
}

function power(id, memberTraitIds, valuePercent) {
  return {
    id,
    name: id,
    memberTraitIds,
    powerModifier: {
      name: "Global",
      valuePercent,
      notes: "Applied by the Power",
    },
  };
}

test("combines one global Power modifier with individual Trait modifiers once", () => {
  const character = createCharacter({
    identity: { id: "power-cost", name: "Power cost" },
    traits: [trait("member", 100, {
      modifiers: [{
        id: "individual-enhancement",
        name: "Individual",
        kind: "enhancement",
        valueType: "percentage",
        value: 20,
      }],
    })],
    powers: [power("psi", ["member"], -10)],
  });

  const analysis = analyzeTraitCostAuthority(character);
  const contribution = analysis.groups.contributions[0];
  const projectedModifiers = contribution.finalCost.modifierCost.modifiers;

  assert.equal(analysis.status, "ready");
  assert.equal(contribution.individualPoints, 110);
  assert.equal(contribution.contributionPoints, 110);
  assert.equal(projectedModifiers.length, 2);
  assert.deepEqual(
    projectedModifiers.map(item => item.value),
    [20, -10],
  );
  assert.deepEqual(projectedModifiers[1].raw.source, {
    type: "power-global-modifier",
    powerId: "psi",
    powerName: "psi",
    valuePercent: -10,
  });
  assert.equal(character.traits[0].modifiers.length, 1);
});

test("applies the Power modifier before the Alternative Ability factor", () => {
  const character = createCharacter({
    identity: { id: "power-alternatives", name: "Power alternatives" },
    traits: [
      trait("primary", 50, { groupId: "abilities" }),
      trait("alternative", 20, { groupId: "abilities" }),
    ],
    traitAlternativeGroups: [{
      id: "abilities",
      alternativeFactor: 0.2,
      roundCostDown: false,
    }],
    powers: [power("magic", ["primary", "alternative"], -10)],
  });

  const analysis = analyzeTraitCostAuthority(character);
  const primary = analysis.groups.contributions.find(item => (
    item.traitId === "primary"
  ));
  const alternative = analysis.groups.contributions.find(item => (
    item.traitId === "alternative"
  ));

  assert.equal(analysis.status, "ready");
  assert.equal(primary.individualPoints, 45);
  assert.equal(primary.contributionPoints, 45);
  assert.equal(alternative.individualPoints, 18);
  assert.equal(alternative.contributionPoints, 4);
  assert.equal(analysis.groups.totalPoints, 49);
});

test("reports overlapping global Power modifiers instead of double-applying", () => {
  const character = createCharacter({
    identity: { id: "power-conflict", name: "Power conflict" },
    traits: [trait("shared", 100)],
    powers: [
      power("first", ["shared"], -10),
      power("second", ["shared"], -20),
    ],
  });

  const integration = projectPowerTraitModifierIntegration(character);
  const analysis = analyzeTraitCostAuthority(character);

  assert.equal(integration.status, "conflict");
  assert.deepEqual(integration.externalModifiersByTraitId, {});
  assert.equal(analysis.status, "conflict");
  assert.equal(
    analysis.diagnostics[0].code,
    "trait-multiple-global-power-modifiers",
  );
  assert.equal(analysis.groups.contributions[0].individualPoints, 100);
});
