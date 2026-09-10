import test from "node:test";
import assert from "node:assert/strict";

import { createAttributes } from "../../domain/character/Attributes.js";
import { createSecondaryCharacteristics } from "../../domain/character/SecondaryCharacteristics.js";
import { resolveCharacterDerivedEffects } from "./CharacterDerivedEffectsResolver.js";

const secondary = () => createSecondaryCharacteristics({
  HP: 10, FP: 10, Will: 10, Per: 10, BasicSpeed: 5, BasicMove: 5,
});

const trait = (id, attribute, amount) => ({
  id, name: `+${attribute}`, role: "advantage", points: 1, levels: null, notes: "",
  tags: [], selfControl: null, frequency: null, roundCostDown: false, choices: [],
  modifiers: [], features: [{ type: "attribute_bonus", amount, attribute }],
  weapons: [], prereqs: null, importMeta: null, raw: null, power: null,
  alternateGroupId: null, isPrimaryAlternative: false,
});

test("trait attribute bonus changes final attribute and HP", () => {
  const report = resolveCharacterDerivedEffects({
    attributes: createAttributes({ ST: 10, DX: 10, IQ: 10, HT: 10 }),
    traits: [trait("trait-1", "ST", 2)],
    secondaryCharacteristics: secondary(), skills: [],
  });
  assert.equal(report.attributes.results.ST.level, 12);
  assert.equal(report.attributes.results.ST.bonus, 2);
  assert.equal(report.secondaryCharacteristics.results.HP.final, 12);
  assert.equal(report.secondaryCharacteristics.results.HP.bonus, 2);
});

test("IQ and DX/HT bonuses propagate to secondary characteristics", () => {
  const report = resolveCharacterDerivedEffects({
    attributes: createAttributes(),
    traits: [trait("iq", "IQ", 2), trait("dx", "DX", 2), trait("ht", "HT", 2)],
    secondaryCharacteristics: secondary(), skills: [],
  });
  assert.equal(report.secondaryCharacteristics.results.Will.final, 12);
  assert.equal(report.secondaryCharacteristics.results.Per.final, 12);
  assert.equal(report.secondaryCharacteristics.results.BasicSpeed.final, 6);
  assert.equal(report.secondaryCharacteristics.results.BasicMove.final, 6);
});

test("melee, shield and cloak skills contribute Parry and Block", () => {
  const skill = (id, name, level, weapons = [], tags = []) => ({
    id, name, specialization: "", techLevel: null, attribute: "DX", difficulty: "A",
    points: 4, importedLevel: level, importedRelativeLevel: null, defaults: [],
    features: [], weapons, prereqs: null, notes: "", tags, importMeta: null, raw: null,
  });
  const report = resolveCharacterDerivedEffects({
    attributes: createAttributes(), traits: [], secondaryCharacteristics: secondary(),
    skills: [
      skill("sword", "Espada", 14, [{ category: "melee" }]),
      skill("shield", "Escudo", 16),
      skill("cloak", "Capa", 12),
    ],
  });
  assert.equal(report.defenses.parry.value, 10);
  assert.equal(report.defenses.block.value, 11);
});
