export function cloneSkillMechanicsPortableValue(value, label) {
  assertSkillMechanicsPortableValue(value, label, new WeakSet());
  return JSON.parse(JSON.stringify(value));
}

export function assertSkillMechanicsPortableValue(
  value,
  label,
  ancestors = new WeakSet(),
) {
  if (value === null) return true;

  const type = typeof value;
  if (type === "string" || type === "boolean") return true;
  if (type === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be JSON portable`);
    }
    return true;
  }
  if (type !== "object") {
    throw new Error(`${label} must be JSON portable`);
  }

  if (ancestors.has(value)) {
    throw new Error(`${label} must be JSON portable`);
  }
  ancestors.add(value);

  if (Array.isArray(value)) {
    validateSkillMechanicsDenseArray(value, label);
    value.forEach((item, index) =>
      assertSkillMechanicsPortableValue(
        item,
        `${label}[${index}]`,
        ancestors,
      ),
    );
    ancestors.delete(value);
    return true;
  }

  if (!isSkillMechanicsPlainObject(value)) {
    throw new Error(`${label} must be JSON portable`);
  }
  for (const [key, item] of Object.entries(value)) {
    assertSkillMechanicsPortableValue(item, `${label}.${key}`, ancestors);
  }
  ancestors.delete(value);
  return true;
}

export function validateSkillMechanicsDenseArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new Error(`${label} must not contain sparse entries`);
    }
  }

  const expectedKeys = new Set(
    Array.from({ length: value.length }, (_, index) => String(index)),
  );
  for (const key of Object.keys(value)) {
    if (!expectedKeys.has(key)) {
      throw new Error(`${label} must not contain non-index properties`);
    }
  }

  return true;
}

export function requireSkillMechanicsPlainObject(value, label) {
  if (!isSkillMechanicsPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  return true;
}

export function isSkillMechanicsPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function deepFreezeSkillMechanicsValue(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item =>
    deepFreezeSkillMechanicsValue(item, seen),
  );
  return Object.freeze(value);
}
