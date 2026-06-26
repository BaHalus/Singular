import {
  createAttack,
  createAttacks,
  validateAttacks,
} from "./Attacks.js";

const ATTACK_PATCH_KEYS = Object.freeze([
  "externalIds",
  "name",
  "category",
  "skillId",
  "source",
  "damage",
  "reach",
  "range",
  "notes",
  "importMeta",
  "raw",
]);

export function addAttack(attacks, attackInput) {
  validateAttacks(attacks);
  return createAttacks([...attacks, attackInput]);
}

export function updateAttack(attacks, attackId, patch = {}) {
  validateAttacks(attacks);
  const normalizedId = requireAttackId(attackId);
  requirePlainObject(patch, "Attack patch must be an object");
  assertPatchKeys(patch);

  const currentIndex = attacks.findIndex(attack => attack.id === normalizedId);
  if (currentIndex < 0) throw new Error("Attack not found");

  const current = attacks[currentIndex];
  const nextInput = {
    ...current,
    ...patch,
    id: current.id,
    source: patch.source === undefined
      ? current.source
      : { ...current.source, ...patch.source },
    damage: patch.damage === undefined
      ? current.damage
      : { ...current.damage, ...patch.damage },
  };
  const nextAttack = createAttack(nextInput);
  const next = [...attacks];
  next[currentIndex] = nextAttack;
  return createAttacks(next);
}

export function removeAttack(attacks, attackId) {
  validateAttacks(attacks);
  const normalizedId = requireAttackId(attackId);
  const currentIndex = attacks.findIndex(attack => attack.id === normalizedId);
  if (currentIndex < 0) throw new Error("Attack not found");
  return createAttacks(attacks.filter(attack => attack.id !== normalizedId));
}

export function reorderAttack(attacks, attackId, targetIndex) {
  validateAttacks(attacks);
  const normalizedId = requireAttackId(attackId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= attacks.length) {
    throw new Error("Attack target index is invalid");
  }

  const currentIndex = attacks.findIndex(attack => attack.id === normalizedId);
  if (currentIndex < 0) throw new Error("Attack not found");
  if (currentIndex === targetIndex) return attacks;

  const next = [...attacks];
  const [attack] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, attack);
  return createAttacks(next);
}

export function findAttackById(attacks, attackId) {
  validateAttacks(attacks);
  const normalizedId = requireAttackId(attackId);
  return attacks.find(attack => attack.id === normalizedId) ?? null;
}

function requireAttackId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Attack id must be a non-empty string");
  }
  return value;
}

function requirePlainObject(value, errorMessage) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(errorMessage);
  }
}

function assertPatchKeys(patch) {
  const allowed = new Set(ATTACK_PATCH_KEYS);
  if (Object.keys(patch).some(key => !allowed.has(key))) {
    throw new Error("Attack patch has unsupported fields");
  }
  if (patch.source !== undefined) {
    requirePlainObject(patch.source, "Attack source patch must be an object");
  }
  if (patch.damage !== undefined) {
    requirePlainObject(patch.damage, "Attack damage patch must be an object");
  }
}
