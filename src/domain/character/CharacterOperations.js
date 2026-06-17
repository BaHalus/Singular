/**
 * Character Operations
 * --------------------
 * Operações puras de alteração do Character.
 *
 * Conforme ADR-0001, nenhuma operação deve modificar
 * diretamente o Character recebido.
 *
 * Cada função recebe um Character e retorna um novo Character.
 */

export function renameCharacter(character, name) {
  return {
    ...character,
    identity: {
      ...character.identity,
      name: String(name),
    },
  };
}

export function addCharacterSkill(character, skill) {
  return {
    ...character,
    skills: [
      ...character.skills,
      skill,
    ],
  };
}

export function addCharacterAdvantage(character, advantage) {
  return {
    ...character,
    advantages: [
      ...character.advantages,
      advantage,
    ],
  };
}

export function addCharacterDisadvantage(character, disadvantage) {
  return {
    ...character,
    disadvantages: [
      ...character.disadvantages,
      disadvantage,
    ],
  };
}

export function addCharacterEquipment(character, item) {
  return {
    ...character,
    equipment: [
      ...character.equipment,
      item,
    ],
  };
}

export function addCharacterCondition(character, condition) {
  return {
    ...character,
    state: {
      ...character.state,
      conditions: [
        ...character.state.conditions,
        condition,
      ],
    },
  };
}

export function removeCharacterCondition(
  character,
  conditionName
) {
  return {
    ...character,
    state: {
      ...character.state,
      conditions:
        character.state.conditions.filter(
          condition => condition.name !== conditionName
        ),
    },
  };
}
