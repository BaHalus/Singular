import test from "node:test";
import assert from "node:assert/strict";

import { Character } from "./Character.js";
import {
  renameCharacter,
  addCharacterSkill,
  addCharacterAdvantage,
  addCharacterDisadvantage,
  addCharacterEquipment,
  addCharacterCondition,
  removeCharacterCondition,
} from "./CharacterOperations.js";

test("renames character", () => {
  const character = new Character();

  renameCharacter(character, "Aldric");

  assert.equal(character.identity.name, "Aldric");
});

test("adds skill", () => {
  const character = new Character();
  const skill = { name: "Espadas Curtas" };

  addCharacterSkill(character, skill);

  assert.equal(character.skills.length, 1);
  assert.equal(character.skills[0].name, "Espadas Curtas");
});

test("adds advantage", () => {
  const character = new Character();

  addCharacterAdvantage(character, { name: "Reflexos em Combate" });

  assert.equal(character.advantages.length, 1);
});

test("adds disadvantage", () => {
  const character = new Character();

  addCharacterDisadvantage(character, { name: "Código de Honra" });

  assert.equal(character.disadvantages.length, 1);
});

test("adds equipment", () => {
  const character = new Character();

  addCharacterEquipment(character, { name: "Espada Curta" });

  assert.equal(character.equipment.length, 1);
});

test("adds condition", () => {
  const character = new Character();

  addCharacterCondition(character, { name: "stunned" });

  assert.equal(character.state.conditions.length, 1);
});

test("removes condition", () => {
  const character = new Character();

  addCharacterCondition(character, { name: "stunned" });
  removeCharacterCondition(character, "stunned");

  assert.equal(character.state.conditions.length, 0);
});
