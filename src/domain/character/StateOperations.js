/**
 * State Operations
 * ----------------
 * Operações puras sobre State.
 *
 * Nenhuma função altera o objeto recebido.
 */

export function addCondition(state, condition) {
  return {
    ...state,
    conditions: [
      ...state.conditions,
      condition,
    ],
  };
}

export function removeCondition(state, conditionName) {
  return {
    ...state,
    conditions: state.conditions.filter(
      c => c.name !== conditionName
    ),
  };
}

export function addEffect(state, effect) {
  return {
    ...state,
    effects: [
      ...state.effects,
      effect,
    ],
  };
}

export function removeEffect(state, effectId) {
  return {
    ...state,
    effects: state.effects.filter(
      e => e.id !== effectId
    ),
  };
}

export function setCombatEngaged(state, engaged) {
  if (typeof engaged !== "boolean") {
    throw new Error(
      "Combat engaged must be boolean"
    );
  }

  return {
    ...state,
    combat: {
      ...state.combat,
      engaged,
    },
  };
}
