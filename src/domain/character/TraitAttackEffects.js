import { createAttack } from "./Attacks.js";
import { validateTraits } from "./Traits.js";

/**
 * Materializa ataques declarados por efeitos de Traços.
 *
 * A função é uma projeção determinística: não altera o array canônico de
 * ataques manuais. Cada arma declarada pelo Traço recebe um id derivado do
 * id da instância do Traço e do índice da declaração, e sua origem é marcada
 * como `trait` no modelo canônico de Attack.
 *
 * O motor não interpreta regras de combate aqui. A declaração de arma deve
 * fornecer apenas os campos portáteis já aceitos por createAttack.
 */
export function constructTraitAttacks(traits = []) {
  validateTraits(traits);

  const attacks = [];
  const ids = new Set();

  for (const trait of traits) {
    if (!Array.isArray(trait.weapons)) continue;

    trait.weapons.forEach((weapon, index) => {
      if (!isPlainObject(weapon)) {
        throw new Error(`Trait ${trait.id} weapon ${index} must be an object`);
      }

      const attackInput = createTraitAttackInput(trait, weapon, index);
      const attack = createAttack(attackInput);

      if (ids.has(attack.id)) {
        throw new Error(`Constructed attack id must be unique: ${attack.id}`);
      }
      ids.add(attack.id);
      attacks.push(attack);
    });
  }

  return Object.freeze(attacks);
}

function createTraitAttackInput(trait, weapon, index) {
  const id = `trait-attack:${trait.id}:${index}`;

  return {
    id,
    externalIds: clonePortable(weapon.externalIds ?? {}),
    name: requireString(
      weapon.name,
      `Trait ${trait.id} weapon ${index} name must be a non-empty string`,
    ),
    category: weapon.category ?? "melee",
    skillId: weapon.skillId ?? null,
    source: {
      kind: "trait",
      id: trait.id,
    },
    damage: weapon.damage ?? null,
    reach: weapon.reach ?? null,
    range: weapon.range ?? null,
    notes: weapon.notes ?? "",
    importMeta: weapon.importMeta ?? null,
    raw: clonePortable(weapon),
  };
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(label);
  }
  return value;
}

function clonePortable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(clonePortable);
  if (!isPlainObject(value)) {
    throw new Error("Trait attack declaration must be JSON portable");
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, clonePortable(item)]),
  );
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
}
