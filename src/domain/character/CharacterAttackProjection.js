import { createAttacks } from "./Attacks.js";
import { constructTraitAttacks } from "./TraitAttackEffects.js";

/**
 * Projeção de leitura da tabela de Ataques.
 *
 * `character.attacks` continua sendo a coleção declarada/manual canônica.
 * Ataques materializados por efeitos de Traços são acrescentados somente na
 * projeção. Isso evita transformar a projeção em fonte de verdade e permite
 * que a remoção do Traço faça o ataque derivado desaparecer na próxima
 * projeção, sem apagar ataques manuais.
 */
export function projectCharacterAttacks(character) {
  if (!character || typeof character !== "object") {
    throw new Error("Character must be an object");
  }

  const declared = createAttacks(character.attacks ?? []);
  const constructed = constructTraitAttacks(character.traits ?? []);

  const ids = new Set(declared.map(attack => attack.id));
  for (const attack of constructed) {
    if (ids.has(attack.id)) {
      throw new Error(`Attack projection id collision: ${attack.id}`);
    }
  }

  return Object.freeze([...declared, ...constructed]);
}
