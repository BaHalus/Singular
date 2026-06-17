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

test("renames character without mutating original", () => {
  const character = new Character();

  const updated = renameCharacter(character, "Aldric");

  assert.equal(character.identity.name, "Unnamed");
  assert.equal(updated.identity.name, "Aldric");
});

test("adds skill without mutating original", () => {
  const character = new Character();
  const updated = addCharacterSkill(character, { name: "Espadas Curtas" });

  assert.equal(character.skills.length, 0);
  assert.equal(updated.skills.length, 1);
});

test("adds advantage without mutating original", () => {
  const character = new Character();
  const updated = addCharacterAdvantage(character, { name: "Reflexos em Combate" });

  assert.equal(character.advantages.length, 0);
  assert.equal(updated.advantages.length, 1);
});

test("adds disadvantage without mutating original", () => {
  const character = new Character();
  const updated = addCharacterDisadvantage(character, { name: "Código de Honra" });

  assert.equal(character.disadvantages.length, 0);
  assert.equal(updated.disadvantages.length, 1);
});

test("adds equipment without mutating original", () => {
  const character = new Character();
  const updated = addCharacterEquipment(character, { name: "Espada Curta" });

  assert.equal(character.equipment.length, 0);
  assert.equal(updated.equipment.length, 1);
});

test("adds condition without mutating original", () => {
  const character = new Character();
  const updated = addCharacterCondition(character, { name: "stunned" });

  assert.equal(character.state.conditions.length, 0);
  assert.equal(updated.state.conditions.length, 1);
});

test("removes condition without mutating original", () => {
  const character = new Character({
    state: {
      conditions: [{ name: "stunned" }],
      modifiers: [],
      combat: { engaged: false },
    },
  });

  const updated = removeCharacterCondition(character, "stunned");

  assert.equal(character.state.conditions.length, 1);
  assert.equal(updated.state.conditions.length, 0);
});
