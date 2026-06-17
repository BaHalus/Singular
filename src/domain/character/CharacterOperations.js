/**
 * Character Operations
 * --------------------
 * Operações de alteração do Character.
 *
 * Nesta fase ainda utilizam mutação direta para preservar
 * compatibilidade com Character v0.1.
 *
 * A migração para funções puras ocorrerá posteriormente.
 */

export function renameCharacter(character, name) {
  character.identity.name = String(name);

  return character;
}

export function addCharacterSkill(character, skill) {
  character.skills.push(skill);

  return character;
}

export function addCharacterAdvantage(character, advantage) {
  character.advantages.push(advantage);

  return character;
}

export function addCharacterDisadvantage(character, disadvantage) {
  character.disadvantages.push(disadvantage);

  return character;
}

export function addCharacterEquipment(character, item) {
  character.equipment.push(item);

  return character;
}

export function addCharacterCondition(character, condition) {
  character.state.conditions.push(condition);

  return character;
}

export function removeCharacterCondition(
  character,
  conditionName
) {
  character.state.conditions =
    character.state.conditions.filter(
      c => c.name !== conditionName
    );

  return character;
}
