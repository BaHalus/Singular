const ATTACK_CATEGORIES = Object.freeze(["melee", "ranged"]);
const ATTACK_SOURCE_KINDS = Object.freeze([
  "manual",
  "equipment",
  "trait",
  "spell",
  "power",
  "other",
]);
const ATTACK_AUTHORITY = "declared";
const ATTACK_KEYS = Object.freeze([
  "id",
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
const ATTACK_SOURCE_KEYS = Object.freeze(["kind", "id"]);
const ATTACK_DAMAGE_KEYS = Object.freeze(["value", "type", "authority"]);

/**
 * Cria a coleção canônica e ordenada de ataques declarados.
 *
 * Nenhum campo mecânico é calculado aqui. Dano, tipo, reach e alcance são
 * declarações portáteis até que um motor futuro possua autoridade explícita.
 */
export function createAttacks(input = []) {
  validateDenseArray(input, "Attacks input must be a dense array");
  const attacks = input.map(createAttack);
  validateAttacks(attacks);
  return deepFreeze(attacks);
}

export function createAttack(input = {}) {
  requirePlainObject(input, "Attack input must be an object");

  const attack = {
    id: normalizeRequiredString(
      input.id ?? generateAttackId(),
      "Attack id must be a non-empty string",
    ),
    externalIds: normalizePortableObject(
      input.externalIds,
      "Attack externalIds must be an object",
    ),
    name: normalizeString(input.name ?? "", "Attack name must be a string"),
    category: input.category ?? "melee",
    skillId: normalizeNullableId(input.skillId, "Attack skillId"),
    source: createAttackSource(input.source),
    damage: createDeclaredDamage(input.damage),
    reach: normalizeNullableString(input.reach, "Attack reach"),
    range: normalizeNullableString(input.range, "Attack range"),
    notes: normalizeString(input.notes ?? "", "Attack notes must be a string"),
    importMeta: normalizePortableNullableObject(
      input.importMeta,
      "Attack importMeta must be an object or null",
    ),
    raw: normalizePortableNullableValue(input.raw, "Attack raw"),
  };

  validateAttack(attack);
  return deepFreeze(attack);
}

export function validateAttacks(attacks) {
  validateDenseArray(attacks, "Attacks must be a dense array");
  const ids = new Set();

  attacks.forEach((attack, index) => {
    validateAttack(attack, `Attacks[${index}]`);
    if (ids.has(attack.id)) {
      throw new Error("Attack ids must be unique");
    }
    ids.add(attack.id);
  });

  assertPortableValue(attacks, "Attacks");
  return true;
}

export function validateAttack(attack, label = "Attack") {
  requirePlainObject(attack, `${label} must be an object`);
  assertExactKeys(attack, ATTACK_KEYS, `${label} has unsupported fields`);

  normalizeRequiredString(attack.id, `${label} id must be a non-empty string`);
  if (!isPlainObject(attack.externalIds)) {
    throw new Error(`${label} externalIds must be an object`);
  }
  assertPortableValue(attack.externalIds, `${label} externalIds`);

  normalizeString(attack.name, `${label} name must be a string`);
  if (!ATTACK_CATEGORIES.includes(attack.category)) {
    throw new Error(`${label} category is invalid`);
  }
  normalizeNullableId(attack.skillId, `${label} skillId`);
  validateAttackSource(attack.source, `${label} source`);
  validateDeclaredDamage(attack.damage, `${label} damage`);
  normalizeNullableString(attack.reach, `${label} reach`);
  normalizeNullableString(attack.range, `${label} range`);
  normalizeString(attack.notes, `${label} notes must be a string`);

  if (attack.importMeta !== null) {
    if (!isPlainObject(attack.importMeta)) {
      throw new Error(`${label} importMeta must be an object or null`);
    }
    assertPortableValue(attack.importMeta, `${label} importMeta`);
  }
  if (attack.raw !== null) {
    assertPortableValue(attack.raw, `${label} raw`);
  }

  assertPortableValue(attack, label);
  return true;
}

export function serializeAttacks(attacks) {
  validateAttacks(attacks);
  return attacks.map(attack => ({
    id: attack.id,
    externalIds: clonePortableValue(attack.externalIds, "Attack externalIds"),
    name: attack.name,
    category: attack.category,
    skillId: attack.skillId,
    source: {
      kind: attack.source.kind,
      id: attack.source.id,
    },
    damage: {
      value: attack.damage.value,
      type: attack.damage.type,
      authority: attack.damage.authority,
    },
    reach: attack.reach,
    range: attack.range,
    notes: attack.notes,
    importMeta: clonePortableValue(attack.importMeta, "Attack importMeta"),
    raw: clonePortableValue(attack.raw, "Attack raw"),
  }));
}

export function getAttackCategories() {
  return [...ATTACK_CATEGORIES];
}

export function getAttackSourceKinds() {
  return [...ATTACK_SOURCE_KINDS];
}

export function getAttackAuthority() {
  return ATTACK_AUTHORITY;
}

function createAttackSource(input) {
  if (input === undefined || input === null) {
    return { kind: "manual", id: null };
  }
  requirePlainObject(input, "Attack source must be an object");
  const source = {
    kind: input.kind ?? "manual",
    id: normalizeNullableId(input.id, "Attack source id"),
  };
  validateAttackSource(source);
  return source;
}

function validateAttackSource(source, label = "Attack source") {
  requirePlainObject(source, `${label} must be an object`);
  assertExactKeys(source, ATTACK_SOURCE_KEYS, `${label} has unsupported fields`);
  if (!ATTACK_SOURCE_KINDS.includes(source.kind)) {
    throw new Error(`${label} kind is invalid`);
  }
  normalizeNullableId(source.id, `${label} id`);
}

function createDeclaredDamage(input) {
  if (input === undefined || input === null) {
    return { value: "", type: "", authority: ATTACK_AUTHORITY };
  }
  requirePlainObject(input, "Attack damage must be an object");
  const damage = {
    value: normalizeString(
      input.value ?? "",
      "Attack damage value must be a string",
    ),
    type: normalizeString(
      input.type ?? "",
      "Attack damage type must be a string",
    ),
    authority: input.authority ?? ATTACK_AUTHORITY,
  };
  validateDeclaredDamage(damage);
  return damage;
}

function validateDeclaredDamage(damage, label = "Attack damage") {
  requirePlainObject(damage, `${label} must be an object`);
  assertExactKeys(damage, ATTACK_DAMAGE_KEYS, `${label} has unsupported fields`);
  normalizeString(damage.value, `${label} value must be a string`);
  normalizeString(damage.type, `${label} type must be a string`);
  if (damage.authority !== ATTACK_AUTHORITY) {
    throw new Error(`${label} authority must be declared`);
  }
}

function normalizePortableObject(value, errorMessage) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) throw new Error(errorMessage);
  assertPortableValue(value, "Attack portable object");
  return clonePortableValue(value, "Attack portable object");
}

function normalizePortableNullableObject(value, errorMessage) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) throw new Error(errorMessage);
  assertPortableValue(value, "Attack portable object");
  return clonePortableValue(value, "Attack portable object");
}

function normalizePortableNullableValue(value, label) {
  if (value === undefined || value === null) return null;
  assertPortableValue(value, label);
  return clonePortableValue(value, label);
}

function normalizeRequiredString(value, errorMessage) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(errorMessage);
  }
  return value;
}

function normalizeString(value, errorMessage) {
  if (typeof value !== "string") throw new Error(errorMessage);
  return value;
}

function normalizeNullableString(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
  }
  return value;
}

function normalizeNullableId(value, label) {
  if (value === undefined || value === null || value === "") return null;
  return normalizeRequiredString(value, `${label} must be a non-empty string or null`);
}

function validateDenseArray(value, errorMessage) {
  if (!Array.isArray(value)) throw new Error(errorMessage);
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) throw new Error(errorMessage);
  }
}

function requirePlainObject(value, errorMessage) {
  if (!isPlainObject(value)) throw new Error(errorMessage);
}

function assertExactKeys(value, expectedKeys, errorMessage) {
  const expected = new Set(expectedKeys);
  if (Object.keys(value).some(key => !expected.has(key))) {
    throw new Error(errorMessage);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPortableValue(value, label, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} must be JSON portable`);
    return;
  }
  if (typeof value !== "object") {
    throw new Error(`${label} must be JSON portable`);
  }
  if (ancestors.has(value)) throw new Error(`${label} must not contain cycles`);
  ancestors.add(value);

  if (Array.isArray(value)) {
    validateDenseArray(value, `${label} arrays must be dense`);
    value.forEach((item, index) =>
      assertPortableValue(item, `${label}[${index}]`, ancestors));
  } else {
    if (!isPlainObject(value)) throw new Error(`${label} must be JSON portable`);
    Object.entries(value).forEach(([key, item]) =>
      assertPortableValue(item, `${label}.${key}`, ancestors));
  }

  ancestors.delete(value);
}

function clonePortableValue(value, label, ancestors = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    assertPortableValue(value, label);
    return value;
  }
  if (ancestors.has(value)) throw new Error(`${label} must not contain cycles`);

  const clone = Array.isArray(value) ? [] : {};
  ancestors.set(value, clone);
  if (Array.isArray(value)) {
    validateDenseArray(value, `${label} arrays must be dense`);
    value.forEach((item, index) => {
      clone.push(clonePortableValue(item, `${label}[${index}]`, ancestors));
    });
  } else {
    if (!isPlainObject(value)) throw new Error(`${label} must be JSON portable`);
    Object.entries(value).forEach(([key, item]) => {
      clone[key] = clonePortableValue(item, `${label}.${key}`, ancestors);
    });
  }
  ancestors.delete(value);
  return clone;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function generateAttackId() {
  return `attack_${Math.random().toString(36).slice(2, 10)}`;
}
