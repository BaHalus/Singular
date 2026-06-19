/**
 * State Aggregate
 * ---------------
 * Armazena estado temporário do personagem.
 *
 * Não aplica regras.
 * Não calcula modificadores.
 * Não interpreta condições.
 * Não interpreta efeitos.
 * Não interpreta ferimentos.
 */

export function createState(input = {}) {
  const state = {
    injuries: input.injuries ?? [],
    conditions: input.conditions ?? [],
    effects: input.effects ?? [],
    combat: {
      engaged: input.combat?.engaged ?? false,
    },
  };

  validateState(state);

  return state;
}

export function validateState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("State must be an object");
  }

  if (!Array.isArray(state.injuries)) {
    throw new Error("State injuries must be an array");
  }

  if (!Array.isArray(state.conditions)) {
    throw new Error("State conditions must be an array");
  }

  if (!Array.isArray(state.effects)) {
    throw new Error("State effects must be an array");
  }

  if (!state.combat || typeof state.combat !== "object") {
    throw new Error("State combat must be an object");
  }

  if (typeof state.combat.engaged !== "boolean") {
    throw new Error("State combat.engaged must be boolean");
  }

  return true;
}

export function serializeState(state) {
  validateState(state);

  return {
    injuries: [...state.injuries],
    conditions: [...state.conditions],
    effects: [...state.effects],
    combat: {
      ...state.combat,
    },
  };
}
